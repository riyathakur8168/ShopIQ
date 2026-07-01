from flask import Blueprint, request, jsonify
from extensions import db
from models import Supplier, SupplierRecord, Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
import json

suppliers_bp = Blueprint('suppliers', __name__, url_prefix='/api/suppliers')


def _uid():
    return int(get_jwt_identity())


@suppliers_bp.route('/', methods=['GET'])
@jwt_required()
def get_suppliers():
    uid = _uid()
    search = request.args.get('search', '')
    status_filter = request.args.get('status', '') # 'Active', 'Inactive', or empty (All)
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int)

    query = Supplier.query.filter_by(user_id=uid)
    
    if search:
        safe_search = search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        query = query.filter(
            Supplier.name.ilike(f'%{safe_search}%', escape='\\') |
            Supplier.business_name.ilike(f'%{safe_search}%', escape='\\') |
            Supplier.phone.ilike(f'%{safe_search}%', escape='\\') |
            Supplier.product_category.ilike(f'%{safe_search}%', escape='\\')
        )

    if status_filter:
        query = query.filter_by(status=status_filter)

    query = query.order_by(Supplier.created_at.desc())

    if page and per_page:
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        return jsonify({
            'items': [s.to_dict() for s in paginated.items],
            'total': paginated.total,
            'pages': paginated.pages
        }), 200

    suppliers = query.limit(1000).all()
    return jsonify([s.to_dict() for s in suppliers]), 200


@suppliers_bp.route('/', methods=['POST'])
@jwt_required()
def add_supplier():
    uid = _uid()
    data = request.get_json()
    if not data or not data.get('name') or not data.get('business_name'):
        return jsonify({'message': 'Supplier Name and Business Name are required'}), 400

    supplier = Supplier(
        name=data['name'].strip(),
        business_name=data['business_name'].strip(),
        contact_person=data.get('contact_person', '').strip(),
        phone=data.get('phone', '').strip(),
        email=data.get('email', '').strip(),
        gst_number=data.get('gst_number', '').strip(),
        address=data.get('address', '').strip(),
        city=data.get('city', '').strip(),
        state=data.get('state', '').strip(),
        pincode=data.get('pincode', '').strip(),
        product_category=data.get('product_category', '').strip(),
        notes=data.get('notes', '').strip(),
        status=data.get('status', 'Active'),
        user_id=uid
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify({'message': 'Supplier added successfully', 'supplier': supplier.to_dict()}), 201


@suppliers_bp.route('/<int:supplier_id>', methods=['GET'])
@jwt_required()
def get_supplier(supplier_id):
    uid = _uid()
    supplier = Supplier.query.filter_by(id=supplier_id, user_id=uid).first_or_404()
    records = SupplierRecord.query.filter_by(supplier_id=supplier_id).order_by(SupplierRecord.date.asc(), SupplierRecord.created_at.asc()).all()

    history = []
    running_balance = 0.0
    for r in records:
        if r.record_type == 'purchase':
            running_balance += r.amount
        else:
            running_balance -= r.amount
        
        d = r.to_dict()
        d['running_balance'] = running_balance
        history.append(d)

    # Newest entries first on the timeline
    history.reverse()
    
    data = supplier.to_dict()
    data['history'] = history
    return jsonify(data), 200


@suppliers_bp.route('/<int:supplier_id>', methods=['PUT'])
@jwt_required()
def update_supplier(supplier_id):
    uid = _uid()
    supplier = Supplier.query.filter_by(id=supplier_id, user_id=uid).first_or_404()
    data = request.get_json()

    supplier.name = data.get('name', supplier.name).strip()
    supplier.business_name = data.get('business_name', supplier.business_name).strip()
    supplier.contact_person = data.get('contact_person', supplier.contact_person).strip()
    supplier.phone = data.get('phone', supplier.phone).strip()
    supplier.email = data.get('email', supplier.email).strip()
    supplier.gst_number = data.get('gst_number', supplier.gst_number).strip()
    supplier.address = data.get('address', supplier.address).strip()
    supplier.city = data.get('city', supplier.city).strip()
    supplier.state = data.get('state', supplier.state).strip()
    supplier.pincode = data.get('pincode', supplier.pincode).strip()
    supplier.product_category = data.get('product_category', supplier.product_category).strip()
    supplier.notes = data.get('notes', supplier.notes).strip()
    supplier.status = data.get('status', supplier.status).strip()

    db.session.commit()
    return jsonify({'message': 'Supplier updated successfully', 'supplier': supplier.to_dict()}), 200


@suppliers_bp.route('/<int:supplier_id>', methods=['DELETE'])
@jwt_required()
def delete_supplier(supplier_id):
    uid = _uid()
    supplier = Supplier.query.filter_by(id=supplier_id, user_id=uid).first_or_404()
    db.session.delete(supplier)
    db.session.commit()
    return jsonify({'message': 'Supplier deleted successfully'}), 200


def _recalculate_balances(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        return
    purchase = db.session.query(db.func.coalesce(db.func.sum(SupplierRecord.amount), 0)).filter_by(supplier_id=supplier_id, record_type='purchase').scalar()
    paid = db.session.query(db.func.coalesce(db.func.sum(SupplierRecord.amount), 0)).filter_by(supplier_id=supplier_id, record_type='payment').scalar()
    supplier.total_purchase = float(purchase)
    supplier.total_paid = float(paid)
    db.session.commit()
    return supplier


@suppliers_bp.route('/<int:supplier_id>/purchase', methods=['POST'])
@jwt_required()
def add_purchase(supplier_id):
    uid = _uid()
    supplier = Supplier.query.filter_by(id=supplier_id, user_id=uid).first_or_404()
    data = request.get_json()

    if not data or not data.get('amount'):
        return jsonify({'message': 'Purchase Amount is required'}), 400

    amount = float(data['amount'])
    if amount <= 0:
        return jsonify({'message': 'Amount must be greater than zero'}), 400

    # Parse products_purchased JSON or list
    products_purchased = data.get('products_purchased', '')
    quantity = data.get('quantity')
    if not quantity and products_purchased:
        try:
            items = json.loads(products_purchased) if isinstance(products_purchased, str) else products_purchased
            quantity = sum(int(item.get('quantity', 0)) for item in items)
        except Exception:
            quantity = None

    # Handle automatically updating inventory stock
    if products_purchased:
        try:
            items = json.loads(products_purchased) if isinstance(products_purchased, str) else products_purchased
            if isinstance(items, list):
                for item in items:
                    p_id = item.get('id')
                    qty = int(item.get('quantity', 0))
                    unit_cost = float(item.get('unit_cost', 0))
                    
                    if p_id:
                        product = Product.query.filter_by(id=p_id, user_id=uid).first()
                        if product:
                            product.stock_quantity += qty
                            if unit_cost > 0:
                                product.buy_price = unit_cost
        except Exception as e:
            # We can log or handle gracefully. Let's make sure it doesn't fail the whole transaction unless critical.
            print(f"Error updating inventory from supplier purchase: {e}")

    record = SupplierRecord(
        supplier_id=supplier_id,
        record_type='purchase',
        amount=amount,
        note=data.get('note', ''),
        products_purchased=json.dumps(products_purchased) if not isinstance(products_purchased, str) else products_purchased,
        quantity=quantity,
        invoice_number=data.get('invoice_number', ''),
        date=datetime.strptime(data.get('date', date.today().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
    )
    
    db.session.add(record)
    db.session.commit()

    supplier = _recalculate_balances(supplier_id)
    return jsonify({'message': 'Purchase added and inventory updated successfully', 'supplier': supplier.to_dict()}), 201


@suppliers_bp.route('/<int:supplier_id>/payment', methods=['POST'])
@jwt_required()
def record_payment(supplier_id):
    uid = _uid()
    supplier = Supplier.query.filter_by(id=supplier_id, user_id=uid).first_or_404()
    data = request.get_json()

    if not data or not data.get('amount'):
        return jsonify({'message': 'Payment Amount is required'}), 400

    amount = float(data['amount'])
    if amount <= 0:
        return jsonify({'message': 'Amount must be greater than zero'}), 400

    record = SupplierRecord(
        supplier_id=supplier_id,
        record_type='payment',
        amount=amount,
        note=data.get('note', ''),
        date=datetime.strptime(data.get('date', date.today().strftime('%Y-%m-%d')), '%Y-%m-%d').date()
    )
    
    db.session.add(record)
    db.session.commit()

    supplier = _recalculate_balances(supplier_id)
    return jsonify({'message': 'Payment recorded successfully', 'supplier': supplier.to_dict()}), 201
