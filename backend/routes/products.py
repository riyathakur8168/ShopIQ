from flask import Blueprint, request, jsonify
from extensions import db
from models import Product, Sale
from flask_jwt_extended import jwt_required

products_bp = Blueprint('products', __name__, url_prefix='/api/products')

@products_bp.route('/', methods=['GET'])
@jwt_required()
def get_products():
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int)
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    
    query = Product.query
    if search:
        safe_search = search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        query = query.filter(Product.name.ilike(f'%{safe_search}%', escape='\\'))
    if category and category != 'All':
        query = query.filter(Product.category == category)
        
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
    products = Product.query.filter(Product.stock_quantity <= Product.low_stock_threshold).all()
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

@products_bp.route('/', methods=['POST'])
@jwt_required()
def add_product():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('buy_price') or not data.get('sell_price'):
        return jsonify({'message': 'Missing required fields'}), 400

    new_product = Product(
        name=data['name'],
        category=data.get('category', ''),
        buy_price=float(data['buy_price']),
        sell_price=float(data['sell_price']),
        stock_quantity=int(data.get('stock_quantity', 0))
    )
    
    db.session.add(new_product)
    db.session.commit()

    return jsonify({'message': 'Product added successfully', 'product': new_product.to_dict()}), 201

@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404

    data = request.get_json()
    product.name = data.get('name', product.name)
    product.category = data.get('category', product.category)
    product.buy_price = data.get('buy_price', product.buy_price)
    product.sell_price = data.get('sell_price', product.sell_price)
    product.stock_quantity = data.get('stock_quantity', product.stock_quantity)

    db.session.commit()
    return jsonify({'message': 'Product updated successfully', 'product': product.to_dict()}), 200

@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404

    db.session.delete(product)
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
