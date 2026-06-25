from flask import Flask
from config import Config
from extensions import db, jwt, cors
from models import User, Product, Sale, Customer, CreditRecord, Invoice

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

    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(invoices_bp)

    @app.route('/')
    def index():
        return {'status': 'ok'}, 200

    with app.app_context():
        db.create_all()
        # Schema migration check for sales table's source_file column
        try:
            db.session.execute(db.text("SELECT source_file FROM sales LIMIT 1"))
        except Exception:
            db.session.rollback()
            try:
                db.session.execute(db.text("ALTER TABLE sales ADD COLUMN source_file VARCHAR(150) DEFAULT 'POS'"))
                db.session.commit()
                print("Successfully migrated database: added source_file column to sales table.")
            except Exception as e:
                print("Failed to run database migration:", str(e))

        # Schema migration check for users table columns
        try:
            db.session.execute(db.text("SELECT phone FROM users LIMIT 1"))
        except Exception:
            db.session.rollback()
            try:
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN first_name VARCHAR(100) DEFAULT ''"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN last_name VARCHAR(100) DEFAULT ''"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT ''"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN store_address VARCHAR(255) DEFAULT ''"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN gst_number VARCHAR(50) DEFAULT ''"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN store_type VARCHAR(100) DEFAULT ''"))
                db.session.execute(db.text("ALTER TABLE users ADD COLUMN is_setup_completed BOOLEAN DEFAULT 0"))
                db.session.commit()
                print("Successfully migrated database: added business setup columns to users table.")
            except Exception as e:
                print("Failed to run users table database migration:", str(e))
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


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
