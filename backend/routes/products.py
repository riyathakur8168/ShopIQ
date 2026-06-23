from flask import Blueprint, request, jsonify
from extensions import db
from models import Product
from flask_jwt_extended import jwt_required

products_bp = Blueprint('products', __name__, url_prefix='/api/products')

@products_bp.route('/', methods=['GET'])
@jwt_required()
def get_products():
    products = Product.query.all()
    return jsonify([product.to_dict() for product in products]), 200

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
    
    # Simulate scanning delay (2 seconds)
    time.sleep(2)
    
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
