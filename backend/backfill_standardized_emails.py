import os
import sys
import argparse
from datetime import datetime

# Add parent directory to path so we can import app and models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Account, Student
from students.models import Parent, CredentialAudit
from auth.provisioning_service import ProvisioningService
from auth.password_service import PasswordService

def backfill(dry_run=True):
    print("======================================================================")
    print(f"SafeBus AI Standardized Email Backfill (DRY_RUN={dry_run})")
    print("======================================================================")

    # 1. Backfill Admin Accounts
    print("\nProcessing Admin Accounts...")
    admins = db.session.query(Account).filter(Account.role == 'admin').all()
    for admin in admins:
        if admin.fullName == 'System Administrator' or admin.username == 'admin@happyjourney.ai':
            admin.fullName = 'admin'
        
        old_email = admin.username
        # Generate new email
        new_email = ProvisioningService.generate_admin_email(admin.fullName)
        # Suffix handling
        if new_email != old_email:
            # Check unique suffix
            new_email = ProvisioningService.generate_unique_username(admin.fullName, "", role='admin')
        
        temp_pass = PasswordService.generate_temp_password(admin.fullName, "ADMIN123")
        
        print(f"Admin: {admin.fullName}\n  Old: {old_email}\n  New: {new_email}\n  Temp Pass: {temp_pass}")
        
        if not dry_run:
            admin.username = new_email
            admin.password = PasswordService.hash_password(temp_pass)
            admin.must_change_password = True
            admin.account_status = 'ACTIVE'

    # 2. Backfill Driver Accounts
    print("\nProcessing Driver Accounts...")
    drivers = db.session.query(Account).filter(Account.role == 'driver').all()
    for driver in drivers:
        if driver.username == 'driver@happyjourney.ai':
            driver.fullName = 'Ramesh'
            driver.busRoute = 'DR001'

        old_email = driver.username
        # Extract driver id
        driver_id = None
        if "drv" in old_email:
            # e.g., rameshdriverdrv234@happyjourney.ai -> drv234
            prefix = old_email.split("@")[0]
            idx = prefix.find("drv")
            if idx != -1:
                driver_id = prefix[idx:]
        
        if not driver_id:
            driver_id = driver.busRoute or driver.licenseNo or "drv100"
            driver_id = "".join(c for c in driver_id if c.isalnum())[:8]

        new_email = ProvisioningService.generate_unique_username(driver.fullName, driver_id, role='driver')
        temp_pass = PasswordService.generate_temp_password(driver.fullName, driver_id)
        
        print(f"Driver: {driver.fullName} (ID: {driver_id})\n  Old: {old_email}\n  New: {new_email}\n  Temp Pass: {temp_pass}")
        
        if not dry_run:
            driver.username = new_email
            driver.password = PasswordService.hash_password(temp_pass)
            driver.must_change_password = True
            driver.account_status = 'ACTIVE'

    # 3. Backfill Student Accounts
    print("\nProcessing Student Accounts...")
    students = db.session.query(Student).all()
    for stu in students:
        # Find matching student account
        s_acc = db.session.query(Account).filter(
            (Account.username == stu.school_email) | 
            ((Account.fullName == stu.name) & (Account.role == 'student'))
        ).first()

        old_email = stu.school_email
        roll = stu.rollNo or "ST000"
        
        new_email = ProvisioningService.generate_unique_username(stu.name, roll, role='student')
        temp_pass = PasswordService.generate_temp_password(stu.name, roll)
        
        print(f"Student: {stu.name} (Roll: {roll})\n  Old: {old_email}\n  New: {new_email}\n  Temp Pass: {temp_pass}")
        
        if not dry_run:
            stu.school_email = new_email
            if s_acc:
                s_acc.username = new_email
                s_acc.password = PasswordService.hash_password(temp_pass)
                s_acc.must_change_password = True
                s_acc.account_status = 'ACTIVE'
            else:
                # Create missing student account
                s_acc = Account(
                    role='student',
                    username=new_email,
                    password=PasswordService.hash_password(temp_pass),
                    fullName=stu.name,
                    phone=stu.parentPhone,
                    must_change_password=True,
                    account_status='ACTIVE'
                )
                db.session.add(s_acc)

    # 4. Backfill Parent Accounts
    print("\nProcessing Parent Accounts...")
    parents = db.session.query(Parent).all()
    for parent in parents:
        # Get first student of this parent
        linked_students = db.session.query(Student).filter(Student.parent_id == parent.id).all()
        student_roll = linked_students[0].rollNo if linked_students else "R000"
        
        old_email = parent.username
        p_name = parent.father_name or parent.mother_name or "Parent"
        
        new_email = ProvisioningService.generate_unique_parent_username(p_name, student_roll)
        temp_pass = PasswordService.generate_temp_password(p_name, student_roll)
        
        # Match parent account
        p_acc = db.session.query(Account).filter(
            (Account.username == old_email) |
            ((Account.fullName == p_name) & (Account.role == 'parent'))
        ).first()

        print(f"Parent: {p_name} (Child Roll: {student_roll})\n  Old: {old_email}\n  New: {new_email}\n  Temp Pass: {temp_pass}")
        
        if not dry_run:
            parent.username = new_email
            parent.password_hash = PasswordService.hash_password(temp_pass)
            if p_acc:
                p_acc.username = new_email
                p_acc.fullName = p_name
                p_acc.password = PasswordService.hash_password(temp_pass)
                p_acc.must_change_password = True
                p_acc.account_status = 'ACTIVE'
            else:
                # Create parent account
                p_acc = Account(
                    role='parent',
                    username=new_email,
                    password=PasswordService.hash_password(temp_pass),
                    fullName=p_name,
                    phone=parent.phone,
                    must_change_password=True,
                    account_status='ACTIVE'
                )
                db.session.add(p_acc)

    # Standalone parent accounts (without Parent table records)
    standalone_p_accs = db.session.query(Account).filter(Account.role == 'parent').all()
    for p_acc in standalone_p_accs:
        # Check if already processed
        if p_acc.username.endswith(".parent@happyjourney.ai"):
            continue
            
        old_email = p_acc.username
        if old_email == 'parent@happyjourney.ai':
            p_acc.fullName = 'Suresh'
            new_email = ProvisioningService.generate_unique_parent_username('Suresh', 'R003')
            temp_pass = PasswordService.generate_temp_password('Suresh', 'R003')
        else:
            new_email = ProvisioningService.generate_unique_parent_username(p_acc.fullName, "R000")
            temp_pass = PasswordService.generate_temp_password(p_acc.fullName, "R000")
        
        print(f"Parent Account (Standalone): {p_acc.fullName}\n  Old: {old_email}\n  New: {new_email}\n  Temp Pass: {temp_pass}")
        
        if not dry_run:
            p_acc.username = new_email
            p_acc.password = PasswordService.hash_password(temp_pass)
            p_acc.must_change_password = True
            p_acc.account_status = 'ACTIVE'

    if not dry_run:
        # Commit database transaction
        db.session.commit()
        
        # Log audit events for all processed accounts
        for acc in db.session.query(Account).all():
            # Add audit entry if not existing
            exists = db.session.query(CredentialAudit).filter(CredentialAudit.account_id == acc.id).first()
            if not exists:
                audit = CredentialAudit(
                    account_id=acc.id,
                    generated_by='migration',
                    credential_type='CREATION',
                    status='ACTIVE'
                )
                db.session.add(audit)
        db.session.commit()
        print("\nSUCCESS: All standardized accounts migrated and updated.")
    else:
        print("\nDRY RUN COMPLETE: No database modifications were committed.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Backfill SafeBus credentials with role-based formatting.")
    parser.add_argument('--dry-run', action='store_true', help="Only preview proposed modifications without writing to database.")
    parser.add_argument('--apply', action='store_true', help="Apply proposed modifications to database.")
    
    args = parser.parse_args()
    
    with app.app_context():
        if args.apply:
            backfill(dry_run=False)
        else:
            # Default to dry-run
            backfill(dry_run=True)
