from auth.username_service import UsernameService
from auth.password_service import PasswordService

class ProvisioningService:
    @staticmethod
    def normalize_username(name):
        return UsernameService.normalize_username(name)

    @staticmethod
    def generate_student_email(name, roll):
        return UsernameService.generate_student_email(name, roll)

    @staticmethod
    def generate_parent_email(parent_name, student_roll):
        return UsernameService.generate_parent_email(parent_name, student_roll)

    @staticmethod
    def generate_unique_parent_username(parent_name, student_roll):
        return UsernameService.generate_unique_username(parent_name, student_roll, role='parent')

    @staticmethod
    def generate_driver_email(driver_name, driver_id):
        return UsernameService.generate_driver_email(driver_name, driver_id)

    @staticmethod
    def generate_admin_email(admin_name):
        return UsernameService.generate_admin_email(admin_name)

    @staticmethod
    def generate_unique_username(base_name, identifier, role='student'):
        return UsernameService.generate_unique_username(base_name, identifier, role)

    @staticmethod
    def generate_temp_password(name, identifier):
        return PasswordService.generate_temp_password(name, identifier)
