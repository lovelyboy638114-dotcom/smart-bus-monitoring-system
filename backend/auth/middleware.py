from functools import wraps
from flask import request, jsonify

def require_role(roles):
    """
    Decorator to restrict route access by role.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Parse user information from request context headers (mimicking JWT / session check)
            user_role = request.headers.get('X-User-Role')
            if not user_role or user_role not in roles:
                return jsonify({"success": False, "message": "Unauthorized role access."}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
