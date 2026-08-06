from datetime import datetime, timedelta
from models import db, Account
from auth.password_service import PasswordService

class AuthService:
    @staticmethod
    def attempt_login(username, password, role):
        """
        Attempt to log in. Verifies username, role, password, status, and lockouts.
        Returns: (success, message_or_account)
        """
        account = db.session.query(Account).filter(
            Account.username == username,
            Account.role == role
        ).first()

        if not account:
            return False, "Invalid username or password"

        # Check account status
        if account.account_status == 'SUSPENDED':
            return False, "Account is suspended. Please contact the administrator."

        # Check lock-out state
        if account.account_status == 'LOCKED':
            if account.lock_time:
                # If 15 minutes have passed, unlock the account
                if datetime.utcnow() > account.lock_time + timedelta(minutes=15):
                    account.account_status = 'ACTIVE'
                    account.failed_login_attempts = 0
                    account.lock_time = None
                    db.session.flush()
                else:
                    time_diff = (account.lock_time + timedelta(minutes=15)) - datetime.utcnow()
                    remaining = max(1, int(time_diff.total_seconds() / 60))
                    return False, f"Account is temporarily locked due to repeated failures. Try again in {remaining} mins."
            else:
                return False, "Account is locked."

        # Verify password
        if PasswordService.check_password(account.password, password):
            # Success: reset failed attempts, update last_login
            account.failed_login_attempts = 0
            account.last_login = datetime.utcnow()
            db.session.flush()
            return True, account
        else:
            # Failure: increment counter and lock if needed
            account.failed_login_attempts += 1
            if account.failed_login_attempts >= 5:
                account.account_status = 'LOCKED'
                account.lock_time = datetime.utcnow()
                db.session.flush()
                return False, "Account has been locked due to 5 failed login attempts. Please try again in 15 minutes."
            
            db.session.flush()
            return False, "Invalid username or password"
