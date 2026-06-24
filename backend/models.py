from extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import json

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='owner')
    shop_name = db.Column(db.String(150), default='My Shop')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name,
            'email': self.email, 'shop_name': self.shop_name,
            'role': self.role
        }


class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(100), default='General')
    buy_price = db.Column(db.Float, nullable=False)
    sell_price = db.Column(db.Float, nullable=False)
    stock_quantity = db.Column(db.Integer, default=0)
    low_stock_threshold = db.Column(db.Integer, default=10)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sales = db.relationship('Sale', backref='product', lazy=True, cascade="all, delete-orphan")

    def __init__(self, name, category='General', buy_price=0, sell_price=0, stock_quantity=0, low_stock_threshold=10):
        self.name = name
        self.category = category
        self.buy_price = buy_price
        self.sell_price = sell_price
        self.stock_quantity = stock_quantity
        self.low_stock_threshold = low_stock_threshold

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name,
            'category': self.category, 'buy_price': self.buy_price,
            'sell_price': self.sell_price, 'stock_quantity': self.stock_quantity,
            'low_stock_threshold': self.low_stock_threshold,
            'is_low_stock': self.stock_quantity <= self.low_stock_threshold,
            'profit_margin': round(((self.sell_price - self.buy_price) / self.buy_price * 100), 1) if self.buy_price > 0 else 0
        }


class Sale(db.Model):
    __tablename__ = 'sales'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    sale_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    note = db.Column(db.String(255), default='')
    source_file = db.Column(db.String(150), default='POS', nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, product_id, quantity, unit_price, total_amount, sale_date=None, note='', source_file='POS'):
        self.product_id = product_id
        self.quantity = quantity
        self.unit_price = unit_price
        self.total_amount = total_amount
        if sale_date is not None:
            self.sale_date = sale_date
        self.note = note
        self.source_file = source_file

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else 'Unknown',
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_amount': self.total_amount,
            'sale_date': self.sale_date.strftime('%Y-%m-%d') if self.sale_date else '',
            'note': self.note,
            'source_file': self.source_file
        }


class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), default='')
    address = db.Column(db.String(255), default='')
    total_credit = db.Column(db.Float, default=0)
    total_paid = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    credit_records = db.relationship('CreditRecord', backref='customer', lazy=True, cascade="all, delete-orphan")

    @property
    def balance(self):
        return self.total_credit - self.total_paid

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name,
            'phone': self.phone, 'address': self.address,
            'total_credit': self.total_credit, 'total_paid': self.total_paid,
            'balance': self.balance,
            'status': 'cleared' if self.balance <= 0 else 'pending',
            'created_at': self.created_at.strftime('%Y-%m-%d')
        }


class CreditRecord(db.Model):
    __tablename__ = 'credit_records'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    record_type = db.Column(db.String(10), nullable=False)  # 'credit' or 'payment'
    amount = db.Column(db.Float, nullable=False)
    note = db.Column(db.String(255), default='')
    date = db.Column(db.Date, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'customer_id': self.customer_id,
            'record_type': self.record_type, 'amount': self.amount,
            'note': self.note,
            'date': self.date.strftime('%Y-%m-%d') if self.date else ''
        }


class Invoice(db.Model):
    __tablename__ = 'invoices'
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False)
    items_json = db.Column(db.Text, nullable=False)  # JSON string of items
    total_amount = db.Column(db.Float, nullable=False)
    invoice_date = db.Column(db.Date, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def items(self):
        return json.loads(self.items_json)

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': f'INV-{str(self.id).zfill(5)}',
            'customer_name': self.customer_name,
            'items': self.items,
            'total_amount': self.total_amount,
            'invoice_date': self.invoice_date.strftime('%Y-%m-%d') if self.invoice_date else ''
        }
