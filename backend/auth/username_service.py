import re
import unicodedata
from models import db, Account

class UsernameService:
    @staticmethod
    def normalize_username(name):
        """
        Normalize username by removing spaces, punctuation, special characters, 
        underscores, accents, and converting everything to lowercase.
        """
        if not name:
            return ""
        # Remove accents
        nfkd_form = unicodedata.normalize('NFKD', name)
        only_ascii = nfkd_form.encode('ASCII', 'ignore').decode('utf-8')
        # Remove everything except alphanumeric characters
        cleaned = re.sub(r'[^a-zA-Z0-9]', '', only_ascii).lower()
        return cleaned

    @classmethod
    def generate_student_email(cls, name, roll):
        norm_name = cls.normalize_username(name)
        norm_roll = cls.normalize_username(roll)
        return f"{norm_name}{norm_roll}.student@happyjourney.ai"

    @classmethod
    def generate_parent_email(cls, parent_name, student_roll):
        norm_parent = cls.normalize_username(parent_name)
        norm_roll = cls.normalize_username(student_roll)
        return f"{norm_parent}{norm_roll}.parent@happyjourney.ai"

    @classmethod
    def generate_driver_email(cls, driver_name, driver_id):
        norm_driver = cls.normalize_username(driver_name)
        norm_id = cls.normalize_username(driver_id)
        return f"{norm_driver}{norm_id}.driver@happyjourney.ai"

    @classmethod
    def generate_admin_email(cls, admin_name):
        norm_admin = cls.normalize_username(admin_name)
        return f"{norm_admin}.admin@happyjourney.ai"

    @classmethod
    def generate_unique_username(cls, base_name, identifier, role):
        """
        Check if generated username exists and resolve conflicts by appending incremental
        suffixes before the role domain identifier (e.g. vijayar003_1.student@happyjourney.ai).
        """
        norm_name = cls.normalize_username(base_name)
        norm_ident = cls.normalize_username(identifier) if identifier else ""

        # Construct base parts by role
        if role == 'student':
            prefix = f"{norm_name}{norm_ident}"
            ext = ".student"
        elif role == 'parent':
            prefix = f"{norm_name}{norm_ident}"
            ext = ".parent"
        elif role == 'driver':
            prefix = f"{norm_name}{norm_ident}"
            ext = ".driver"
        elif role == 'admin':
            prefix = f"{norm_name}"
            ext = ".admin"
        else:
            prefix = f"{norm_name}{norm_ident}"
            ext = ""

        base_email = f"{prefix}{ext}@happyjourney.ai"
        
        # Check database conflicts
        exists = db.session.query(Account).filter(Account.username == base_email).first()
        if not exists:
            return base_email

        suffix = 1
        while True:
            candidate = f"{prefix}_{suffix}{ext}@happyjourney.ai"
            exists = db.session.query(Account).filter(Account.username == candidate).first()
            if not exists:
                return candidate
            suffix += 1
