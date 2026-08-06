import re
from models import db, Account, Student
from students.models import Parent

class ProvisioningService:
    @staticmethod
    def generate_temp_password(parts):
        """
        Generate a temporary password by stripping spaces and special characters from parts.
        """
        cleaned_parts = [re.sub(r'[^a-zA-Z0-9]', '', part) for part in parts if part]
        return "".join(cleaned_parts)

    @staticmethod
    def generate_unique_username(base_name, identifier):
        """
        Generate a unique email in the @happyjourney.ai domain.
        Appends an incremental numeric suffix if a conflict occurs.
        """
        cleaned_name = re.sub(r'[^a-zA-Z0-9]', '', base_name).lower()
        cleaned_id = re.sub(r'[^a-zA-Z0-9]', '', identifier).lower()
        
        base_email = f"{cleaned_name}{cleaned_id}@happyjourney.ai"
        
        # Check if email is already in use
        exists = db.session.query(Account).filter(Account.username == base_email).first()
        if not exists:
            return base_email
            
        suffix = 1
        while True:
            candidate = f"{cleaned_name}{cleaned_id}_{suffix}@happyjourney.ai"
            exists = db.session.query(Account).filter(Account.username == candidate).first()
            if not exists:
                return candidate
            suffix += 1

    @staticmethod
    def generate_unique_parent_username(parent_name, student_name):
        """
        Generate a unique parent email: <parent_name><student_name>@happyjourney.ai
        """
        cleaned_p = re.sub(r'[^a-zA-Z0-9]', '', parent_name).lower()
        cleaned_s = re.sub(r'[^a-zA-Z0-9]', '', student_name).lower()
        
        base_email = f"{cleaned_p}{cleaned_s}@happyjourney.ai"
        
        exists = db.session.query(Account).filter(Account.username == base_email).first()
        if not exists:
            return base_email
            
        suffix = 1
        while True:
            candidate = f"{cleaned_p}{cleaned_s}_{suffix}@happyjourney.ai"
            exists = db.session.query(Account).filter(Account.username == candidate).first()
            if not exists:
                return candidate
            suffix += 1

    @staticmethod
    def check_student_exists(admission_no, student_id, roll_no, school_email=None):
        """
        Check if student already exists by checking key identifiers.
        """
        queries = []
        if admission_no:
            queries.append(Student.admission_no == admission_no)
        if student_id:
            queries.append(Student.id == student_id)
            queries.append(Student.student_id == student_id)
        if roll_no:
            queries.append(Student.rollNo == roll_no)
        if school_email:
            queries.append(Student.school_email == school_email)
            
        if not queries:
            return False
            
        from sqlalchemy import or_
        exists = db.session.query(Student).filter(or_(*queries)).first()
        return exists is not None

    @staticmethod
    def check_driver_exists(driver_id, license_no, phone, email):
        """
        Check if a driver already exists by matching driver ID, license, phone, or email.
        """
        queries = []
        if driver_id:
            queries.append(Account.busRoute == driver_id) # Driver ID is sometimes mapped here, or we match accounts
        if license_no:
            queries.append(Account.licenseNo == license_no)
        if phone:
            queries.append(Account.phone == phone)
        if email:
            queries.append(Account.username == email)
            
        if not queries:
            return False
            
        from sqlalchemy import or_
        exists = db.session.query(Account).filter(Account.role == 'driver').filter(or_(*queries)).first()
        return exists is not None
