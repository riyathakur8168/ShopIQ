from flask import Blueprint, request, jsonify
from extensions import db
from models import Product, Sale
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import sys

products_bp = Blueprint('products', __name__, url_prefix='/api/products')

def _uid():
    return int(get_jwt_identity())

@products_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    uid = _uid()
    from models import Category
    # Return categories owned by this user, ordered by name
    categories = Category.query.filter_by(user_id=uid).order_by(Category.name.asc()).all()
    return jsonify([cat.to_dict() for cat in categories]), 200

@products_bp.route('/categories', methods=['POST'])
@jwt_required()
def add_category():
    uid = _uid()
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Missing category name'}), 400

    name = data['name'].strip()
    normalized_name = name.title() if name.lower() != 'general' else 'General'

    from models import Category
    existing = Category.query.filter(
        db.func.lower(Category.name) == normalized_name.lower(),
        Category.user_id == uid
    ).first()
    if existing:
        return jsonify({'message': 'Category already exists', 'category': existing.to_dict()}), 400

    new_cat = Category(name=normalized_name, user_id=uid)
    db.session.add(new_cat)
    db.session.commit()

    return jsonify({'message': 'Category created successfully', 'category': new_cat.to_dict()}), 201

@products_bp.route('/categories/<int:category_id>', methods=['PUT'])
@jwt_required()
def rename_category(category_id):
    uid = _uid()
    from models import Category
    cat = Category.query.filter_by(id=category_id, user_id=uid).first()
    if not cat:
        return jsonify({'message': 'Category not found'}), 404

    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'message': 'Missing category name'}), 400

    new_name = data['name'].strip()
    normalized_name = new_name.title() if new_name.lower() != 'general' else 'General'

    existing = Category.query.filter(
        db.func.lower(Category.name) == normalized_name.lower(),
        Category.user_id == uid
    ).first()
    if existing and existing.id != category_id:
        return jsonify({'message': 'Another category with this name already exists'}), 400

    cat.name = normalized_name
    for p in cat.products:
        p.category = normalized_name

    db.session.commit()
    return jsonify({'message': 'Category renamed successfully', 'category': cat.to_dict()}), 200

@products_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@jwt_required()
def delete_category(category_id):
    uid = _uid()
    from models import Category
    cat = Category.query.filter_by(id=category_id, user_id=uid).first()
    if not cat:
        return jsonify({'message': 'Category not found'}), 404

    if cat.name.lower() == 'general':
        return jsonify({'message': 'Cannot delete General category'}), 400

    general_cat = Category.query.filter(
        db.func.lower(Category.name) == 'general',
        Category.user_id == uid
    ).first()
    if not general_cat:
        general_cat = Category(name='General', user_id=uid)
        db.session.add(general_cat)
        db.session.commit()

    for p in cat.products:
        p.category_id = general_cat.id
        p.category = 'General'

    db.session.delete(cat)
    db.session.commit()
    return jsonify({'message': 'Category deleted successfully'}), 200

@products_bp.route('/', methods=['GET'])
@jwt_required()
def get_products():
    uid = _uid()
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int)
    search = request.args.get('search', '')
    category = request.args.get('category', '')

    query = Product.query.filter_by(user_id=uid)
    if search:
        safe_search = search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        query = query.filter(Product.name.ilike(f'%{safe_search}%', escape='\\'))
    if category and category != 'All':
        from models import Category
        query = query.join(Category, Product.category_id == Category.id).filter(db.func.lower(Category.name) == category.lower())

    query = query.order_by(Product.id.desc())

    if page and per_page:
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        return jsonify({
            'items': [p.to_dict() for p in paginated.items],
            'total': paginated.total,
            'pages': paginated.pages
        }), 200

    products = query.limit(1000).all()
    return jsonify([product.to_dict() for product in products]), 200


@products_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    uid = _uid()
    products = Product.query.filter(
        Product.user_id == uid,
        Product.stock_quantity <= Product.low_stock_threshold
    ).all()
    notifications = []
    for p in products:
        if p.stock_quantity == 0:
            prio = 1
            status_label = "Out of Stock"
            alert_type = "out_of_stock"
            msg = f"{p.name} is completely out of stock."
        elif p.stock_quantity <= p.low_stock_threshold / 2:
            prio = 2
            status_label = "Critical Stock"
            alert_type = "critical_stock"
            msg = f"{p.name} stock is critically low."
        else:
            prio = 3
            status_label = "Low Stock"
            alert_type = "low_stock"
            msg = f"{p.name} is running low on stock."

        recommended_reorder = max(p.low_stock_threshold * 2 - p.stock_quantity, 10)
        last_sale = Sale.query.filter(Sale.product_id == p.id).order_by(Sale.sale_date.desc()).first()
        alert_time = last_sale.sale_date.strftime('%Y-%m-%d') if last_sale else p.created_at.strftime('%Y-%m-%d')

        notifications.append({
            'product_id': p.id,
            'product_name': p.name,
            'current_stock': p.stock_quantity,
            'low_stock_threshold': p.low_stock_threshold,
            'recommended_reorder': recommended_reorder,
            'priority': prio,
            'status_label': status_label,
            'alert_type': alert_type,
            'message': msg,
            'timestamp': alert_time
        })
    notifications.sort(key=lambda x: (x['priority'], x['current_stock']))
    return jsonify({
        'notifications': notifications,
        'count': len(notifications)
    }), 200

from models import Category

def _resolve_category(name, uid):
    if not name:
        name = 'General'
    normalized_name = name.strip().title() if name.strip().lower() != 'general' else 'General'
    
    cat = Category.query.filter(
        db.func.lower(Category.name) == normalized_name.lower(),
        Category.user_id == uid
    ).first()
    
    if not cat:
        cat = Category(name=normalized_name, user_id=uid)
        db.session.add(cat)
        db.session.flush()
    
    return cat.id, normalized_name

def _cleanup_category(category_id):
    if not category_id: return
    cat = Category.query.get(category_id)
    if not cat or cat.name.lower() == 'general': return
    
    count = Product.query.filter_by(category_id=category_id).count()
    if count == 0:
        db.session.delete(cat)

@products_bp.route('/', methods=['POST'])
@jwt_required()
def add_product():
    uid = _uid()
    data = request.get_json()
    if not data or not data.get('name') or not data.get('buy_price') or not data.get('sell_price'):
        return jsonify({'message': 'Missing required fields'}), 400

    cat_id, cat_name = _resolve_category(data.get('category', ''), uid)

    new_product = Product(
        name=data['name'],
        category=cat_name,
        category_id=cat_id,
        buy_price=float(data['buy_price']),
        sell_price=float(data['sell_price']),
        stock_quantity=int(data.get('stock_quantity', 0)),
        low_stock_threshold=int(data.get('low_stock_threshold', 10)),
        user_id=uid
    )

    db.session.add(new_product)
    db.session.commit()

    return jsonify({'message': 'Product added successfully', 'product': new_product.to_dict()}), 201

@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    uid = _uid()
    product = Product.query.filter_by(id=product_id, user_id=uid).first()
    if not product:
        return jsonify({'message': 'Product not found'}), 404

    data = request.get_json()
    product.name = data.get('name', product.name)
    
    old_cat_id = product.category_id
    if 'category' in data:
        cat_id, cat_name = _resolve_category(data['category'], uid)
        product.category = cat_name
        product.category_id = cat_id

    product.buy_price = data.get('buy_price', product.buy_price)
    product.sell_price = data.get('sell_price', product.sell_price)
    product.stock_quantity = data.get('stock_quantity', product.stock_quantity)
    product.low_stock_threshold = data.get('low_stock_threshold', product.low_stock_threshold)

    db.session.flush() # Ensure DB state is updated before counting
    if 'category' in data and old_cat_id and old_cat_id != product.category_id:
        _cleanup_category(old_cat_id)

    db.session.commit()
    return jsonify({'message': 'Product updated successfully', 'product': product.to_dict()}), 200


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    uid = _uid()
    product = Product.query.filter_by(id=product_id, user_id=uid).first()
    if not product:
        return jsonify({'message': 'Product not found'}), 404

    old_cat_id = product.category_id
    db.session.delete(product)
    db.session.flush() # Ensure DB state reflects deletion before counting
    _cleanup_category(old_cat_id)
    
    db.session.commit()
    return jsonify({'message': 'Product deleted successfully'}), 200

@products_bp.route('/ocr-upload', methods=['POST'])
@jwt_required()
def ocr_upload():
    if 'file' not in request.files:
        return jsonify({'message': 'No image file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected image file'}), 400

    import time
    import random

    
    # Simulate parsed products from the "bill"
    mock_items = [
        {
            'name': 'Scanned Item ' + str(random.randint(100, 999)),
            'category': 'General',
            'buy_price': random.randint(10, 50),
            'sell_price': random.randint(60, 100),
            'stock_quantity': random.randint(10, 100)
        },
        {
            'name': 'Scanned Item ' + str(random.randint(100, 999)),
            'category': 'General',
            'buy_price': random.randint(20, 40),
            'sell_price': random.randint(50, 80),
            'stock_quantity': random.randint(5, 50)
        }
    ]
    
    return jsonify({
        'message': 'Image scanned successfully',
        'extracted_items': mock_items
    }), 200
    
    
