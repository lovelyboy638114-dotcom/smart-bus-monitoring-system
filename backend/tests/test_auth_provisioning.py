import unittest
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path so we can import the modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import Account, Student
from students.models import Parent, CredentialAudit
from auth.provisioning_service import ProvisioningService
from auth.password_service import PasswordService
from auth.username_service import UsernameService
from auth.auth_service import AuthService
from auth.audit_service import AuditService

class TestAuthProvisioningSystem(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        app.config['TESTING'] = True
        self.client = app.test_client()
        self.app_context = app.app_context()
        self.app_context.__enter__()
        
        # Start transaction boundary
        db.session.begin_nested()

    def tearDown(self):
        db.session.rollback()
        self.app_context.__exit__(None, None, None)

    def test_username_normalization(self):
        """
        Verify name normalization strips spaces, accents, special characters, and casing.
        """
        # spaces, casing
        self.assertEqual(UsernameService.normalize_username("Vijaya Kumar"), "vijayakumar")
        # accents (e.g. French accents or similar)
        self.assertEqual(UsernameService.normalize_username("Café-Stüdent"), "cafestudent")
        # special characters and underscores
        self.assertEqual(UsernameService.normalize_username("vijaya_kumar-#123"), "vijayakumar123")

    def test_email_generation_formats(self):
        """
        Verify student, parent, driver, and admin email layouts.
        """
        self.assertEqual(
            UsernameService.generate_student_email("Vijaya", "R003"),
            "vijayar003.student@happyjourney.ai"
        )
        self.assertEqual(
            UsernameService.generate_parent_email("Suresh", "R003"),
            "sureshr003.parent@happyjourney.ai"
        )
        self.assertEqual(
            UsernameService.generate_driver_email("Ramesh", "DR001"),
            "rameshdr001.driver@happyjourney.ai"
        )
        self.assertEqual(
            UsernameService.generate_admin_email("Principal"),
            "principal.admin@happyjourney.ai"
        )

    def test_temp_password_generation(self):
        """
        Verify temp password format is Name@Identifier.
        """
        self.assertEqual(PasswordService.generate_temp_password("Vijaya", "R003"), "Vijaya@R003")
        self.assertEqual(PasswordService.generate_temp_password("Ramesh", "DR001"), "Ramesh@DR001")
        self.assertEqual(PasswordService.generate_temp_password("Suresh", "R003"), "Suresh@R003")

    def test_password_strength_validator(self):
        """
        Verify password strength criteria: length>=8, upper, lower, digit, special.
        """
        # Too short
        ok, msg = PasswordService.validate_password_strength("Short1!")
        self.assertFalse(ok)
        
        # Missing uppercase
        ok, msg = PasswordService.validate_password_strength("lowercase123!")
        self.assertFalse(ok)
        
        # Missing number
        ok, msg = PasswordService.validate_password_strength("NoNumberVal!")
        self.assertFalse(ok)
        
        # Missing special character
        ok, msg = PasswordService.validate_password_strength("NoSpecialChar123")
        self.assertFalse(ok)
        
        # Strong password
        ok, msg = PasswordService.validate_password_strength("Vijaya@R003")
        self.assertTrue(ok)

    def test_duplicate_username_suffixes(self):
        """
        Verify unique suffix incrementation before the role suffix domain.
        """
        # Pre-seed candidate account
        email_base = UsernameService.generate_unique_username("UniqueTestStudent", "R999", role='student')
        acc1 = Account(
            role='student',
            username=email_base,
            password=PasswordService.hash_password("DummyPass123!"),
            fullName="UniqueTestStudent",
            account_status='ACTIVE'
        )
        db.session.add(acc1)
        db.session.flush()

        # Generate again: should append _1
        dup_email = UsernameService.generate_unique_username("UniqueTestStudent", "R999", role='student')
        self.assertEqual(dup_email, "uniqueteststudentr999_1.student@happyjourney.ai")

    def test_failed_login_attempts_lockout(self):
        """
        Verify temporary account lock triggers after 5 failed attempts.
        """
        test_user = "locktest.student@happyjourney.ai"
        acc = Account(
            role='student',
            username=test_user,
            password=PasswordService.hash_password("LockPass123!"),
            fullName="Lock Test Student",
            account_status='ACTIVE',
            failed_login_attempts=0
        )
        db.session.add(acc)
        db.session.flush()

        # Fail login 4 times
        for _ in range(4):
            success, msg = AuthService.attempt_login(test_user, "WrongPass", "student")
            self.assertFalse(success)
            
        self.assertEqual(acc.failed_login_attempts, 4)
        self.assertEqual(acc.account_status, 'ACTIVE')

        # Fail 5th time -> should lock
        success, msg = AuthService.attempt_login(test_user, "WrongPass", "student")
        self.assertFalse(success)
        self.assertEqual(acc.account_status, 'LOCKED')
        self.assertIsNotNone(acc.lock_time)

        # Attempt to login again (even with correct pass) -> should be denied
        success, msg = AuthService.attempt_login(test_user, "LockPass123!", "student")
        self.assertFalse(success)
        self.assertIn("temporarily locked", msg)

    def test_account_suspension(self):
        """
        Verify suspended account is denied access immediately.
        """
        test_user = "suspendtest.student@happyjourney.ai"
        acc = Account(
            role='student',
            username=test_user,
            password=PasswordService.hash_password("Pass123!"),
            fullName="Suspended Student",
            account_status='SUSPENDED'
        )
        db.session.add(acc)
        db.session.flush()

        success, msg = AuthService.attempt_login(test_user, "Pass123!", "student")
        self.assertFalse(success)
        self.assertIn("suspended", msg.lower())

    def test_audit_logs_creation(self):
        """
        Verify credential audits capture events and client IP/browser info.
        """
        acc = Account(
            role='student',
            username="audittest.student@happyjourney.ai",
            password=PasswordService.hash_password("Pass123!"),
            fullName="Audit Student",
            account_status='ACTIVE'
        )
        db.session.add(acc)
        db.session.flush()

        # Log creation event
        audit = AuditService.log_creation_or_reset(
            account_id=acc.id,
            generated_by="admin.admin@happyjourney.ai",
            credential_type='CREATION',
            ip_address="192.168.1.1",
            browser="Chrome",
            device="Desktop"
        )
        
        self.assertEqual(audit.generated_by, "admin.admin@happyjourney.ai")
        self.assertEqual(audit.ip_address, "192.168.1.1")
        self.assertEqual(audit.browser, "Chrome")
        self.assertEqual(audit.device, "Desktop")

if __name__ == '__main__':
    unittest.main()
