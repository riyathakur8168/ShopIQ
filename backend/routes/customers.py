from flask import Blueprint, request, jsonify
from extensions import db
from models import Customer, CreditRecord
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')


def _current_user_id():
    """Return the integer user ID from the JWT token."""
    return int(get_jwt_identity())


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
        query = query.filter(Customer.name.ilike(f'%{safe_search}%', escape='\\'))
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


@customers_bp.route('/', methods=['POST'])
@jwt_required()
def add_customer():
    uid = _current_user_id()
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Name is required'}), 400
    customer = Customer(
        name=data['name'],
        phone=data.get('phone', ''),
        address=data.get('address', ''),
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

    # Build history with running balance
    records = CreditRecord.query.filter_by(customer_id=customer_id).order_by(CreditRecord.date.asc(), CreditRecord.created_at.asc()).all()

    running_balance = 0.0
    history = []
    for r in records:
        if r.record_type == 'credit':
            running_balance += r.amount
        else:
            running_balance -= r.amount
        entry = r.to_dict()
        entry['running_balance'] = round(running_balance, 2)
        history.append(entry)

    data = customer.to_dict()
    # Return history in reverse-chronological order for display
    data['history'] = list(reversed(history))
    return jsonify(data), 200


@customers_bp.route('/<int:customer_id>', methods=['PUT'])
@jwt_required()
def update_customer(customer_id):
    uid = _current_user_id()
    customer = Customer.query.filter_by(id=customer_id, user_id=uid).first_or_404()
    data = request.get_json()
    customer.name = data.get('name', customer.name)
    customer.phone = data.get('phone', customer.phone)
    customer.address = data.get('address', customer.address)
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
        date=datetime.strptime(data.get('date', date.today().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
    )
    customer.total_credit += amount
    db.session.add(record)
    db.session.commit()
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
    customer.total_paid += amount
    db.session.add(record)
    db.session.commit()
    return jsonify({'message': 'Payment recorded', 'customer': customer.to_dict()}), 201
