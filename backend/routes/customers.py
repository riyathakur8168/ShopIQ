from flask import Blueprint, request, jsonify
from extensions import db
from models import Customer, CreditRecord
from flask_jwt_extended import jwt_required
from datetime import datetime, date

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

@customers_bp.route('/', methods=['GET'])
@jwt_required()
def get_customers():
    search = request.args.get('search', '')
    query = Customer.query
    if search:
        query = query.filter(Customer.name.ilike(f'%{search}%'))
    customers = query.order_by(Customer.created_at.desc()).all()
    return jsonify([c.to_dict() for c in customers]), 200


@customers_bp.route('/', methods=['POST'])
@jwt_required()
def add_customer():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Name is required'}), 400
    customer = Customer(
        name=data['name'],
        phone=data.get('phone', ''),
        address=data.get('address', '')
    )
    db.session.add(customer)
    db.session.commit()
    return jsonify({'message': 'Customer added', 'customer': customer.to_dict()}), 201


@customers_bp.route('/<int:customer_id>', methods=['GET'])
@jwt_required()
def get_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    records = CreditRecord.query.filter_by(customer_id=customer_id).order_by(CreditRecord.date.desc()).all()
    data = customer.to_dict()
    data['history'] = [r.to_dict() for r in records]
    return jsonify(data), 200


@customers_bp.route('/<int:customer_id>', methods=['PUT'])
@jwt_required()
def update_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json()
    customer.name = data.get('name', customer.name)
    customer.phone = data.get('phone', customer.phone)
    customer.address = data.get('address', customer.address)
    db.session.commit()
    return jsonify({'message': 'Customer updated', 'customer': customer.to_dict()}), 200


@customers_bp.route('/<int:customer_id>', methods=['DELETE'])
@jwt_required()
def delete_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    db.session.delete(customer)
    db.session.commit()
    return jsonify({'message': 'Customer deleted'}), 200


@customers_bp.route('/<int:customer_id>/credit', methods=['POST'])
@jwt_required()
def add_credit(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json()
    if not data or not data.get('amount'):
        return jsonify({'message': 'Amount is required'}), 400
    amount = float(data['amount'])
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
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json()
    if not data or not data.get('amount'):
        return jsonify({'message': 'Amount is required'}), 400
    amount = float(data['amount'])
    if amount > customer.balance:
        return jsonify({'message': f'Payment exceeds balance of ₹{customer.balance}'}), 400
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
