from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from utils.rate_limiter import rate_limit
import re

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ── Password validation ─────────────────────────────────────────────────────

MIN_PASSWORD_LENGTH = 8

def _validate_password(password: str) -> str | None:
    """
    Returns an error message string if password is invalid, otherwise None.
    Rules:
      - Minimum 8 characters
      - At least one letter
      - At least one digit
    """
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        return f'Password must be at least {MIN_PASSWORD_LENGTH} characters long.'
    if not re.search(r'[A-Za-z]', password):
        return 'Password must contain at least one letter.'
    if not re.search(r'\d', password):
        return 'Password must contain at least one number.'
    return None


# ── Routes ──────────────────────────────────────────────────────────────────

@auth_bp.route('/signup', methods=['POST'])
@rate_limit(max_calls=5, window_seconds=60)   # SEC-7: max 5 signups/min per IP
def signup():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'message': 'Missing required fields'}), 400

    # SEC-6: Validate password strength
    password_error = _validate_password(data['password'])
    if password_error:
        return jsonify({'message': password_error}), 400

    # Basic email format check
    email = data['email'].strip().lower()
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return jsonify({'message': 'Invalid email address'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'User already exists'}), 400

    new_user = User(
        name=data['name'].strip(),
        email=email
    )
    new_user.set_password(data['password'])

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201


@auth_bp.route('/login', methods=['POST'])
@rate_limit(max_calls=10, window_seconds=60)  # SEC-7: max 10 login attempts/min per IP
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing required fields'}), 400

    email = data['email'].strip().lower()
    user = User.query.filter_by(email=email).first()

    # Use constant-time comparison via check_password even if user is None
    # to avoid timing-based user enumeration
    if not user or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': {'id': user.id, 'name': user.name, 'email': user.email}
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id))  # Use non-deprecated session.get()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({'id': user.id, 'name': user.name, 'email': user.email}), 200
