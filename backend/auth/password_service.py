import re
from werkzeug.security import generate_password_hash, check_password_hash
from auth.validators import validate_password_strength

class PasswordService:
    @staticmethod
    def generate_temp_password(name, identifier):
        """
        Generate temporary password in format: <Name>@<Identifier>
        (e.g., Vijaya@R003)
        """
        cleaned_name = re.sub(r'[^a-zA-Z0-9]', '', name)
        cleaned_id = re.sub(r'[^a-zA-Z0-9]', '', identifier)
        return f"{cleaned_name}@{cleaned_id}"

    @staticmethod
    def hash_password(password):
        return generate_password_hash(password)

    @staticmethod
    def check_password(p_hash, password):
        return check_password_hash(p_hash, password)

    @staticmethod
    def validate_password_strength(password):
        return validate_password_strength(password)
