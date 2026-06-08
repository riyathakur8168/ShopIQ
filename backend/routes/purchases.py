import re
from flask import Blueprint, request, jsonify
from extensions import db
from models import Supplier, Product, Category
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone

purchases_bp = Blueprint('purchases', __name__, url_prefix='/api/v1/purchases')

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


def validate_supplier_data(data):
    name = data.get('name', '').strip()
    business_name = data.get('business_name', '').strip()
    phone = _normalize_indian_phone(data.get('phone', ''))
    email = data.get('email', '').strip()

    if not name:
        return 'Supplier Name is required.'
    if len(name) < 2 or len(name) > 50:
        return 'Supplier Name must be between 2 and 50 characters.'
    if not re.match(r'^[a-zA-Z\s]+$', name):
        return 'Supplier Name can only contain letters and spaces.'
    if name.isspace() or not name.replace(' ', ''):
        return 'Supplier Name cannot contain only spaces.'

    if not business_name:
        return 'Business Name is required.'
    if len(business_name) < 2 or len(business_name) > 100:
        return 'Business Name must be between 2 and 100 characters.'

    if not phone:
        return 'Phone Number is required.'
    if not re.match(r'^[6-9]\d{9}$', phone):
        return 'Please enter a valid 10-digit Indian mobile number.'

    if not email:
        return 'Email Address is required.'
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return 'Please enter a valid email address.'

    return None

def _uid():
    return int(get_jwt_identity())

@purchases_bp.route('/quick-supplier', methods=['POST'])
@jwt_required()
def quick_supplier():
    uid = _uid()
    data = request.get_json() or {}
    
    val_err = validate_supplier_data(data)
    if val_err:
        return jsonify({'message': val_err}), 400

    name = data.get('name', '').strip()
    business_name = data.get('business_name', '').strip() or name
    phone = _normalize_indian_phone(data.get('phone', ''))
    email = data.get('email', '').strip()
        
    # Check if a supplier with the same business_name already exists for this user
    existing = Supplier.query.filter_by(user_id=uid, business_name=business_name).first()
    if existing:
        return jsonify({'message': f'Supplier "{business_name}" is already registered.'}), 400
        
    try:
        new_sup = Supplier(
            name=name,
            business_name=business_name,
            phone=phone,
            email=email,
            user_id=uid
        )
        db.session.add(new_sup)
        db.session.commit()
        return jsonify(new_sup.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create supplier: {str(e)}'}), 500

@purchases_bp.route('/quick-product', methods=['POST'])
@jwt_required()
def quick_product():
    uid = _uid()
    data = request.get_json() or {}
    
    name = data.get('name', '').strip()
    company_name = data.get('company_name', '').strip()
    category_name = data.get('category', '').strip() or 'General'
    
    if not name:
        return jsonify({'message': 'Product Name is required.'}), 400
    if not company_name:
        return jsonify({'message': 'Company / Brand Name is required.'}), 400
        
    # Ensure category exists in db (global or user-specific category)
    cat_rel = Category.query.filter_by(user_id=uid, name=category_name).first()
    if not cat_rel:
        cat_rel = Category.query.filter_by(user_id=None, name=category_name).first()
    if not cat_rel:
        try:
            cat_rel = Category(name=category_name, user_id=uid)
            db.session.add(cat_rel)
            db.session.commit()
        except Exception:
            db.session.rollback()
            cat_rel = None

    category_id = cat_rel.id if cat_rel else None
    
    # Check if product already exists for this user (name + company)
    existing = Product.query.filter_by(user_id=uid, name=name, company_name=company_name).first()
    if existing:
        return jsonify({'message': f'Product "{name}" by "{company_name}" already exists.'}), 400
        
    try:
        new_prod = Product(
            name=name,
            category=category_name,
            category_id=category_id,
            buy_price=0.0,
            sell_price=0.0,
            stock_quantity=0,
            low_stock_threshold=10,
            user_id=uid,
            company_name=company_name
        )
        db.session.add(new_prod)
        db.session.commit()
        return jsonify(new_prod.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create product: {str(e)}'}), 500
