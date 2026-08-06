from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, Account
from students.models import Parent
from auth.auth_service import AuthService
from auth.password_service import PasswordService
from auth.audit_service import AuditService
from auth.utils import get_client_ip, parse_user_agent

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    if not username or not password or not role:
        return jsonify({"success": False, "status": "error", "message": "Missing required fields."}), 400

    try:
        success, result = AuthService.attempt_login(username, password, role)
        ip = get_client_ip()
        ua = parse_user_agent()

        if success:
            account = result
            
            # Log first login completed if it's the first login
            audit = db.session.query(Parent).filter(Parent.username == account.username).first()
            
            # Audit log login event (we can use reset or creation check if needed, or simply log the login details)
            AuditService.log_creation_or_reset(
                account_id=account.id,
                generated_by=account.username,
                credential_type='LOGIN',
                ip_address=ip,
                browser=ua["browser"],
                device=ua["device"]
            )

            # Build login response payload
            user_data = {
                "id": account.id,
                "username": account.username,
                "role": account.role,
                "fullName": account.fullName,
                "licenseNo": account.licenseNo,
                "experienceYears": account.experienceYears,
                "busRoute": account.busRoute,
                "mustChangePassword": bool(account.must_change_password)
            }
            if account.role == 'parent':
                parent_rec = db.session.query(Parent).filter(Parent.username == account.username).first()
                if not parent_rec:
                    prefix_account = account.username.split('@')[0].rstrip('0123456789')
                    if prefix_account.endswith('r'):
                        prefix_account = prefix_account[:-1]
                    parents = db.session.query(Parent).all()
                    for p in parents:
                        prefix_p = p.username.split('@')[0].rstrip('0123456789')
                        if prefix_p.endswith('r'):
                            prefix_p = prefix_p[:-1]
                        if prefix_account[:4] in prefix_p or prefix_p[:4] in prefix_account:
                            parent_rec = p
                            break
                if parent_rec:
                    user_data["parentId"] = parent_rec.id
                    user_data["phone"] = parent_rec.phone

            return jsonify({
                "success": True,
                "status": "success",
                "role": account.role,
                "display_name": account.fullName,
                "email": account.username,
                "dashboard": f"/{account.role}",
                "must_change_password": bool(account.must_change_password),
                "user": user_data
            })
        else:
            return jsonify({"success": False, "status": "error", "message": result}), 401

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "status": "error", "message": f"Database query error: {str(e)}"}), 500

@auth_bp.route('/api/v1/change-password', methods=['POST'])
def change_password():
    data = request.json or {}
    username = data.get('username')
    old_password = data.get('oldPassword') or data.get('old_password') or data.get('current_password')
    new_password = data.get('newPassword') or data.get('new_password')
    role = data.get('role')

    if not username or not old_password or not new_password or not role:
        return jsonify({"success": False, "message": "Missing required fields."}), 400

    # Validate password strength
    strength_ok, strength_msg = PasswordService.validate_password_strength(new_password)
    if not strength_ok:
        return jsonify({"success": False, "message": strength_msg}), 400

    try:
        account = db.session.query(Account).filter(
            Account.username == username,
            Account.role == role
        ).first()

        if not account or not PasswordService.check_password(account.password, old_password):
            return jsonify({"success": False, "message": "Invalid current password."}), 401

        hashed_pass = PasswordService.hash_password(new_password)
        account.password = hashed_pass
        
        # Track first login completed transition
        is_first_login = bool(account.must_change_password)
        account.must_change_password = False
        account.last_password_change = datetime.utcnow()

        # Update parent password_hash if parent
        if role == 'parent':
            parent = db.session.query(Parent).filter(Parent.username == username).first()
            if parent:
                parent.password_hash = hashed_pass

        db.session.flush()

        # Write detailed audits
        ip = get_client_ip()
        ua = parse_user_agent()
        
        if is_first_login:
            AuditService.log_first_login_completed(account.id, ip_address=ip, browser=ua["browser"], device=ua["device"])
            
        AuditService.log_password_changed(account.id, ip_address=ip, browser=ua["browser"], device=ua["device"])

        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Password changed successfully."
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to change password: {str(e)}"}), 500
