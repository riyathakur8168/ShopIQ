from extensions import db
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
import json

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    first_name = db.Column(db.String(100), default='')
    last_name = db.Column(db.String(100), default='')
    phone = db.Column(db.String(20), default='')
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='owner')
    shop_name = db.Column(db.String(150), default='My Shop')
    store_address = db.Column(db.String(255), default='')
    gst_number = db.Column(db.String(50), default='')
    store_type = db.Column(db.String(100), default='')
    is_setup_completed = db.Column(db.Boolean, default=False)
    business_setup_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'email': self.email,
            'shop_name': self.shop_name,
            'store_address': self.store_address,
            'gst_number': self.gst_number,
            'store_type': self.store_type,
            'is_setup_completed': self.business_setup_completed,
            'business_setup_completed': self.business_setup_completed,
            'role': self.role
        }


class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    # user_id: NULL means global/shared; non-null means owned by that user
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    products = db.relationship('Product', backref='category_rel', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }


class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(100), default='General')
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    buy_price = db.Column(db.Float, nullable=False)
    sell_price = db.Column(db.Float, nullable=False)
    stock_quantity = db.Column(db.Integer, default=0)
    low_stock_threshold = db.Column(db.Integer, default=10)
    # user_id: data isolation — each product belongs to one user/store
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    company_name = db.Column(db.String(150), default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    sales = db.relationship('Sale', backref='product', lazy=True, cascade="all, delete-orphan")

    def __init__(self, name, category='General', buy_price=0, sell_price=0, stock_quantity=0, low_stock_threshold=10, category_id=None, user_id=None, company_name=''):
        self.name = name
        self.category = category
        self.buy_price = buy_price
        self.sell_price = sell_price
        self.stock_quantity = stock_quantity
        self.low_stock_threshold = low_stock_threshold
        self.category_id = category_id
        self.user_id = user_id
        self.company_name = company_name

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category_rel.name if self.category_rel else (self.category or 'General'),
            'category_id': self.category_id,
            'buy_price': self.buy_price,
            'sell_price': self.sell_price,
            'stock_quantity': self.stock_quantity,
            'low_stock_threshold': self.low_stock_threshold,
            'is_low_stock': self.stock_quantity <= self.low_stock_threshold,
            'profit_margin': round(((self.sell_price - self.buy_price) / self.buy_price * 100), 1) if self.buy_price > 0 else 0,
            'company_name': self.company_name or ''
        }


class Sale(db.Model):
    __tablename__ = 'sales'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    sale_date = db.Column(db.Date, nullable=False, default=lambda: datetime.now(timezone.utc).date())
    note = db.Column(db.String(255), default='')
    source_file = db.Column(db.String(150), default='POS', nullable=True)
    # user_id: data isolation
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __init__(self, product_id, quantity, unit_price, total_amount, sale_date=None, note='', source_file='POS', user_id=None):
        self.product_id = product_id
        self.quantity = quantity
        self.unit_price = unit_price
        self.total_amount = total_amount
        if sale_date is not None:
            self.sale_date = sale_date
        self.note = note
        self.source_file = source_file
        self.user_id = user_id

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else 'Unknown',
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_amount': self.total_amount,
            'sale_date': self.sale_date.strftime('%Y-%m-%d') if self.sale_date else '',
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'note': self.note,
            'source_file': self.source_file
        }


class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    first_name = db.Column(db.String(100), default='')
    last_name = db.Column(db.String(100), default='')
    phone = db.Column(db.String(20), default='')
    address = db.Column(db.String(255), default='')
    total_credit = db.Column(db.Float, default=0)
    total_paid = db.Column(db.Float, default=0)
    # user_id: data isolation — each customer belongs to one store owner
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    credit_records = db.relationship('CreditRecord', backref='customer', lazy=True, cascade="all, delete-orphan")

    @property
    def balance(self):
        return self.total_credit - self.total_paid

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name or f"{self.first_name} {self.last_name}".strip(),
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'address': self.address,
            'total_credit': self.total_credit,
            'total_paid': self.total_paid,
            'balance': self.balance,
            # status: pending means they owe money, cleared means fully paid
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
    
    products_purchased = db.Column(db.Text, nullable=True)   # JSON array of purchased items – TEXT to avoid truncation
    quantity = db.Column(db.Integer, nullable=True)
    bill_amount = db.Column(db.Float, nullable=True)
    bill_number = db.Column(db.String(50), nullable=True)
    
    date = db.Column(db.Date, default=lambda: datetime.now(timezone.utc).date())
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'record_type': self.record_type,
            'amount': self.amount,
            'note': self.note,
            'products_purchased': self.products_purchased,
            'quantity': self.quantity,
            'bill_amount': self.bill_amount,
            'bill_number': self.bill_number,
            'date': self.date.strftime('%d %b %Y') if self.date else '',
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None
        }


class Invoice(db.Model):
    __tablename__ = 'invoices'
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False)
    items_json = db.Column(db.Text, nullable=False)  # JSON string of items
    total_amount = db.Column(db.Float, nullable=False)
    invoice_date = db.Column(db.Date, default=lambda: datetime.now(timezone.utc).date())
    # user_id: data isolation
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

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

class Supplier(db.Model):
    __tablename__ = 'suppliers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    business_name = db.Column(db.String(100), nullable=False)
    contact_person = db.Column(db.String(100), default='')
    phone = db.Column(db.String(20), default='')
    email = db.Column(db.String(100), default='')
    gst_number = db.Column(db.String(50), default='')
    address = db.Column(db.String(255), default='')
    city = db.Column(db.String(100), default='')
    state = db.Column(db.String(100), default='')
    pincode = db.Column(db.String(20), default='')
    product_category = db.Column(db.String(100), default='')
    notes = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='Active')  # 'Active' or 'Inactive'
    total_purchase = db.Column(db.Float, default=0.0)
    total_paid = db.Column(db.Float, default=0.0)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    records = db.relationship('SupplierRecord', backref='supplier', lazy=True, cascade="all, delete-orphan")

    @property
    def balance(self):
        return self.total_purchase - self.total_paid

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'business_name': self.business_name,
            'contact_person': self.contact_person,
            'phone': self.phone,
            'email': self.email,
            'gst_number': self.gst_number,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'pincode': self.pincode,
            'product_category': self.product_category,
            'notes': self.notes,
            'status': self.status,
            'total_purchase': self.total_purchase,
            'total_paid': self.total_paid,
            'balance': self.balance,
            'created_at': self.created_at.strftime('%Y-%m-%d')
        }


class SupplierRecord(db.Model):
    __tablename__ = 'supplier_records'
    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=False)
    record_type = db.Column(db.String(10), nullable=False)  # 'purchase' or 'payment'
    amount = db.Column(db.Float, nullable=False)
    note = db.Column(db.String(255), default='')
    
    products_purchased = db.Column(db.Text, nullable=True)   # JSON string of products
    quantity = db.Column(db.Integer, nullable=True)
    invoice_number = db.Column(db.String(50), nullable=True)
    
    date = db.Column(db.Date, default=lambda: datetime.now(timezone.utc).date())
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'record_type': self.record_type,
            'amount': self.amount,
            'note': self.note,
            'products_purchased': self.products_purchased,
            'quantity': self.quantity,
            'invoice_number': self.invoice_number,
            'date': self.date.strftime('%Y-%m-%d') if self.date else '',
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None
        }


class SystemState(db.Model):
    __tablename__ = 'system_state'
    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.Text, nullable=False)


from sqlalchemy import event

AUTO_CATEGORIES = {
    'Dairy': ['milk', 'curd', 'paneer', 'butter', 'cheese', 'lassi', 'buttermilk', 'ghee', 'yogurt'],
    'Beverages': ['tea', 'coffee', 'juice', 'pepsi', 'coke', 'soda', 'water', 'cold drink', 'sprite', 'fanta', 'limca'],
    'Food': ['rice', 'atta', 'sugar', 'dal', 'flour', 'salt', 'oil', 'masala', 'wheat', 'lentils', 'pulse', 'spices'],
    'Health & Personal Care': ['dettol', 'soap', 'toothpaste', 'brush', 'shampoo', 'oil', 'lotion', 'cream', 'sanitizer', 'handwash']
}

def suggest_category(product_name):
    name_lower = product_name.lower()
    for category_name, keywords in AUTO_CATEGORIES.items():
        for keyword in keywords:
            if keyword in name_lower:
                return category_name
    return 'General'

def normalize_category_name(name):
    if not name or not name.strip():
        return 'General'
    clean = name.strip()
    if clean.lower() == 'general':
        return 'General'
    return clean.title()

def resolve_product_category(product, session):
    # If the category is already explicitly linked via foreign key, skip resolution
    if getattr(product, 'category_id', None) is not None:
        return

    cat_str = product.category
    if not cat_str or not cat_str.strip():
        cat_str = suggest_category(product.name)
    
    normalized_name = normalize_category_name(cat_str)
    
    user_id = getattr(product, 'user_id', None)
    cat = None

    # Disable autoflush to prevent 'A flush is already in progress' InvalidRequestError
    with session.no_autoflush:
        if user_id:
            cat = session.query(Category).filter(
                db.func.lower(Category.name) == normalized_name.lower(),
                Category.user_id == user_id
            ).first()
        if not cat:
            cat = session.query(Category).filter(
                db.func.lower(Category.name) == normalized_name.lower(),
                Category.user_id == None
            ).first()
    
    if not cat:
        # Check session.new for an in-flight Category with the same name and user
        for obj in session.new:
            if isinstance(obj, Category) and obj.name.lower() == normalized_name.lower():
                cat = obj
                break
        if not cat:
            cat = Category(name=normalized_name, user_id=user_id)
            session.add(cat)
            
    product.category_rel = cat
    product.category = cat.name

@event.listens_for(db.Session, 'before_flush')
def before_flush(session, flush_context, instances):
    for obj in session.new.union(session.dirty):
        if isinstance(obj, Product):
            resolve_product_category(obj, session)
