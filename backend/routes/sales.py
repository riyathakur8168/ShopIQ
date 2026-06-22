from flask import Blueprint, request, jsonify
from extensions import db
from models import Sale, Product
from flask_jwt_extended import jwt_required
from datetime import datetime, date, timedelta
from sqlalchemy import func
import csv
import io

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

    sales = query.order_by(Sale.sale_date.desc(), Sale.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'sales': [s.to_dict() for s in sales.items],
        'total': sales.total,
        'pages': sales.pages,
        'current_page': sales.page
    }), 200


@sales_bp.route('/', methods=['POST'])
@jwt_required()
def add_sale():
    try:
        data = request.get_json()
        required = ['product_id', 'quantity', 'unit_price']
        if not data or not all(k in data for k in required):
            return jsonify({'message': 'Missing required fields'}), 400

        product = Product.query.get(int(data['product_id']))
        if not product:
            return jsonify({'message': 'Product not found'}), 404

        qty = int(data['quantity'])
        if product.stock_quantity < qty:
            return jsonify({'message': f'Insufficient stock. Available: {product.stock_quantity}'}), 400

        unit_price = float(data['unit_price'])
        total = qty * unit_price

        sale_date_str = data.get('sale_date')
        if sale_date_str:
            s_date = datetime.strptime(sale_date_str, '%Y-%m-%d').date()
        else:
            s_date = date.today()

        sale = Sale(
            product_id=product.id,
            quantity=qty,
            unit_price=unit_price,
            total_amount=total,
            sale_date=s_date,
            note=data.get('note', '')
        )
        # Deduct stock
        product.stock_quantity -= qty

        db.session.add(sale)
        db.session.commit()
        return jsonify({'message': 'Sale recorded', 'sale': sale.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500


@sales_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_sales():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
        
    if not file.filename.endswith('.csv'):
        return jsonify({'message': 'Invalid file format. Please upload a CSV file.'}), 400

    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        success_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            product = None
            if row.get('product_id') and str(row.get('product_id')).strip():
                product = Product.query.get(int(row['product_id']))
            elif row.get('product_name') and str(row.get('product_name')).strip():
                product = Product.query.filter(func.lower(Product.name) == func.lower(row['product_name'].strip())).first()
                
            if not product:
                errors.append(f"Row {row_num}: Product not found")
                continue
                
            try:
                qty_val = row.get('quantity')
                qty = int(qty_val) if qty_val else 1
                
                price_val = row.get('unit_price')
                unit_price = float(price_val) if price_val else product.sell_price
            except (ValueError, TypeError):
                errors.append(f"Row {row_num}: Invalid quantity or price format")
                continue
                
            if product.stock_quantity < qty:
                errors.append(f"Row {row_num}: Insufficient stock for {product.name}")
                continue
                
            sale_date_val = row.get('sale_date')
            sale_date_str = str(sale_date_val).strip() if sale_date_val else ''
            if sale_date_str:
                try:
                    sale_date = datetime.strptime(sale_date_str, '%Y-%m-%d').date()
                except ValueError:
                    errors.append(f"Row {row_num}: Invalid date format, expected YYYY-MM-DD")
                    continue
            else:
                sale_date = date.today()
                
            sale = Sale(
                product_id=product.id,
                quantity=qty,
                unit_price=unit_price,
                total_amount=round(qty * unit_price, 2),
                sale_date=sale_date,
                note=row.get('note', '')
            )
            
            product.stock_quantity -= qty
            db.session.add(sale)
            success_count += 1
            
        db.session.commit()
        
        if errors and success_count == 0:
            return jsonify({'message': 'Upload failed completely', 'errors': errors}), 400
            
        message = f"Successfully imported {success_count} sales."
        if errors:
            message += f" ({len(errors)} rows failed)"
            
        return jsonify({
            'message': message,
            'success_count': success_count,
            'errors': errors
        }), 201


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
