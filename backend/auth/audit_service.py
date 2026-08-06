from datetime import datetime
from models import db
from students.models import CredentialAudit

class AuditService:
    @staticmethod
    def log_creation_or_reset(account_id, generated_by, credential_type='CREATION', ip_address=None, browser=None, device=None):
        """
        Record when a credential is created or reset.
        """
        audit = CredentialAudit(
            account_id=account_id,
            generated_by=generated_by,
            credential_type=credential_type,
            ip_address=ip_address,
            browser=browser,
            device=device,
            status='ACTIVE'
        )
        if credential_type == 'RESET':
            audit.reset_time = datetime.utcnow()
            
        db.session.add(audit)
        db.session.flush()
        return audit

    @staticmethod
    def log_first_login_completed(account_id, ip_address=None, browser=None, device=None):
        """
        Mark first login completed and update log state.
        """
        audit = db.session.query(CredentialAudit).filter(
            CredentialAudit.account_id == account_id
        ).order_by(CredentialAudit.generated_at.desc()).first()
        
        if audit:
            audit.first_login_completed = True
            audit.ip_address = ip_address
            audit.browser = browser
            audit.device = device
            db.session.flush()

    @staticmethod
    def log_password_changed(account_id, ip_address=None, browser=None, device=None):
        """
        Log password change event.
        """
        audit = db.session.query(CredentialAudit).filter(
            CredentialAudit.account_id == account_id
        ).order_by(CredentialAudit.generated_at.desc()).first()
        
        if audit:
            audit.password_changed = datetime.utcnow()
            audit.ip_address = ip_address
            audit.browser = browser
            audit.device = device
            db.session.flush()

    @staticmethod
    def increment_download_count(account_id):
        """
        Increment credentials card downloaded counter.
        """
        audit = db.session.query(CredentialAudit).filter(
            CredentialAudit.account_id == account_id
        ).order_by(CredentialAudit.generated_at.desc()).first()
        if audit:
            audit.download_count += 1
            db.session.flush()

    @staticmethod
    def increment_print_count(account_id):
        """
        Increment credentials card printed counter.
        """
        audit = db.session.query(CredentialAudit).filter(
            CredentialAudit.account_id == account_id
        ).order_by(CredentialAudit.generated_at.desc()).first()
        if audit:
            audit.printed_count += 1
            db.session.flush()
