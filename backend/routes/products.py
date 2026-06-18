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
