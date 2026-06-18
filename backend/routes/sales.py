from flask import Blueprint, request, jsonify
from extensions import db
from models import Sale, Product
from flask_jwt_extended import jwt_required
from datetime import datetime, date, timedelta
from sqlalchemy import func

sales_bp = Blueprint('sales', __name__, url_prefix='/api/sales')

@sales_bp.route('/', methods=['GET'])
@jwt_required()
def get_sales():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    product_id = request.args.get('product_id', type=int)

    query = Sale.query
    if start_date:
        query = query.filter(Sale.sale_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(Sale.sale_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    if product_id:
        query = query.filter(Sale.product_id == product_id)

    sales = query.order_by(Sale.sale_date.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'sales': [s.to_dict() for s in sales.items],
        'total': sales.total,
        'pages': sales.pages,
        'current_page': sales.page
    }), 200


@sales_bp.route('/', methods=['POST'])
@jwt_required()
def add_sale():
    data = request.get_json()
    required = ['product_id', 'quantity', 'unit_price']
    if not data or not all(k in data for k in required):
        return jsonify({'message': 'Missing required fields'}), 400

    product = Product.query.get(data['product_id'])
    if not product:
        return jsonify({'message': 'Product not found'}), 404

    qty = int(data['quantity'])
    if product.stock_quantity < qty:
        return jsonify({'message': f'Insufficient stock. Available: {product.stock_quantity}'}), 400

    unit_price = float(data['unit_price'])
    total = qty * unit_price

    sale = Sale(
        product_id=data['product_id'],
        quantity=qty,
        unit_price=unit_price,
        total_amount=total,
        sale_date=datetime.strptime(data.get('sale_date', date.today().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
        note=data.get('note', '')
    )
    # Deduct stock
    product.stock_quantity -= qty

    db.session.add(sale)
    db.session.commit()
    return jsonify({'message': 'Sale recorded', 'sale': sale.to_dict()}), 201


@sales_bp.route('/<int:sale_id>', methods=['DELETE'])
@jwt_required()
def delete_sale(sale_id):
    sale = Sale.query.get(sale_id)
    if not sale:
        return jsonify({'message': 'Sale not found'}), 404
    # Restore stock
    product = Product.query.get(sale.product_id)
    if product:
        product.stock_quantity += sale.quantity
    db.session.delete(sale)
    db.session.commit()
    return jsonify({'message': 'Sale deleted'}), 200


@sales_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    today = date.today()
    week_ago = today - timedelta(days=6)
    month_start = today.replace(day=1)

    # Today's stats
    today_sales = db.session.query(
        func.count(Sale.id), func.coalesce(func.sum(Sale.total_amount), 0)
    ).filter(Sale.sale_date == today).first()

    # Monthly stats
    monthly_sales = db.session.query(
        func.count(Sale.id), func.coalesce(func.sum(Sale.total_amount), 0)
    ).filter(Sale.sale_date >= month_start).first()

    # 7-day chart data
    chart_data = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        row = db.session.query(
            func.count(Sale.id), func.coalesce(func.sum(Sale.total_amount), 0)
        ).filter(Sale.sale_date == d).first()
        chart_data.append({
            'day': d.strftime('%a'),
            'date': d.strftime('%Y-%m-%d'),
            'sales': int(row[0]),
            'revenue': float(row[1])
        })

    # Top products
    top_products = db.session.query(
        Product.name,
        func.sum(Sale.quantity).label('total_qty'),
        func.sum(Sale.total_amount).label('total_revenue')
    ).join(Sale).group_by(Product.id).order_by(
        func.sum(Sale.total_amount).desc()
    ).limit(5).all()

    # Low stock count
    low_stock_count = Product.query.filter(
        Product.stock_quantity <= Product.low_stock_threshold
    ).count()

    return jsonify({
        'today': {'count': int(today_sales[0]), 'revenue': float(today_sales[1])},
        'monthly': {'count': int(monthly_sales[0]), 'revenue': float(monthly_sales[1])},
        'chart_data': chart_data,
        'top_products': [{'name': p[0], 'qty': int(p[1]), 'revenue': float(p[2])} for p in top_products],
        'total_products': Product.query.count(),
        'low_stock_count': low_stock_count
    }), 200
