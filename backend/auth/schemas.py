class LoginRequestSchema:
    @staticmethod
    def validate(data):
        if not data:
            return False, "Request body is empty"
        username = data.get('username')
        password = data.get('password')
        role = data.get('role')
        if not username or not password or not role:
            return False, "Missing required fields (username, password, role)"
        return True, None

class PasswordChangeRequestSchema:
    @staticmethod
    def validate(data):
        if not data:
            return False, "Request body is empty"
        username = data.get('username')
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        if not username or not current_password or not new_password:
            return False, "Missing required fields (username, current_password, new_password)"
        return True, None
