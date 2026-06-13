from flask import Flask
from config import Config
from extensions import db, jwt, cors
from models import User, Product, Sale, Customer, CreditRecord, Invoice, Supplier, SupplierRecord

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})

    from routes.auth import auth_bp


    from routes.products import products_bp
    from routes.sales import sales_bp
    from routes.customers import customers_bp
    from routes.invoices import invoices_bp
    from routes.suppliers import suppliers_bp
    from routes.purchases import purchases_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(invoices_bp)
    app.register_blueprint(suppliers_bp)
    app.register_blueprint(purchases_bp)

    @app.route('/')
    def index():
        return {'status': 'ok'}, 200

    import time
    import threading
    from datetime import date
    _METRICS_CACHE = {}
    _METRICS_CACHE_LOCK = threading.Lock()
    CACHE_TTL_SECONDS = 120

    @app.route('/api/public/metrics')
    def public_metrics():
        from flask import jsonify
        from models import Customer, Invoice, Sale, CreditRecord
        now = time.time()
        with _METRICS_CACHE_LOCK:
            if 'data' in _METRICS_CACHE and now < _METRICS_CACHE['expires_at']:
                return jsonify(_METRICS_CACHE['data']), 200

            try:
                total_customers = Customer.query.count()
                total_bills = Invoice.query.count()

                today = date.today()
                sales_today = Sale.query.filter_by(sale_date=today).count()
                credits_today = CreditRecord.query.filter_by(date=today).count()
                live_transactions_today = sales_today + credits_today

                data = {
                    'total_customers': total_customers,
                    'total_bills': total_bills,
                    'live_transactions_today': live_transactions_today
                }

                _METRICS_CACHE['data'] = data
                _METRICS_CACHE['expires_at'] = now + CACHE_TTL_SECONDS
                return jsonify(data), 200
            except Exception as e:
                return jsonify({
                    'total_customers': 0,
                    'total_bills': 0,
                    'live_transactions_today': 0
                }), 200

    with app.app_context():
        db.create_all()

        # Helper: safely add a column if it doesn't exist
        def _add_column_if_missing(check_sql, alter_sql, success_msg):
            try:
                db.session.execute(db.text(check_sql))
            except Exception:
                db.session.rollback()
                try:
                    # Handle multi-statement ALTERs (split by ;)
                    statements = [s.strip() for s in alter_sql.split(';') if s.strip()]
                    for stmt in statements:
                        db.session.execute(db.text(stmt))
                    db.session.commit()
                    print(f"Migration: {success_msg}")
                except Exception as e:
                    db.session.rollback()
                    print(f"Migration failed ({success_msg}): {e}")

        # ── Legacy column migrations ──────────────────────────────────────────
        _add_column_if_missing(
            "SELECT source_file FROM sales LIMIT 1",
            "ALTER TABLE sales ADD COLUMN source_file VARCHAR(150) DEFAULT 'POS'",
            "added source_file to sales"
        )
        _add_column_if_missing(
            "SELECT phone FROM users LIMIT 1",
            """ALTER TABLE users ADD COLUMN first_name VARCHAR(100) DEFAULT '';
               ALTER TABLE users ADD COLUMN last_name VARCHAR(100) DEFAULT '';
               ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT '';
               ALTER TABLE users ADD COLUMN store_address VARCHAR(255) DEFAULT '';
               ALTER TABLE users ADD COLUMN gst_number VARCHAR(50) DEFAULT '';
               ALTER TABLE users ADD COLUMN store_type VARCHAR(100) DEFAULT '';
               ALTER TABLE users ADD COLUMN is_setup_completed BOOLEAN DEFAULT 0""",
            "added business setup columns to users"
        )
        _add_column_if_missing(
            "SELECT business_setup_completed FROM users LIMIT 1",
            "ALTER TABLE users ADD COLUMN business_setup_completed BOOLEAN DEFAULT 0",
            "added business_setup_completed to users"
        )

        _add_column_if_missing(
            "SELECT first_name FROM customers LIMIT 1",
            """ALTER TABLE customers ADD COLUMN first_name VARCHAR(100) DEFAULT '';
               ALTER TABLE customers ADD COLUMN last_name VARCHAR(100) DEFAULT ''""",
            "added first_name and last_name to customers"
        )

        # ── Data isolation: user_id columns ───────────────────────────────────
        _add_column_if_missing(
            "SELECT user_id FROM customers LIMIT 1",
            "ALTER TABLE customers ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "added user_id to customers"
        )
        _add_column_if_missing(
            "SELECT user_id FROM products LIMIT 1",
            "ALTER TABLE products ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "added user_id to products"
        )
        _add_column_if_missing(
            "SELECT company_name FROM products LIMIT 1",
            "ALTER TABLE products ADD COLUMN company_name VARCHAR(150) DEFAULT ''",
            "added company_name to products"
        )
        _add_column_if_missing(
            "SELECT user_id FROM sales LIMIT 1",
            "ALTER TABLE sales ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "added user_id to sales"
        )
        _add_column_if_missing(
            "SELECT user_id FROM invoices LIMIT 1",
            "ALTER TABLE invoices ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "added user_id to invoices"
        )
        _add_column_if_missing(
            "SELECT user_id FROM categories LIMIT 1",
            "ALTER TABLE categories ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "added user_id to categories"
        )
        
        _add_column_if_missing(
            "SELECT products_purchased FROM credit_records LIMIT 1",
            "ALTER TABLE credit_records ADD COLUMN products_purchased VARCHAR(255)",
            "added products_purchased to credit_records"
        )
        _add_column_if_missing(
            "SELECT quantity FROM credit_records LIMIT 1",
            "ALTER TABLE credit_records ADD COLUMN quantity INTEGER",
            "added quantity to credit_records"
        )
        _add_column_if_missing(
            "SELECT bill_amount FROM credit_records LIMIT 1",
            "ALTER TABLE credit_records ADD COLUMN bill_amount FLOAT",
            "added bill_amount to credit_records"
        )
        
        _add_column_if_missing(
            "SELECT bill_number FROM credit_records LIMIT 1",
            "ALTER TABLE credit_records ADD COLUMN bill_number VARCHAR(50)",
            "added bill_number to credit_records"
        )

        # ── Critical fix: expand products_purchased from VARCHAR(255) → TEXT (SQLite only) ──
        is_sqlite = 'sqlite' in str(db.engine.url).lower()
        if is_sqlite:
            try:
                col_info = db.session.execute(
                    db.text("SELECT sql FROM sqlite_master WHERE type='table' AND name='credit_records'")
                ).scalar() or ''
                if 'products_purchased VARCHAR(255)' in col_info or 'products_purchased VARCHAR' in col_info.upper():
                    db.session.execute(db.text("""
                        CREATE TABLE IF NOT EXISTS credit_records_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            customer_id INTEGER NOT NULL REFERENCES customers(id),
                            record_type VARCHAR(10) NOT NULL,
                            amount FLOAT NOT NULL,
                            note TEXT DEFAULT '',
                            products_purchased TEXT,
                            quantity INTEGER,
                            bill_amount FLOAT,
                            bill_number VARCHAR(50),
                            date DATE,
                            created_at DATETIME
                        )
                    """))
                    db.session.execute(db.text("""
                        INSERT INTO credit_records_new
                            (id, customer_id, record_type, amount, note,
                             products_purchased, quantity, bill_amount, bill_number, date, created_at)
                        SELECT id, customer_id, record_type, amount, note,
                               products_purchased, quantity, bill_amount, bill_number, date, created_at
                        FROM credit_records
                    """))
                    db.session.execute(db.text("DROP TABLE credit_records"))
                    db.session.execute(db.text("ALTER TABLE credit_records_new RENAME TO credit_records"))
                    db.session.commit()
                    print("Migration: Expanded products_purchased to TEXT in credit_records")
            except Exception as e:
                db.session.rollback()
                print(f"Migration (products_purchased TEXT): {e}")

            try:
                # Legacy DBs created by SQLAlchemy may have a UNIQUE constraint on categories.name
                # SQLite does not support DROP CONSTRAINT, so we safely recreate the table.
                result = db.session.execute(db.text("SELECT sql FROM sqlite_master WHERE type='table' AND name='categories'")).scalar()
                if result and 'UNIQUE' in result.upper():
                    db.session.execute(db.text("""
                        CREATE TABLE categories_new (
                            id INTEGER PRIMARY KEY,
                            name VARCHAR(100) NOT NULL,
                            user_id INTEGER REFERENCES users(id)
                        )
                    """))
                    db.session.execute(db.text("INSERT INTO categories_new (id, name, user_id) SELECT id, name, user_id FROM categories"))
                    db.session.execute(db.text("DROP TABLE categories"))
                    db.session.execute(db.text("ALTER TABLE categories_new RENAME TO categories"))
                    db.session.commit()
                    print("Migration: Recreated categories table to remove UNIQUE constraint")
            except Exception as e:
                db.session.rollback()
                print(f"Migration failed (categories recreate): {e}")

        _seed_demo_data()

    return app


def _seed_demo_data():
    """Insert demo data if DB is empty."""
    from models import Product, Customer
    from datetime import date, timedelta
    from extensions import db
    from models import Sale

    if Product.query.count() == 0:
        products = [
            Product('Amul Milk', 'Dairy', 52, 60, 80, 10),
            Product('Parle-G', 'Biscuits', 22, 30, 50, 15),
            Product('Maggi Noodles', 'Food', 14, 20, 100, 20),
            Product('Tata Tea 250g', 'Beverages', 75, 90, 30, 8),
            Product('Ariel 1kg', 'Household', 200, 240, 25, 5),
            Product('Dettol 200ml', 'Health', 65, 80, 40, 10),
            Product('Colgate 200g', 'Health', 78, 95, 60, 15),
            Product('Sunflower Oil 1L', 'Food', 130, 155, 20, 5),
        ]
        db.session.add_all(products)
        db.session.commit()

    if Customer.query.count() == 0:
        customers = [
            Customer(name='Ramesh Kumar', phone='9876543210', address='12, Gandhi Nagar'),
            Customer(name='Priya Sharma', phone='9845123456', address='45, Lal Bagh'),
            Customer(name='Suresh Yadav', phone='9812345678', address='8, MG Road'),
        ]
        db.session.add_all(customers)
        db.session.commit()
        # Seed credits
        from models import CreditRecord
        records = [
            CreditRecord(customer_id=customers[0].id, record_type='credit', amount=1500, note='Weekly grocery'),
            CreditRecord(customer_id=customers[0].id, record_type='payment', amount=500, note='Part payment'),
            CreditRecord(customer_id=customers[1].id, record_type='credit', amount=800, note='Household items'),
            CreditRecord(customer_id=customers[2].id, record_type='credit', amount=300, note='Snacks'),
            CreditRecord(customer_id=customers[2].id, record_type='payment', amount=300, note='Full payment'),
        ]
        customers[0].total_credit = 1500; customers[0].total_paid = 500
        customers[1].total_credit = 800
        customers[2].total_credit = 300; customers[2].total_paid = 300
        db.session.add_all(records)
        db.session.commit()

app = create_app()
if __name__ == '__main__':
    app.run(debug=True, port=5000)


