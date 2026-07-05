from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from utils.rate_limiter import rate_limit
import re
import random
import time

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ── In-memory OTP store  { key -> {otp, expires_at} } ──────────────────────
# key = "email:<email>" or "phone:<phone>"
_OTP_STORE: dict = {}
OTP_TTL_SECONDS = 120  # 2 minutes

def _make_otp() -> str:
    return str(random.randint(100000, 999999))

def _store_otp(key: str, otp: str):
    _OTP_STORE[key] = {'otp': otp, 'expires_at': time.time() + OTP_TTL_SECONDS}

def _verify_otp(key: str, submitted: str) -> tuple[bool, str]:
    """Returns (success, error_message)."""
    record = _OTP_STORE.get(key)
    if not record:
        return False, 'No OTP found. Please request a new OTP.'
    if time.time() > record['expires_at']:
        _OTP_STORE.pop(key, None)
        return False, 'OTP has expired. Please request a new OTP.'
    if record['otp'] != submitted.strip():
        return False, 'Incorrect OTP. Please try again.'
    _OTP_STORE.pop(key, None)  # Consume OTP on success
    return True, ''

# ── OTP Routes ──────────────────────────────────────────────────────────────

@auth_bp.route('/send-otp', methods=['POST'])
@rate_limit(max_calls=5, window_seconds=60)
def send_otp():
    data = request.get_json() or {}
    otp_type = data.get('type')  # 'email' or 'phone'
    value = (data.get('value') or '').strip()

    if otp_type == 'email':
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', value):
            return jsonify({'message': 'Please enter a valid email address.'}), 400
        otp = _make_otp()
        _store_otp(f'email:{value.lower()}', otp)
        # In production: send via SMTP/SendGrid here.
        # In development: return OTP in response so you can test without email server.
        print(f'[DEV] Email OTP for {value}: {otp}')
        return jsonify({'message': f'OTP sent to {value}', 'dev_otp': otp}), 200

    elif otp_type == 'phone':
        digits = re.sub(r'\D', '', value)
        if len(digits) != 10:
            return jsonify({'message': 'Please enter a valid 10-digit mobile number.'}), 400
        otp = _make_otp()
        _store_otp(f'phone:{digits}', otp)
        # In production: send via Twilio/MSG91 here.
        print(f'[DEV] Phone OTP for {digits}: {otp}')
        return jsonify({'message': f'OTP sent to {digits}', 'dev_otp': otp}), 200

    return jsonify({'message': 'Invalid OTP type. Must be email or phone.'}), 400


@auth_bp.route('/verify-otp', methods=['POST'])
@rate_limit(max_calls=10, window_seconds=60)
def verify_otp():
    data = request.get_json() or {}
    otp_type = data.get('type')
    value = (data.get('value') or '').strip()
    submitted = (data.get('otp') or '').strip()

    if not submitted:
        return jsonify({'message': 'OTP is required.'}), 400

    if otp_type == 'email':
        key = f'email:{value.lower()}'
    elif otp_type == 'phone':
        key = f'phone:{re.sub(r"\\D", "", value)}'
    else:
        return jsonify({'message': 'Invalid OTP type.'}), 400

    success, error = _verify_otp(key, submitted)
    if success:
        return jsonify({'message': 'Verified successfully.', 'verified': True}), 200
    return jsonify({'message': error, 'verified': False}), 400


# ── Password validation ─────────────────────────────────────────────────────

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 64

def _validate_password(password: str) -> str | None:
    """
    Returns an error message string if password is invalid, otherwise None.
    Rules:
      - Minimum 8 characters
      - Maximum 64 characters
      - At least one uppercase letter
      - At least one lowercase letter
      - At least one digit
      - At least one special character
    """
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        return f'Password must be at least {MIN_PASSWORD_LENGTH} characters long.'
    if len(password) > MAX_PASSWORD_LENGTH:
        return f'Password must be at most {MAX_PASSWORD_LENGTH} characters long.'
    if not re.search(r'[A-Z]', password):
        return 'Password must contain at least one uppercase letter.'
    if not re.search(r'[a-z]', password):
        return 'Password must contain at least one lowercase letter.'
    if not re.search(r'\d', password):
        return 'Password must contain at least one number.'
    if not re.search(r'[^A-Za-z0-9]', password):
        return 'Password must contain at least one special character (e.g. @, #, !).'
    return None



# ── Routes ──────────────────────────────────────────────────────────────────

@auth_bp.route('/signup', methods=['POST'])
@rate_limit(max_calls=5, window_seconds=60)   # SEC-7: max 5 signups/min per IP
def signup():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('first_name') or not data.get('last_name'):
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
        return jsonify({'message': 'An account with this email already exists. Please Sign In.'}), 400

    # Check for duplicate mobile number (only if phone is provided)
    phone = data.get('phone', '').strip()
    if phone:
        existing_phone_user = User.query.filter_by(phone=phone).first()
        if existing_phone_user:
            return jsonify({'message': 'An account with this mobile number already exists. Please Sign In.'}), 400

    new_user = User(
        name=f"{data['first_name'].strip()} {data['last_name'].strip()}",
        first_name=data['first_name'].strip(),
        last_name=data['last_name'].strip(),
        phone=data.get('phone', '').strip(),
        email=email
    )
    new_user.set_password(data['password'])

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201


DEFAULT_CATEGORIES_BY_TYPE = {
    'Grocery Store': ['Dairy', 'Beverages', 'Snacks', 'Food', 'Household'],
    'Electrical Store': ['Bulbs', 'Fans', 'Wires', 'Switches', 'Tools'],
    'Mobile Shop': ['Smartphones', 'Android Phones', 'iPhones', 'Chargers', 'Earphones', 'Smart Watches'],
    'Medical Store': ['Tablets', 'Syrups', 'First Aid', 'Personal Care'],
    'Hardware Store': ['Tools', 'Fasteners', 'Plumbing', 'Electrical', 'Paint'],
    'Cosmetics Store': ['Makeup', 'Skincare', 'Haircare', 'Fragrance', 'Tools'],
    'Garment Store': ["Men's Wear", "Women's Wear", "Kids' Wear", 'Accessories', 'Footwear'],
    'Other': ['General']
}

@auth_bp.route('/business-setup', methods=['POST'])
@jwt_required()
def business_setup():
    import traceback
    try:
        current_user_id = get_jwt_identity()
        user = db.session.get(User, int(current_user_id))
        if not user:
            return jsonify({'message': 'User not found'}), 404

        data = request.get_json()
        if not data or not data.get('store_name') or not data.get('store_type'):
            return jsonify({'message': 'Missing store name or store type'}), 400

        user.shop_name = data['store_name'].strip()
        user.store_address = data.get('store_address', '').strip()
        user.gst_number = data.get('gst_number', '').strip()
        user.store_type = data['store_type'].strip()
        user.business_setup_completed = True
        user.is_setup_completed = True

        # Initialize the POS Counter categories and products dynamically based on store_type
        from utils.pos_initializer import initialize_pos_for_business
        initialize_pos_for_business(user.store_type, user_id=user.id)

        db.session.commit()

        return jsonify({
            'message': 'Business setup completed successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500


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

    # Auto-align setup and categories for existing legacy users
    from models import Category
    has_categories = Category.query.filter_by(user_id=user.id).count() > 0
    if user.store_type and not has_categories:
        # User has a selected store type but no isolated categories.
        # Run pos_initializer to generate them correctly for this user.
        from utils.pos_initializer import initialize_pos_for_business
        initialize_pos_for_business(user.store_type, user_id=user.id)
        db.session.commit()
    
    # Ensure setup flags are correct
    if user.shop_name and user.store_type:
        if not user.business_setup_completed:
            user.business_setup_completed = True
            user.is_setup_completed = True
            db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id))  # Use non-deprecated session.get()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Auto-align setup completed status for existing users (Additional Check)
    from models import Category
    has_categories = Category.query.count() > 0
    if user.shop_name and user.store_type and has_categories:
        if not user.business_setup_completed:
            user.business_setup_completed = True
            user.is_setup_completed = True
            db.session.commit()

    return jsonify(user.to_dict()), 200


# ── Forgot Password Routes ───────────────────────────────────────────────────

@auth_bp.route('/forgot-password/send-otp', methods=['POST'])
@rate_limit(max_calls=5, window_seconds=60)
def forgot_password_send_otp():
    data = request.get_json() or {}
    otp_type = data.get('type')  # 'email' or 'phone'
    value = (data.get('value') or '').strip()

    if not otp_type or otp_type not in ['email', 'phone']:
        return jsonify({'message': 'Invalid verification method.'}), 400

    if otp_type == 'email':
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', value):
            return jsonify({'message': 'Please enter a valid email address.'}), 400
        user = User.query.filter_by(email=value.lower()).first()
        key = f'forgot:email:{value.lower()}'
    else:
        digits = re.sub(r'\D', '', value)
        if len(digits) != 10:
            return jsonify({'message': 'Please enter a valid 10-digit Indian mobile number.'}), 400
        user = User.query.filter_by(phone=digits).first()
        key = f'forgot:phone:{digits}'

    # Silent matching: always return the same generic message to the client
    # but only store/send OTP in the background if the user exists.
    if user:
        otp = _make_otp()
        # Expiration is 5 minutes (300 seconds)
        _OTP_STORE[key] = {'otp': otp, 'expires_at': time.time() + 300}
        print(f'[DEV] Forgot Password OTP for {value}: {otp}')
        return jsonify({
            'message': 'If this account exists, an OTP has been sent.',
            'dev_otp': otp
        }), 200
    else:
        # User not found: do not send OTP, do not include dev_otp, but return success
        return jsonify({
            'message': 'If this account exists, an OTP has been sent.'
        }), 200


@auth_bp.route('/forgot-password/verify-otp', methods=['POST'])
@rate_limit(max_calls=10, window_seconds=60)
def forgot_password_verify_otp():
    data = request.get_json() or {}
    otp_type = data.get('type')
    value = (data.get('value') or '').strip()
    submitted = (data.get('otp') or '').strip()

    if not submitted:
        return jsonify({'message': 'OTP is required.'}), 400

    if otp_type == 'email':
        key = f'forgot:email:{value.lower()}'
    elif otp_type == 'phone':
        key = f'forgot:phone:{re.sub(r"\D", "", value)}'
    else:
        return jsonify({'message': 'Invalid verification method.'}), 400

    record = _OTP_STORE.get(key)
    if not record:
        return jsonify({'message': 'No OTP found. Please request a new OTP.', 'verified': False}), 400
    if time.time() > record['expires_at']:
        _OTP_STORE.pop(key, None)
        return jsonify({'message': 'OTP has expired. Please request a new OTP.', 'verified': False}), 400
    if record['otp'] != submitted.strip():
        return jsonify({'message': 'Incorrect OTP. Please try again.', 'verified': False}), 400

    # Verification successful (do not consume yet so it can be re-verified on password reset submit)
    return jsonify({'message': 'Verified successfully.', 'verified': True}), 200


@auth_bp.route('/forgot-password/reset', methods=['POST'])
@rate_limit(max_calls=5, window_seconds=60)
def forgot_password_reset():
    data = request.get_json() or {}
    otp_type = data.get('type')
    value = (data.get('value') or '').strip()
    otp = (data.get('otp') or '').strip()
    password = data.get('password')

    if not password:
        return jsonify({'message': 'Password is required.'}), 400

    err_msg = _validate_password(password)
    if err_msg:
        return jsonify({'message': err_msg}), 400

    if otp_type == 'email':
        key = f'forgot:email:{value.lower()}'
        user = User.query.filter_by(email=value.lower()).first()
    elif otp_type == 'phone':
        key = f'forgot:phone:{re.sub(r"\D", "", value)}'
        user = User.query.filter_by(phone=re.sub(r"\D", "", value)).first()
    else:
        return jsonify({'message': 'Invalid verification method.'}), 400

    # Final check of OTP & consume it
    success, error = _verify_otp(key, otp)
    if not success:
        return jsonify({'message': error}), 400

    if not user:
        # This shouldn't normally happen since we wouldn't have gotten an OTP
        return jsonify({'message': 'User account not found.'}), 404

    user.set_password(password)
    db.session.commit()
    return jsonify({'message': 'Password updated successfully!'}), 200
