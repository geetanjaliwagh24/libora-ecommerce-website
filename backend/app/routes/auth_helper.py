import jwt
from functools import wraps
from flask import request, jsonify, current_app
from app.models import db, User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check if auth header is present
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
            
        try:
            # Decode token
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = db.session.get(User, data['user_id'])
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if current_user.role not in allowed_roles:
                return jsonify({'message': f'Access denied! Requires {allowed_roles} role.'}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator
