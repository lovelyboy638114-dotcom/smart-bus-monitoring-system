import re

def validate_email_format(email):
    """
    Ensure email matches basic RFC formats and is in the @happyjourney.ai domain.
    """
    if not email:
        return False
    # Validate general email format
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(pattern, email):
        return False
    return email.endswith("@happyjourney.ai")

def validate_password_strength(password):
    """
    Enforce security policy:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one numeric character
    - At least one special character (!@#$%^&*()_+ etc.)
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\",./<>?\\|`~]", password):
        return False, "Password must contain at least one special character."
    return True, "Password meets all safety criteria."
