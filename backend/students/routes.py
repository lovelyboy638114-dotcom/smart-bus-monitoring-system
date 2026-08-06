from flask import Blueprint, jsonify, request
from models import db, Student, Account, Bus
from students.models import Parent, CredentialAudit
from students.services.idcard_service import IDCardService
from auth.provisioning_service import ProvisioningService
from students.services.credential_pdf_service import CredentialPDFService
from students.services.bus_assignment_service import BusAssignmentService
from students.services.parent_link_service import ParentLinkService
from werkzeug.security import generate_password_hash
import logging
from datetime import datetime

logger = logging.getLogger("safebus-students")
students_bp = Blueprint('students', __name__)

def _get_auth_info():
    role = request.headers.get("X-User-Role")
    username = request.headers.get("X-User-Username")
    return role, username

def _resolve_parent(username):
    if not username:
        return None
    # 1. Try exact username match
    parent = db.session.query(Parent).filter(Parent.username == username).first()
    if parent:
        return parent
        
    # 2. Fallback prefix-based fuzzy match
    prefix_account = username.split('@')[0].rstrip('0123456789')
    if prefix_account.endswith('r'):
        prefix_account = prefix_account[:-1]
    parents = db.session.query(Parent).all()
    for p in parents:
        if not p.username:
            continue
        prefix_p = p.username.split('@')[0].rstrip('0123456789')
        if prefix_p.endswith('r'):
            prefix_p = prefix_p[:-1]
        if prefix_account[:4] in prefix_p or prefix_p[:4] in prefix_account:
            return p
            
    return None

@students_bp.route('/api/v1/student/my-id-card', methods=['GET'])
def get_my_id_card():
    role, username = _get_auth_info()
    if not role or role != 'student' or not username:
        return jsonify({
            "success": False,
            "message": "Unauthorized. Student access only.",
            "errors": []
        }), 403

    student = db.session.query(Student).filter(Student.school_email == username).first()
    if not student:
        return jsonify({
            "success": False,
            "message": "Student profile not found for this account.",
            "errors": []
        }), 404

    return jsonify({
        "success": True,
        "message": "ID Card details retrieved successfully.",
        "data": {
            "student_id": student.id,
            "name": student.name,
            "rollNo": student.rollNo,
            "class_name": student.class_name,
            "admission_no": student.admission_no,
            "front_path": student.id_card_front_path,
            "back_path": student.id_card_back_path,
            "pdf_path": student.id_card_pdf_path,
            "version": student.id_card_version,
            "status": student.id_card_status,
            "generated_at": student.id_card_generated_at.isoformat() if student.id_card_generated_at else None
        }
    })

@students_bp.route('/api/v1/parent/student-id-card/<student_id>', methods=['GET'])
def get_parent_student_id_card(student_id):
    role, username = _get_auth_info()
    if not role or role != 'parent' or not username:
        return jsonify({
            "success": False,
            "message": "Unauthorized. Parent access only.",
            "errors": []
        }), 403

    # Resolve parent by username or fuzzy prefix fallback
    parent = _resolve_parent(username)
    if not parent:
        return jsonify({
            "success": False,
            "message": "Parent profile not found.",
            "errors": []
        }), 404

    student = db.session.query(Student).filter(Student.id == student_id).first()
    if not student:
        return jsonify({
            "success": False,
            "message": "Student record not found.",
            "errors": []
        }), 404

    # Linked check
    if student.parent_id != parent.id:
        return jsonify({
            "success": False,
            "message": "Forbidden. You are not authorized to view this student's ID Card.",
            "errors": []
        }), 403

    return jsonify({
        "success": True,
        "message": "Child's ID Card details retrieved successfully.",
        "data": {
            "student_id": student.id,
            "name": student.name,
            "rollNo": student.rollNo,
            "class_name": student.class_name,
            "admission_no": student.admission_no,
            "front_path": student.id_card_front_path,
            "back_path": student.id_card_back_path,
            "pdf_path": student.id_card_pdf_path,
            "version": student.id_card_version,
            "status": student.id_card_status,
            "generated_at": student.id_card_generated_at.isoformat() if student.id_card_generated_at else None
        }
    })

@students_bp.route('/api/v1/students/<student_id>/regenerate-id-card', methods=['POST'])
def regenerate_id_card(student_id):
    role, _ = _get_auth_info()
    if not role or role != 'admin':
        return jsonify({
            "success": False,
            "message": "Unauthorized. Admin access only.",
            "errors": []
        }), 403

    student = db.session.query(Student).filter(Student.id == student_id).first()
    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found.",
            "errors": []
        }), 404

    # Perform regeneration
    try:
        # Load details for Pillow
        student_data = {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "rollNo": student.rollNo,
            "class_name": student.class_name,
            "section": student.section,
            "gender": student.gender,
            "dob": student.dob,
            "bloodGroup": student.bloodGroup,
            "parentName": student.parentName,
            "parentPhone": student.parentPhone,
            "photo": student.photo,
            "admission_no": student.admission_no
        }
        
        # Draw and composite images
        qr_file_path = student.qr_code_path or f"/uploads/qr_codes/{student.id}.png"
        paths = IDCardService.generate_id_card(student_data, qr_file_path)
        student.qr_code_path = qr_file_path
        
        # Update database with new paths, increment version, set status
        student.id_card_front_path = paths["front_path"]
        student.id_card_back_path = paths["back_path"]
        student.id_card_pdf_path = paths["pdf_path"]
        student.id_card_generated_at = datetime.utcnow()
        student.id_card_version = (student.id_card_version or 0) + 1
        student.id_card_status = 'REGENERATED'
        
        db.session.commit()
        
        logger.info(f"Successfully regenerated ID Card for student {student_id} (Version: {student.id_card_version})")
        
        return jsonify({
            "success": True,
            "message": "ID Card successfully regenerated.",
            "data": {
                "front_path": student.id_card_front_path,
                "back_path": student.id_card_back_path,
                "pdf_path": student.id_card_pdf_path,
                "version": student.id_card_version,
                "status": student.id_card_status
            }
        })
    except Exception as e:
        logger.error(f"Failed to regenerate ID Card for student {student_id}: {e}")
        return jsonify({
            "success": False,
            "message": f"Generation failed: {str(e)}",
            "errors": [str(e)]
        }), 500

@students_bp.route('/api/v1/admin/register/student', methods=['POST'])
def register_student():
    role, admin_user = _get_auth_info()
    if not role or role != 'admin':
        return jsonify({"success": False, "message": "Unauthorized. Admin access only.", "errors": []}), 403

    data = request.json
    name = data.get('name')
    roll_no = data.get('rollNo')
    class_name = data.get('class') or data.get('class_name')
    section = data.get('section', 'A')
    gender = data.get('gender')
    dob = data.get('dob')
    blood_group = data.get('bloodGroup')
    address = data.get('address')
    medical_notes = data.get('medicalNotes')
    
    father_name = data.get('father_name') or data.get('parentName')
    mother_name = data.get('mother_name') or ""
    parent_phone = data.get('parent_phone') or data.get('parentPhone')
    parent_email = data.get('parent_email') or data.get('email')
    
    bus_id = data.get('bus_id') or data.get('busId')
    route_id = data.get('route_id')
    pickup_stop_id = data.get('pickup_stop_id')

    # 1. Validation
    if not name or not roll_no or not class_name:
        return jsonify({"success": False, "message": "Missing required fields (name, rollNo, class).", "errors": []}), 400

    # Duplicate check
    from uuid import uuid4
    stu_uuid = "STU_" + str(uuid4())[:8].upper()
    exists = ProvisioningService.check_student_exists(
        admission_no=roll_no, # roll_no acts as admission number base if not defined
        student_id=stu_uuid,
        roll_no=roll_no
    )
    if exists:
        return jsonify({"success": False, "message": "Student with this roll number or ID already exists.", "errors": []}), 400

    try:
        db.session.begin_nested() # transaction savepoint

        # 2. Parent Management
        # 2. Parent Management utilizing ParentLinkService
        parent_reused = False
        parent_temp_pass = ""
        parent_email_gen = ""
        
        parent = ParentLinkService.find_existing_parent(parent_phone, parent_email, db.session)

        if parent:
            parent_reused = True
            parent_email_gen = parent.username
        else:
            p_name = father_name or mother_name or "Parent"
            parent_email_gen = ProvisioningService.generate_unique_parent_username(p_name, roll_no)
            parent_temp_pass = ProvisioningService.generate_temp_password(p_name, roll_no)
            hashed_p_pass = generate_password_hash(parent_temp_pass)
            
            parent = ParentLinkService.create_parent(
                father_name=father_name,
                mother_name=mother_name,
                phone=parent_phone,
                email=parent_email,
                address=address,
                username=parent_email_gen,
                password_hash=hashed_p_pass,
                session=db.session
            )

            # Create matching Parent Account
            p_account = Account(
                role='parent',
                username=parent_email_gen,
                password=hashed_p_pass,
                fullName=p_name,
                phone=parent_phone,
                must_change_password=True,
                account_status='ACTIVE'
            )
            db.session.add(p_account)
            db.session.flush()

            # Credential log
            audit_p = CredentialAudit(
                account_id=p_account.id,
                generated_by=admin_user or 'admin',
                credential_type='CREATION'
            )
            db.session.add(audit_p)

        # 3. Student Management
        student_email = ProvisioningService.generate_unique_username(name, roll_no, role='student')
        student_temp_pass = ProvisioningService.generate_temp_password(name, roll_no)
        hashed_s_pass = generate_password_hash(student_temp_pass)

        # Setup Student database profile
        student = Student(
            id=stu_uuid,
            student_id=stu_uuid,
            name=name,
            rollNo=roll_no,
            class_name=class_name,
            section=section,
            gender=gender,
            dob=dob,
            bloodGroup=blood_group,
            address=address,
            medicalNotes=medical_notes,
            school_email=student_email,
            student_status='ACTIVE',
            id_card_version=1,
            id_card_status='ACTIVE'
        )
        
        # Link student to parent permanently
        ParentLinkService.link_student_to_parent(student, parent, db.session)

        if not bus_id:
            BusAssignmentService.assign_bus_to_student(student, db.session)
        else:
            student.busId = bus_id
            student.route_id = route_id
            student.pickup_stop_id = pickup_stop_id
            student.pickup_distance = 0.0
            student.assignment_status = 'MANUAL'
            student.status = 'Not Started'
            student.assigned_at = datetime.utcnow()

        if student.busId and student.status != 'BUS_PENDING':
            # Draw layouts and PDFs
            student_data = {
                "id": stu_uuid,
                "student_id": stu_uuid,
                "name": name,
                "rollNo": roll_no,
                "class_name": class_name,
                "section": section,
                "gender": gender,
                "dob": dob,
                "bloodGroup": blood_group,
                "parentName": father_name or mother_name or "Parent",
                "parentPhone": parent_phone,
                "admission_no": roll_no
            }
            qr_file_path = f"/uploads/qr_codes/{stu_uuid}.png"
            paths = IDCardService.generate_id_card(student_data, qr_path=qr_file_path)
            student.qr_code_path = qr_file_path
            student.id_card_front_path = paths["front_path"]
            student.id_card_back_path = paths["back_path"]
            student.id_card_pdf_path = paths["pdf_path"]
            student.id_card_generated_at = datetime.utcnow()
        else:
            student.status = 'BUS_PENDING'
            student.assignment_status = 'BUS_PENDING'

        db.session.add(student)

        # Create matching Student Account
        s_account = Account(
            role='student',
            username=student_email,
            password=hashed_s_pass,
            fullName=name,
            phone=parent_phone,
            must_change_password=True,
            account_status='ACTIVE'
        )
        db.session.add(s_account)
        db.session.flush()

        # Credential log
        audit_s = CredentialAudit(
            account_id=s_account.id,
            generated_by=admin_user or 'admin',
            credential_type='CREATION'
        )
        db.session.add(audit_s)

        # Generate credentials PDFs
        student_pdf = CredentialPDFService.generate_pdf(name, 'student', student_email, student_temp_pass, stu_uuid)
        parent_pdf = None
        if not parent_reused:
            p_name = father_name or mother_name or "Parent"
            parent_pdf = CredentialPDFService.generate_pdf(p_name, 'parent', parent_email_gen, parent_temp_pass, f"PAR_{parent.id}")

        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Student registered successfully.",
            "student_email": student_email,
            "student_temp_password": student_temp_pass,
            "parent_email": parent_email_gen,
            "parent_temp_password": parent_temp_pass if not parent_reused else "[Reused Account]",
            "data": {
                "student_email": student_email,
                "student_temp_pass": student_temp_pass,
                "student_temp_password": student_temp_pass,
                "student_pdf": student_pdf,
                "parent_email": parent_email_gen,
                "parent_temp_pass": parent_temp_pass if not parent_reused else "[Reused Account]",
                "parent_temp_password": parent_temp_pass if not parent_reused else "[Reused Account]",
                "parent_pdf": parent_pdf,
                "parent_reused": parent_reused
            }
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Student registration failed: {e}")
        
        # Delete generated file artifacts on failure to prevent dangling files
        try:
            import os
            if 'stu_uuid' in locals():
                qr_path = os.path.join(BACKEND_DIR, f"uploads/qr_codes/{stu_uuid}.png")
                if os.path.exists(qr_path):
                    os.remove(qr_path)
                front = os.path.join(BACKEND_DIR, f"uploads/id_cards/front/{stu_uuid}_front.png")
                if os.path.exists(front):
                    os.remove(front)
                back = os.path.join(BACKEND_DIR, f"uploads/id_cards/back/{stu_uuid}_back.png")
                if os.path.exists(back):
                    os.remove(back)
                pdf = os.path.join(BACKEND_DIR, f"uploads/id_cards/pdf/{stu_uuid}.pdf")
                if os.path.exists(pdf):
                    os.remove(pdf)
                s_pdf = os.path.join(BACKEND_DIR, f"uploads/credentials/student_{stu_uuid}.pdf")
                if os.path.exists(s_pdf):
                    os.remove(s_pdf)
        except Exception as cleanup_err:
            logger.error(f"Failed to cleanup files during rollback: {cleanup_err}")

        return jsonify({"success": False, "message": f"Registration failed: {str(e)}", "errors": [str(e)]}), 500

@students_bp.route('/api/v1/admin/register/driver', methods=['POST'])
def register_driver():
    role, admin_user = _get_auth_info()
    if not role or role != 'admin':
        return jsonify({"success": False, "message": "Unauthorized. Admin access only.", "errors": []}), 403

    data = request.json
    name = data.get('name')
    driver_id = data.get('driverId')
    license_no = data.get('licenseNo')
    experience_years = data.get('experienceYears')
    phone = data.get('phone')
    bus_route = data.get('busRoute')

    if not name or not driver_id:
        return jsonify({"success": False, "message": "Missing required fields (name, driverId).", "errors": []}), 400

    # Duplicate check
    exists = ProvisioningService.check_driver_exists(
        driver_id=driver_id,
        license_no=license_no,
        phone=phone,
        email=None
    )
    if exists:
        return jsonify({"success": False, "message": "Driver with these credentials already exists.", "errors": []}), 400

    try:
        db.session.begin_nested()

        driver_email = ProvisioningService.generate_unique_username(name, driver_id, role='driver')
        driver_temp_pass = ProvisioningService.generate_temp_password(name, driver_id)
        hashed_d_pass = generate_password_hash(driver_temp_pass)

        # Create driver account
        d_account = Account(
            role='driver',
            username=driver_email,
            password=hashed_d_pass,
            fullName=name,
            licenseNo=license_no,
            experienceYears=int(experience_years) if experience_years else None,
            busRoute=bus_route,
            phone=phone,
            must_change_password=True,
            account_status='ACTIVE'
        )
        db.session.add(d_account)
        db.session.flush()

        # Update Bus
        if bus_route:
            bus_item = db.session.query(Bus).filter(Bus.id == bus_route).first()
            if bus_item:
                bus_item.driver = name
                bus_item.driverLicense = license_no
                bus_item.driverExperience = int(experience_years) if experience_years else None

        # Credential log
        audit_d = CredentialAudit(
            account_id=d_account.id,
            generated_by=admin_user or 'admin',
            credential_type='CREATION'
        )
        db.session.add(audit_d)

        # Generate credentials PDF
        driver_pdf = CredentialPDFService.generate_pdf(name, 'driver', driver_email, driver_temp_pass, f"DRV_{driver_id}")

        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Driver registered successfully.",
            "driver_email": driver_email,
            "driver_temp_password": driver_temp_pass,
            "data": {
                "driver_email": driver_email,
                "driver_temp_pass": driver_temp_pass,
                "driver_temp_password": driver_temp_pass,
                "driver_pdf": driver_pdf
            }
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Driver registration failed: {e}")
        return jsonify({"success": False, "message": f"Registration failed: {str(e)}", "errors": [str(e)]}), 500

@students_bp.route('/api/v1/admin/register/parent', methods=['POST'])
def register_parent_standalone():
    role, admin_user = _get_auth_info()
    if not role or role != 'admin':
        return jsonify({"success": False, "message": "Unauthorized. Admin access only.", "errors": []}), 403

    data = request.json
    father_name = data.get('father_name')
    mother_name = data.get('mother_name')
    phone = data.get('phone')
    email = data.get('email')
    address = data.get('address')
    student_id = data.get('student_id')

    if not father_name or not phone:
        return jsonify({"success": False, "message": "Missing required fields (father_name, phone).", "errors": []}), 400

    try:
        db.session.begin_nested()

        # Check existing parent
        parent = db.session.query(Parent).filter(
            (Parent.phone == phone) | (Parent.email == email)
        ).first()

        parent_reused = False
        parent_temp_pass = ""
        parent_email_gen = ""

        if parent:
            parent_reused = True
            parent_email_gen = parent.username
        else:
            p_name = father_name or mother_name or "Parent"
            student_roll = "parent"
            if student_id:
                student_item = db.session.query(Student).filter(Student.id == student_id).first()
                if student_item:
                    student_roll = student_item.rollNo
            parent_email_gen = ProvisioningService.generate_unique_parent_username(p_name, student_roll)
            parent_temp_pass = ProvisioningService.generate_temp_password(p_name, student_roll)
            hashed_p_pass = generate_password_hash(parent_temp_pass)

            parent = Parent(
                father_name=father_name or "Father",
                mother_name=mother_name or "Mother",
                phone=phone,
                email=email or "parent@school.edu",
                address=address or "Not Specified",
                username=parent_email_gen,
                password_hash=hashed_p_pass
            )
            db.session.add(parent)
            db.session.flush()

            p_account = Account(
                role='parent',
                username=parent_email_gen,
                password=hashed_p_pass,
                fullName=p_name,
                phone=phone,
                must_change_password=True,
                account_status='ACTIVE'
            )
            db.session.add(p_account)
            db.session.flush()

            audit_p = CredentialAudit(
                account_id=p_account.id,
                generated_by=admin_user or 'admin',
                credential_type='CREATION'
            )
            db.session.add(audit_p)

        # Link to student if ID provided
        if student_id:
            student = db.session.query(Student).filter(Student.id == student_id).first()
            if student:
                student.parent_id = parent.id
                student.parentName = father_name or mother_name
                student.parentPhone = phone

        # Generate credentials PDF STANDALONE
        parent_pdf = None
        if not parent_reused:
            p_name = father_name or mother_name or "Parent"
            parent_pdf = CredentialPDFService.generate_pdf(p_name, 'parent', parent_email_gen, parent_temp_pass, f"PAR_{parent.id}")

        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Parent registered successfully.",
            "parent_email": parent_email_gen,
            "parent_temp_password": parent_temp_pass if not parent_reused else "[Reused Account]",
            "data": {
                "parent_email": parent_email_gen,
                "parent_temp_pass": parent_temp_pass if not parent_reused else "[Reused Account]",
                "parent_temp_password": parent_temp_pass if not parent_reused else "[Reused Account]",
                "parent_pdf": parent_pdf,
                "parent_reused": parent_reused
            }
        })

    except Exception as e:
        logger.error(f"Parent registration failed: {e}")
        return jsonify({"success": False, "message": f"Registration failed: {str(e)}", "errors": [str(e)]}), 500

@students_bp.route('/api/v1/admin/accounts/<username>/reset-password', methods=['POST'])
def admin_reset_password(username):
    role, admin_user = _get_auth_info()
    if not role or role != 'admin':
        return jsonify({"success": False, "message": "Unauthorized. Admin access only.", "errors": []}), 403

    try:
        db.session.begin_nested()

        account = db.session.query(Account).filter(Account.username == username).first()
        if not account:
            return jsonify({"success": False, "message": "Account not found.", "errors": []}), 404

        # Generate temp password based on role
        temp_pass = ""
        if account.role == 'student':
            student = db.session.query(Student).filter(Student.school_email == username).first()
            if student:
                temp_pass = ProvisioningService.generate_temp_password(student.name, student.rollNo)
            else:
                temp_pass = ProvisioningService.generate_temp_password(account.fullName, "student")
        
        elif account.role == 'driver':
            # Extract driver ID from email username
            prefix = username.split("@")[0].replace(".driver", "")
            cleaned_name = re.sub(r'[^a-zA-Z0-9]', '', account.fullName).lower()
            driver_id = prefix[len(cleaned_name):].upper() or "DR001"
            temp_pass = ProvisioningService.generate_temp_password(account.fullName, driver_id)
            
        elif account.role == 'parent':
            parent = _resolve_parent(username)
            student = None
            if parent:
                student = db.session.query(Student).filter(Student.parent_id == parent.id).first()
            
            p_name = parent.father_name if parent else account.fullName
            s_roll = student.rollNo if student else "parent"
            temp_pass = ProvisioningService.generate_temp_password(p_name, s_roll)
            
        else:
            temp_pass = ProvisioningService.generate_temp_password(account.fullName, "ADMIN")

        hashed_pass = generate_password_hash(temp_pass)
        account.password = hashed_pass
        account.must_change_password = True
        account.last_password_change = None

        # Update parent password if it is parent role
        if account.role == 'parent':
            parent = _resolve_parent(username)
            if parent:
                parent.password_hash = hashed_pass

        # Credential log
        audit = CredentialAudit(
            account_id=account.id,
            generated_by=admin_user or 'admin',
            credential_type='RESET'
        )
        db.session.add(audit)

        # Generate credentials PDF for reset
        reset_pdf = CredentialPDFService.generate_pdf(account.fullName, account.role, username, temp_pass, f"RESET_{account.id}")

        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Temporary password reset successfully.",
            "data": {
                "username": username,
                "temp_password": temp_pass,
                "pdf_path": reset_pdf
            }
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Password reset failed: {e}")
        return jsonify({"success": False, "message": f"Reset failed: {str(e)}", "errors": [str(e)]}), 500


