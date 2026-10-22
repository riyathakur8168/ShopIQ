import re
from flask import Blueprint, request, jsonify
from extensions import db
from models import Customer, CreditRecord
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')


def _current_user_id():
    """Return the integer user ID from the JWT token."""
    return int(get_jwt_identity())


def _normalize_indian_phone(phone_str):
    """Normalize phone number to 10 digits (handling +91, 91, or leading 0)."""
    if not phone_str:
        return ''
    digits = re.sub(r'\D', '', str(phone_str))
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    return digits


@customers_bp.route('/', methods=['GET'])
@jwt_required()
def get_customers():
    uid = _current_user_id()
    search = request.args.get('search', '')
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int)

    # Only return this user's customers
    query = Customer.query.filter_by(user_id=uid)
    if search:
        safe_search = search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        query = query.filter(
            (Customer.name.ilike(f'%{safe_search}%', escape='\\')) |
            (Customer.first_name.ilike(f'%{safe_search}%', escape='\\')) |
            (Customer.last_name.ilike(f'%{safe_search}%', escape='\\')) |
            (Customer.phone.ilike(f'%{safe_search}%', escape='\\'))
        )
    query = query.order_by(Customer.created_at.desc())

    if page and per_page:
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        return jsonify({
            'items': [c.to_dict() for c in paginated.items],
            'total': paginated.total,
            'pages': paginated.pages
        }), 200

    customers = query.limit(1000).all()
    return jsonify([c.to_dict() for c in customers]), 200


@customers_bp.route('/check-phone', methods=['GET'])
@jwt_required()
def check_phone():
    uid = _current_user_id()
    phone = request.args.get('phone', '').strip()
    exclude_id = request.args.get('exclude_id', type=int)
    if not phone:
        return jsonify({'exists': False}), 200
    phone_digits = _normalize_indian_phone(phone)
    query = Customer.query.filter_by(phone=phone_digits, user_id=uid)
    if exclude_id:
        query = query.filter(Customer.id != exclude_id)
    exists = query.first() is not None
    return jsonify({'exists': exists}), 200


def _validate_and_format_customer(data, uid, exclude_id=None):
    if not data:
        return None, None, None, "No data provided."

    raw_first = data.get('first_name', '')
    raw_last = data.get('last_name', '')
    raw_phone = data.get('phone', '')

    # Fallback to single name field if needed
    if not raw_first and data.get('name'):
        parts = str(data.get('name')).strip().split(None, 1)
        raw_first = parts[0]
        raw_last = parts[1] if len(parts) > 1 else ''

    # 1. First Name Validation
    first_name_str = str(raw_first).strip()
    if not first_name_str:
        return None, None, None, "First Name is required."
    
    # Capitalize first letter, others lowercase
    cleaned_first = first_name_str.capitalize()
    if len(cleaned_first) < 2 or len(cleaned_first) > 30 or not re.match(r'^[A-Za-z]+$', cleaned_first):
        return None, None, None, "Please enter a valid first name using letters only."

    # 2. Last Name Validation
    last_name_str = str(raw_last).strip()
    cleaned_last = ""
    if last_name_str:
        cleaned_last = last_name_str.capitalize()
        if len(cleaned_last) < 2 or len(cleaned_last) > 30 or not re.match(r'^[A-Za-z]+$', cleaned_last):
            return None, None, None, "Please enter a valid last name using letters only."

    # 3. Phone validation
    if not raw_phone or not str(raw_phone).strip():
        return None, None, None, "Mobile Number is required."
        
    phone_digits = _normalize_indian_phone(raw_phone)
    if not phone_digits or not phone_digits[0] in '6789':
        first_char = phone_digits[0] if phone_digits else ''
        return None, None, None, f"Invalid mobile number: Indian mobile numbers cannot start with '{first_char}'. Must start with 6, 7, 8, or 9." if first_char else "Please enter a valid 10-digit Indian mobile number."
    if len(phone_digits) != 10:
        return None, None, None, "Please enter a valid 10-digit Indian mobile number."

    # 4. Duplicate mobile number check
    duplicate_query = Customer.query.filter_by(phone=phone_digits, user_id=uid)
    if exclude_id:
        duplicate_query = duplicate_query.filter(Customer.id != exclude_id)
    if duplicate_query.first():
        return None, None, None, "A customer with this mobile number already exists."

    return cleaned_first, cleaned_last, phone_digits, None


@customers_bp.route('/', methods=['POST'])
@jwt_required()
def add_customer():
    uid = _current_user_id()
    data = request.get_json()
    
    first_name, last_name, phone, error = _validate_and_format_customer(data, uid)
    if error:
        return jsonify({'message': error}), 400

    fullname = f"{first_name} {last_name}".strip()
    customer = Customer(
        name=fullname,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        address=data.get('address', '').strip(),
        user_id=uid
    )
    db.session.add(customer)
    db.session.commit()
    return jsonify({'message': 'Customer added', 'customer': customer.to_dict()}), 201


@customers_bp.route('/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_customer(customer_id):
    uid = _current_user_id()
    customer = Customer.query.filter_by(id=customer_id, user_id=uid).first_or_404()
    records = CreditRecord.query.filter_by(customer_id=customer_id).order_by(CreditRecord.date.asc(), CreditRecord.created_at.asc()).all()
    
    history = []
    running_balance = 0
    for r in records:
        if r.record_type == 'credit':
            running_balance += r.amount
        else:
            running_balance -= r.amount
        d = r.to_dict()
        d['running_balance'] = running_balance
        history.append(d)
        
    history.reverse()
    data = customer.to_dict()
    data['history'] = history
    return jsonify(data), 200


@customers_bp.route('/<int:customer_id>', methods=['PUT'])
@jwt_required()
def update_customer(customer_id):
    uid = _current_user_id()
    customer = Customer.query.filter_by(id=customer_id, user_id=uid).first_or_404()
    data = request.get_json()

    first_name, last_name, phone, error = _validate_and_format_customer(data, uid, exclude_id=customer_id)
    if error:
        return jsonify({'message': error}), 400

    customer.name = f"{first_name} {last_name}".strip()
    customer.first_name = first_name
    customer.last_name = last_name
    customer.phone = phone
    customer.address = data.get('address', '').strip()
    db.session.commit()
    return jsonify({'message': 'Customer updated', 'customer': customer.to_dict()}), 200


@customers_bp.route('/<int:customer_id>', methods=['DELETE'])
@jwt_required()
def delete_customer(customer_id):
    uid = _current_user_id()
    customer = Customer.query.filter_by(id=customer_id, user_id=uid).first_or_404()
    db.session.delete(customer)
    db.session.commit()
    return jsonify({'message': 'Customer deleted'}), 200


def _recalculate_balances(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer: return
    credit = db.session.query(db.func.coalesce(db.func.sum(CreditRecord.amount), 0)).filter_by(customer_id=customer_id, record_type='credit').scalar()
    paid = db.session.query(db.func.coalesce(db.func.sum(CreditRecord.amount), 0)).filter_by(customer_id=customer_id, record_type='payment').scalar()
    customer.total_credit = float(credit)
    customer.total_paid = float(paid)
    db.session.commit()
    return customer


@customers_bp.route('/<int:customer_id>/credit', methods=['POST'])
@jwt_required()
def add_credit(customer_id):
    uid = _current_user_id()
    customer = Customer.query.filter_by(id=customer_id, user_id=uid).first_or_404()
    data = request.get_json()
    if not data or not data.get('amount'):
        return jsonify({'message': 'Amount is required'}), 400
    amount = float(data['amount'])
    if amount <= 0:
        return jsonify({'message': 'Amount must be greater than zero'}), 400

    record = CreditRecord(
        customer_id=customer_id,
        record_type='credit',
        amount=amount,
        note=data.get('note', ''),
        products_purchased=data.get('products_purchased', ''),
        quantity=data.get('quantity') if data.get('quantity') else None,
        bill_amount=data.get('bill_amount') if data.get('bill_amount') else None,
        bill_number=data.get('bill_number') if data.get('bill_number') else None,
        date=datetime.strptime(data.get('date', date.today().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
    )
    db.session.add(record)
    db.session.commit()
    
    # Recalculate balances cumulatively from transaction history
    customer = _recalculate_balances(customer_id)
    return jsonify({'message': 'Credit added', 'customer': customer.to_dict()}), 201


@customers_bp.route('/<int:customer_id>/payment', methods=['POST'])
@jwt_required()
def record_payment(customer_id):
    uid = _current_user_id()
    customer = Customer.query.filter_by(id=customer_id, user_id=uid).first_or_404()
    data = request.get_json()
    if not data or not data.get('amount'):
        return jsonify({'message': 'Amount is required'}), 400
    amount = float(data['amount'])
    if amount <= 0:
        return jsonify({'message': 'Amount must be greater than zero'}), 400
    if amount > customer.balance:
        return jsonify({'message': f'Payment exceeds outstanding balance of ₹{customer.balance:.2f}'}), 400

    record = CreditRecord(
        customer_id=customer_id,
        record_type='payment',
        amount=amount,
        note=data.get('note', ''),
        date=datetime.strptime(data.get('date', date.today().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
    )
    db.session.add(record)
    db.session.commit()
    
    # Recalculate balances cumulatively from transaction history
    customer = _recalculate_balances(customer_id)
    return jsonify({'message': 'Payment recorded', 'customer': customer.to_dict()}), 201
