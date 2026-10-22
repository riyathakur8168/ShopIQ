from flask import Blueprint, request, jsonify
from extensions import db
from models import Sale, Product, SystemState, Customer
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from sqlalchemy import func
from sqlalchemy.orm import joinedload
import csv
import io
import traceback
import time

analytics_cache = {}
CACHE_TTL = 60

sales_bp = Blueprint('sales', __name__, url_prefix='/api/sales')

def _uid():
    return int(get_jwt_identity())


@sales_bp.route('/', methods=['GET'])
@jwt_required()
def get_sales():
    uid = _uid()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    product_id = request.args.get('product_id', type=int)

    query = Sale.query.filter_by(user_id=uid).options(joinedload(Sale.product))
    if start_date:
        try:
            query = query.filter(Sale.sale_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        except ValueError:
            return jsonify({'message': 'Invalid start_date format, expected YYYY-MM-DD'}), 400
    if end_date:
        try:
            query = query.filter(Sale.sale_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
        except ValueError:
            return jsonify({'message': 'Invalid end_date format, expected YYYY-MM-DD'}), 400
    if product_id:
        query = query.filter(Sale.product_id == product_id)

    sales = query.order_by(Sale.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'sales': [s.to_dict() for s in sales.items],
        'total': sales.total,
        'pages': sales.pages,
        'current_page': sales.page
    }), 200


@sales_bp.route('/', methods=['POST'])
@jwt_required()
def add_sale():
    uid = _uid()
    try:
        data = request.get_json()
        required = ['product_id', 'quantity', 'unit_price']
        if not data or not all(k in data for k in required):
            return jsonify({'message': 'Missing required fields'}), 400

        try:
            product_id = int(data['product_id'])
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid product_id format'}), 400

        # Only allow selling products that belong to this user
        product = db.session.query(Product).with_for_update().filter_by(id=product_id, user_id=uid).first()
        if not product:
            return jsonify({'message': 'Product not found'}), 404

        try:
            qty = int(data['quantity'])
            unit_price = float(data['unit_price'])
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid quantity or unit_price format'}), 400

        if qty <= 0:
            return jsonify({'message': 'Quantity must be greater than zero'}), 400
        if unit_price < 0:
            return jsonify({'message': 'Unit price cannot be negative'}), 400

        if product.stock_quantity < qty:
            return jsonify({'message': f'Insufficient stock. Available: {product.stock_quantity}'}), 400

        total = round(qty * unit_price, 2)

        sale_date_str = data.get('sale_date')
        if sale_date_str:
            try:
                s_date = datetime.strptime(sale_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'message': 'Invalid sale_date format, expected YYYY-MM-DD'}), 400
        else:
            s_date = date.today()

        sale = Sale(
            product_id=product.id,
            quantity=qty,
            unit_price=unit_price,
            total_amount=total,
            sale_date=s_date,
            note=data.get('note', ''),
            user_id=uid
        )
        # Deduct stock
        product.stock_quantity -= qty

        db.session.add(sale)
        db.session.commit()
        
        analytics_cache.clear()
        
        # Append manual sales notice to last uploaded file if applicable
        try:
            state_key = f'last_uploaded_filename_{uid}'
            state = SystemState.query.filter_by(key=state_key).first()
            if state:
                content = state.value.strip()
                if content and not content.endswith('(with manual sales)') and content not in ['Active Catalog', 'No sales recorded yet']:
                    state.value = f"{content} (with manual sales)"
                    db.session.commit()
            else:
                new_state = SystemState(key=state_key, value='Active Catalog')
                db.session.add(new_state)
                db.session.commit()
        except Exception:
            db.session.rollback()

        return jsonify({'message': 'Sale recorded', 'sale': sale.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500


@sales_bp.route('/checkout', methods=['POST'])
@jwt_required()
def checkout():
    """
    Atomic transaction endpoint for completing a POS order:
    1. Validates stock and calculates totals.
    2. Deducts stock and creates Sale records for each item.
    3. Creates Invoice record.
    4. Records CreditRecord if payment_method is Udhar.
    5. Commits atomically or rolls back cleanly on any failure.
    """
    from models import Invoice, CreditRecord, Customer
    import json
    uid = _uid()
    try:
        data = request.get_json() or {}
        items = data.get('items', [])
        if not items or not isinstance(items, list):
            return jsonify({'message': 'Cart items must be a non-empty list'}), 400

        payment_method = data.get('payment_method', 'Cash')
        customer_id = data.get('customer_id')
        customer_name = data.get('customer_name', 'Walk-in Customer')
        sale_date_str = data.get('sale_date')
        if sale_date_str:
            try:
                s_date = datetime.strptime(sale_date_str, '%Y-%m-%d').date()
            except ValueError:
                s_date = date.today()
        else:
            s_date = date.today()

        customer = None
        if customer_id:
            customer = Customer.query.filter_by(id=customer_id, user_id=uid).first()
            if customer:
                customer_name = customer.name

        if payment_method == 'Udhar' and not customer:
            return jsonify({'message': 'Udhar payment requires an existing registered customer'}), 400

        total_amount = 0.0
        sale_records = []
        invoice_items = []

        # Validate and deduct stock for all products
        for item in items:
            p_id = item.get('product_id') or item.get('id')
            try:
                p_id = int(p_id)
                qty = int(item.get('quantity') or item.get('cartQty') or 1)
                unit_price = float(item.get('unit_price') or item.get('sell_price') or 0.0)
            except (ValueError, TypeError):
                return jsonify({'message': 'Invalid product quantity or price format'}), 400

            if qty <= 0:
                return jsonify({'message': 'Quantity must be greater than zero'}), 400

            prod = db.session.query(Product).with_for_update().filter_by(id=p_id, user_id=uid).first()
            if not prod:
                return jsonify({'message': f'Product with ID {p_id} not found'}), 404

            if prod.stock_quantity < qty:
                return jsonify({'message': f'Insufficient stock for "{prod.name}". Available: {prod.stock_quantity}, requested: {qty}'}), 400

            item_total = round(qty * unit_price, 2)
            total_amount += item_total

            prod.stock_quantity -= qty

            sale = Sale(
                product_id=prod.id,
                quantity=qty,
                unit_price=unit_price,
                total_amount=item_total,
                sale_date=s_date,
                note=f"POS Sale - {payment_method}",
                user_id=uid
            )
            sale_records.append(sale)
            db.session.add(sale)

            invoice_items.append({
                'name': prod.name,
                'qty': qty,
                'price': unit_price,
                'total': item_total
            })

        total_amount = round(total_amount, 2)

        # Create Invoice
        invoice = Invoice(
            customer_name=customer_name,
            items_json=json.dumps(invoice_items),
            total_amount=total_amount,
            invoice_date=s_date,
            user_id=uid
        )
        db.session.add(invoice)
        db.session.flush()

        # If Udhar, record credit in ledger
        if payment_method == 'Udhar' and customer:
            products_json = json.dumps(invoice_items)
            bill_number = str(invoice.id)
            total_qty = sum(item['qty'] for item in invoice_items)

            credit_rec = CreditRecord(
                customer_id=customer.id,
                record_type='credit',
                amount=total_amount,
                note='POS Udhar Sale',
                products_purchased=products_json,
                quantity=total_qty,
                bill_amount=total_amount,
                bill_number=bill_number,
                date=s_date
            )
            db.session.add(credit_rec)
            db.session.flush()

            # Recalculate customer total_credit and total_paid
            credit_sum = db.session.query(func.coalesce(func.sum(CreditRecord.amount), 0.0)).filter_by(customer_id=customer.id, record_type='credit').scalar()
            paid_sum = db.session.query(func.coalesce(func.sum(CreditRecord.amount), 0.0)).filter_by(customer_id=customer.id, record_type='payment').scalar()
            customer.total_credit = float(credit_sum)
            customer.total_paid = float(paid_sum)

        db.session.commit()
        analytics_cache.clear()

        return jsonify({
            'message': 'Checkout completed successfully',
            'invoice': invoice.to_dict(),
            'total_amount': total_amount,
            'items_count': len(invoice_items)
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error during checkout: {str(e)}'}), 500


@sales_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_sales():
    uid = _uid()
    if 'file' not in request.files:
        return jsonify({'message': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
        
    if not file.filename.endswith('.csv'):
        return jsonify({'message': 'Invalid file format. Please upload a CSV file.'}), 400

    try:
        try:
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        except UnicodeDecodeError:
            return jsonify({'message': 'Invalid file encoding. Please upload a UTF-8 encoded CSV file.'}), 400
            
        # Restore stock for this user's sales of the same filename before clearing
        existing_file_sales = Sale.query.filter_by(user_id=uid, source_file=file.filename).all()
        for s in existing_file_sales:
            prod = Product.query.filter_by(id=s.product_id, user_id=uid).first()
            if prod:
                prod.stock_quantity += s.quantity

        # Clear only this user's sales of this filename
        Sale.query.filter_by(user_id=uid, source_file=file.filename).delete()
        db.session.commit()
            
        csv_reader = csv.DictReader(stream)
        headers = csv_reader.fieldnames
        
        if not headers:
            return jsonify({'message': 'CSV file is empty or missing headers.'}), 400
            
        required_columns = ['product_name', 'quantity', 'unit_price']
        missing = [col for col in required_columns if col not in headers]
        if missing:
            return jsonify({
                'message': f"Missing required column(s): {', '.join(missing)}",
                'errors': [f"The CSV must contain exactly these headers: product_name, quantity, unit_price"]
            }), 400
        
        success_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            product = None
            try:
                if row.get('product_id') and str(row.get('product_id')).strip():
                    product = db.session.query(Product).with_for_update().filter_by(id=int(row['product_id']), user_id=uid).first()
                elif row.get('product_name') and str(row.get('product_name')).strip():
                    product = db.session.query(Product).with_for_update().filter(
                        func.lower(Product.name) == func.lower(row['product_name'].strip()),
                        Product.user_id == uid
                    ).first()
            except (ValueError, TypeError):
                errors.append(f"Row {row_num}: Invalid product_id format")
                continue
                
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
                
            if qty <= 0:
                errors.append(f"Row {row_num}: Quantity must be greater than zero")
                continue
            if unit_price < 0:
                errors.append(f"Row {row_num}: Unit price cannot be negative")
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
                note=row.get('note', ''),
                source_file=file.filename,
                user_id=uid
            )
            
            product.stock_quantity -= qty
            db.session.add(sale)
            success_count += 1
            
        db.session.commit()
        analytics_cache.clear()
        
        # Save the name of the last successfully uploaded CSV file for this user
        if success_count > 0:
            try:
                state_key = f'last_uploaded_filename_{uid}'
                state = SystemState.query.filter_by(key=state_key).first()
                if state:
                    state.value = file.filename
                else:
                    state = SystemState(key=state_key, value=file.filename)
                    db.session.add(state)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print("Failed to save last uploaded filename:", str(e))
        
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

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500


@sales_bp.route('/<int:sale_id>', methods=['DELETE'])
@jwt_required()
def delete_sale(sale_id):
    uid = _uid()
    try:
        sale = Sale.query.filter_by(id=sale_id, user_id=uid).first()
        if not sale:
            return jsonify({'message': 'Sale not found'}), 404
        # Restore stock
        product = Product.query.filter_by(id=sale.product_id, user_id=uid).first()
        if product:
            product.stock_quantity += sale.quantity
        db.session.delete(sale)
        db.session.commit()
        analytics_cache.clear()
        return jsonify({'message': 'Sale deleted'}), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500


@sales_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    uid = _uid()
    try:
        source = request.args.get('source', '')
        cache_key = f"analytics_{uid}_{source}"
        now = time.time()
        if cache_key in analytics_cache and now - analytics_cache[cache_key]['timestamp'] < CACHE_TTL:
            return jsonify(analytics_cache[cache_key]['data']), 200

        today = date.today()

        # Get target source parameter
        source = request.args.get('source')

        # Retrieve the last uploaded CSV filename from metadata for this user
        last_filename = "Active Catalog"
        try:
            state = SystemState.query.filter_by(key=f'last_uploaded_filename_{uid}').first()
            if state:
                last_filename = state.value.strip()
        except Exception:
            pass

        # Query all unique uploaded CSV filenames for this user (excluding POS)
        unique_sources = db.session.query(Sale.source_file).filter_by(user_id=uid).distinct().all()
        uploaded_files = [r[0] for r in unique_sources if r[0] and r[0] != 'POS']

        # Determine default source if not provided
        if not source:
            if last_filename in uploaded_files:
                source = last_filename
            elif uploaded_files:
                source = uploaded_files[0]
            else:
                source = 'combined'  # Fallback to combined/all if no last uploaded file

        # Build dynamic queries scoped to this user + source
        def apply_source_filter(query_obj):
            # Always scope to current user first
            query_obj = query_obj.filter(Sale.user_id == uid)
            if source == 'POS':
                return query_obj.filter(Sale.source_file == 'POS')
            elif source == 'combined':
                return query_obj
            else:
                return query_obj.filter(Sale.source_file == source)

        # Determine reference date dynamically from the latest sales record for this source
        max_sale_date_query = db.session.query(func.max(Sale.sale_date))
        max_sale_date_query = apply_source_filter(max_sale_date_query)
        max_sale_date_val = max_sale_date_query.first()[0]
        reference_date = max_sale_date_val if max_sale_date_val else today
        
        month_start = reference_date.replace(day=1)

        # Today's stats relative to reference_date
        today_sales_query = db.session.query(
            func.count(Sale.id), func.coalesce(func.sum(Sale.quantity * Sale.unit_price), 0)
        ).filter(Sale.sale_date == reference_date)
        today_sales_query = apply_source_filter(today_sales_query)
        today_sales = today_sales_query.first()

        # Monthly stats relative to reference_date month
        monthly_sales_query = db.session.query(
            func.count(Sale.id), func.coalesce(func.sum(Sale.quantity * Sale.unit_price), 0)
        ).filter(Sale.sale_date >= month_start, Sale.sale_date <= reference_date)
        monthly_sales_query = apply_source_filter(monthly_sales_query)
        monthly_sales = monthly_sales_query.first()

        # 7-day chart data leading up to reference_date
        chart_data = []
        for i in range(6, -1, -1):
            d = reference_date - timedelta(days=i)
            row_query = db.session.query(
                func.count(Sale.id), func.coalesce(func.sum(Sale.quantity * Sale.unit_price), 0)
            ).filter(Sale.sale_date == d)
            row_query = apply_source_filter(row_query)
            row = row_query.first()
            chart_data.append({
                'day': d.strftime('%a'),
                'date': d.strftime('%Y-%m-%d'),
                'sales': int(row[0]),
                'revenue': float(row[1])
            })

        # Top products
        top_products_query = db.session.query(
            Product.name,
            func.sum(Sale.quantity).label('total_qty'),
            func.sum(Sale.quantity * Sale.unit_price).label('total_revenue')
        ).join(Sale)
        top_products_query = apply_source_filter(top_products_query)
        top_products = top_products_query.group_by(Product.id).order_by(
            func.sum(Sale.quantity * Sale.unit_price).desc()
        ).limit(5).all()

        # Low stock count — scoped to this user
        low_stock_count = Product.query.filter(
            Product.user_id == uid,
            Product.stock_quantity <= Product.low_stock_threshold
        ).count()

        # Revenue by Category: Revenue = quantity * unit_price
        revenue_by_category_query = db.session.query(
            Product.category,
            func.sum(Sale.quantity * Sale.unit_price).label('total_revenue')
        ).join(Sale)
        revenue_by_category_query = apply_source_filter(revenue_by_category_query)
        revenue_by_category = revenue_by_category_query.group_by(Product.category).all()

        category_map = {}
        for cat, total in revenue_by_category:
            if cat is None:
                continue
            cat_trimmed = cat.strip()
            if not cat_trimmed:
                continue
            
            # Normalize to lowercase and group case-insensitively
            cat_normalized = cat_trimmed.lower()
            category_map[cat_normalized] = category_map.get(cat_normalized, 0.0) + float(total or 0)

        # Calculate percentage based on total revenue
        total_revenue = sum(category_map.values())
        
        category_data = []
        for k, v in category_map.items():
            percentage = round((v / total_revenue * 100), 2) if total_revenue > 0 else 0.0
            category_data.append({
                'name': k.title(),
                'value': percentage,      # Percentage based on total revenue
                'revenue': round(v, 2)    # Raw revenue
            })

        # New metrics:
        # 1. Sales Volume by Product (sorted descending by quantity sold)
        sales_vol_query = db.session.query(
            Product.name,
            func.sum(Sale.quantity).label('total_qty')
        ).join(Sale)
        sales_vol_query = apply_source_filter(sales_vol_query)
        sales_vol = sales_vol_query.group_by(Product.id).order_by(
            func.sum(Sale.quantity).desc()
        ).all()
        
        sales_volume_by_product = [{'name': r[0], 'quantity': int(r[1])} for r in sales_vol]

        # 2. Top Selling Product (highest quantity sold)
        top_selling_data = {
            'name': sales_vol[0][0] if sales_vol else 'N/A',
            'quantity': int(sales_vol[0][1]) if sales_vol else 0
        }

        # 3. Highest Revenue Product (highest quantity * unit_price)
        highest_rev_query = db.session.query(
            Product.name,
            func.sum(Sale.quantity * Sale.unit_price).label('total_rev')
        ).join(Sale)
        highest_rev_query = apply_source_filter(highest_rev_query)
        highest_rev_prod = highest_rev_query.group_by(Product.id).order_by(
            func.sum(Sale.quantity * Sale.unit_price).desc()
        ).first()

        highest_revenue_product = {
            'name': highest_rev_prod[0] if highest_rev_prod else 'N/A',
            'revenue': round(float(highest_rev_prod[1]), 2) if highest_rev_prod else 0.0
        }

        # 4. Highest Profit Product (highest quantity * (unit_price - buy_price))
        highest_prof_query = db.session.query(
            Product.name,
            func.sum(Sale.quantity * (Sale.unit_price - Product.buy_price)).label('total_prof')
        ).join(Sale)
        highest_prof_query = apply_source_filter(highest_prof_query)
        highest_prof_prod = highest_prof_query.group_by(Product.id).order_by(
            func.sum(Sale.quantity * (Sale.unit_price - Product.buy_price)).desc()
        ).first()

        if highest_prof_prod:
            prof_name = highest_prof_prod[0]
            prof_val = float(highest_prof_prod[1])
            
            # Query total revenue for this product to calculate margin
            prod_rev_query = db.session.query(
                func.sum(Sale.quantity * Sale.unit_price)
            ).join(Product).filter(Product.name == prof_name)
            prod_rev_query = apply_source_filter(prod_rev_query)
            prod_rev_val = prod_rev_query.scalar() or 0.0
            
            margin = round((prof_val / prod_rev_val * 100), 1) if prod_rev_val > 0 else 0.0
        else:
            prof_name = 'N/A'
            prof_val = 0.0
            margin = 0.0

        highest_profit_product = {
            'name': prof_name,
            'profit': round(prof_val, 2),
            'margin': margin
        }

        # Calculate total quantity sold for active source
        total_qty_query = db.session.query(func.coalesce(func.sum(Sale.quantity), 0))
        total_qty_query = apply_source_filter(total_qty_query)
        total_qty_sold = int(total_qty_query.scalar() or 0)

        # Calculate total revenue for active source
        total_rev_query = db.session.query(func.coalesce(func.sum(Sale.quantity * Sale.unit_price), 0.0))
        total_rev_query = apply_source_filter(total_rev_query)
        total_revenue = float(total_rev_query.scalar() or 0.0)

        # Calculate total orders for active source
        total_orders_query = db.session.query(func.count(Sale.id))
        total_orders_query = apply_source_filter(total_orders_query)
        total_orders = int(total_orders_query.scalar() or 0)

        sales_count = db.session.query(func.count(Sale.id)).filter(Sale.user_id == uid).scalar()
        if sales_count == 0:
            last_filename = "No sales recorded yet"

        customers = Customer.query.filter_by(user_id=uid).all()
        pending_customers = [c for c in customers if c.balance > 0]
        udhar_total = sum(c.balance for c in pending_customers)
        udhar_count = len(pending_customers)

        response_data = {
            'today': {'count': int(today_sales[0]), 'revenue': float(today_sales[1])},
            'monthly': {'count': int(monthly_sales[0]), 'revenue': float(monthly_sales[1])},
            'udhar': {'total_pending': udhar_total, 'customer_count': udhar_count},
            'chart_data': chart_data,
            'top_products': [{'name': p[0], 'qty': int(p[1]), 'revenue': float(p[2])} for p in top_products],
            'category_data': category_data,
            'total_products': Product.query.filter_by(user_id=uid).count(),
            'low_stock_count': low_stock_count,
            'last_uploaded_file': last_filename,
            'uploaded_files': uploaded_files,
            'current_source': source,
            'sales_volume_by_product': sales_volume_by_product,
            'top_selling_product': top_selling_data,
            'highest_revenue_product': highest_revenue_product,
            'highest_profit_product': highest_profit_product,
            'total_qty_sold': total_qty_sold,
            'total_revenue': total_revenue,
            'total_orders': total_orders
        }
        
        analytics_cache[cache_key] = {'data': response_data, 'timestamp': now}
        return jsonify(response_data), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500
