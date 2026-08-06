import os
import sys
import re
from pathlib import Path
from werkzeug.security import generate_password_hash

# Dynamic path resolution
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app import app
from models import db, Student, Account, Bus
from students.models import Parent, CredentialAudit
from students.services.provisioning_service import ProvisioningService

def backfill():
    print("=== BACKFILLING AUTOMATIC ACCOUNTS FOR EXISTING PROFILES ===")
    
    with app.app_context():
        # 1. Backfill Students & Parents
        students = db.session.query(Student).all()
        for s in students:
            # Clean and clean name/roll
            cleaned_name = re.sub(r'[^a-zA-Z0-9]', '', s.name).lower()
            cleaned_roll = re.sub(r'[^a-zA-Z0-9]', '', s.rollNo).lower()
            
            # Form expected base email
            expected_email = f"{cleaned_name}{cleaned_roll}@happyjourney.ai"
            
            # Check if student already has school_email set
            if not s.school_email:
                s.school_email = expected_email
                
            # Check if account already exists
            acc = db.session.query(Account).filter(Account.username == s.school_email).first()
            if not acc:
                temp_pass = s.name.replace(" ", "") + s.rollNo.replace(" ", "")
                hashed_pass = generate_password_hash(temp_pass)
                
                print(f"Creating Student Account: {s.school_email} | Password: {temp_pass}")
                
                # Insert Account
                new_acc = Account(
                    role='student',
                    username=s.school_email,
                    password=hashed_pass,
                    fullName=s.name,
                    phone=s.parentPhone,
                    must_change_password=True,
                    account_status='ACTIVE'
                )
                db.session.add(new_acc)
                db.session.flush()
                
                # Audit log
                audit = CredentialAudit(
                    account_id=new_acc.id,
                    generated_by='backfill_script',
                    credential_type='CREATION'
                )
                db.session.add(audit)
                
            # Check Parent details and create Parent account if not exists
            if s.parentPhone:
                parent = db.session.query(Parent).filter(Parent.phone == s.parentPhone).first()
                if not parent:
                    # Create Parent
                    p_name = s.parentName or "Parent"
                    p_username = ProvisioningService.generate_unique_parent_username(p_name, s.name)
                    p_temp_pass = p_name.replace(" ", "") + s.name.replace(" ", "")
                    p_hashed_pass = generate_password_hash(p_temp_pass)
                    
                    print(f"Creating Parent: {p_username} | Password: {p_temp_pass}")
                    
                    parent = Parent(
                        father_name=p_name,
                        mother_name="Mother",
                        guardian_name="Guardian",
                        phone=s.parentPhone,
                        email="parent@school.edu",
                        address=s.address or "Not Specified",
                        username=p_username,
                        password_hash=p_hashed_pass
                    )
                    db.session.add(parent)
                    db.session.flush()
                    
                    # Parent account
                    p_acc = Account(
                        role='parent',
                        username=p_username,
                        password=p_hashed_pass,
                        fullName=p_name,
                        phone=s.parentPhone,
                        must_change_password=True,
                        account_status='ACTIVE'
                    )
                    db.session.add(p_acc)
                    db.session.flush()
                    
                    # Audit log
                    audit_p = CredentialAudit(
                        account_id=p_acc.id,
                        generated_by='backfill_script',
                        credential_type='CREATION'
                    )
                    db.session.add(audit_p)
                
                # Link parent_id
                s.parent_id = parent.id

        # 2. Backfill Drivers from Bus table
        buses = db.session.query(Bus).all()
        for b in buses:
            if b.driver:
                cleaned_driver = re.sub(r'[^a-zA-Z0-9]', '', b.driver).lower()
                cleaned_bus_suffix = b.id.replace(" ", "").lower()[-3:]
                expected_driver_email = f"{cleaned_driver}drv{cleaned_bus_suffix}@happyjourney.ai"
                
                acc = db.session.query(Account).filter(Account.username == expected_driver_email).first()
                if not acc:
                    # Clean temp pass: RameshKumarTN38AB1234 -> wait, DriverName + DriverID (let's use bus.id)
                    temp_pass = b.driver.replace(" ", "") + b.id.replace(" ", "")
                    hashed_pass = generate_password_hash(temp_pass)
                    
                    print(f"Creating Driver Account: {expected_driver_email} | Password: {temp_pass}")
                    
                    new_acc = Account(
                        role='driver',
                        username=expected_driver_email,
                        password=hashed_pass,
                        fullName=b.driver,
                        licenseNo=b.driverLicense or "DL-PENDING",
                        experienceYears=b.driverExperience,
                        busRoute=b.id,
                        phone="+1-555-0000",
                        must_change_password=True,
                        account_status='ACTIVE'
                    )
                    db.session.add(new_acc)
                    db.session.flush()
                    
                    audit_d = CredentialAudit(
                        account_id=new_acc.id,
                        generated_by='backfill_script',
                        credential_type='CREATION'
                    )
                    db.session.add(audit_d)

        db.session.commit()
        print("=== BACKFILL SUCCESSFULLY COMPLETED ===")

if __name__ == "__main__":
    backfill()
