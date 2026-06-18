from flask import Blueprint, request, jsonify
from extensions import db
from models import Invoice, Product
from flask_jwt_extended import jwt_required
from datetime import datetime, date
import json

invoices_bp = Blueprint('invoices', __name__, url_prefix='/api/invoices')

@invoices_bp.route('/', methods=['GET'])
@jwt_required()
def get_invoices():
    invoices = Invoice.query.order_by(Invoice.created_at.desc()).limit(50).all()
    return jsonify([i.to_dict() for i in invoices]), 200


@invoices_bp.route('/', methods=['POST'])
@jwt_required()
def create_invoice():
    data = request.get_json()
    if not data or not data.get('customer_name') or not data.get('items'):
        return jsonify({'message': 'Missing required fields'}), 400

    items = data['items']
    total = sum(float(item.get('qty', 1)) * float(item.get('price', 0)) for item in items)

    invoice = Invoice(
        customer_name=data['customer_name'],
        items_json=json.dumps(items),
        total_amount=total,
        invoice_date=datetime.strptime(data.get('date', date.today().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
    )
    db.session.add(invoice)
    db.session.commit()
    return jsonify({'message': 'Invoice created', 'invoice': invoice.to_dict()}), 201


@invoices_bp.route('/<int:invoice_id>', methods=['GET'])
@jwt_required()
def get_invoice(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    return jsonify(invoice.to_dict()), 200
