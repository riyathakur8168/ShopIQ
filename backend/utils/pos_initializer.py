from extensions import db

# Templates for each store type containing their categories and sample products
BUSINESS_TEMPLATES = {
    'Grocery Store': {
        'categories': ['Dairy', 'Beverages', 'Snacks', 'Food', 'Household'],
        'products': [
            {'name': 'Amul Milk', 'category': 'Dairy', 'buy_price': 50.0, 'sell_price': 60.0, 'stock_quantity': 80, 'low_stock_threshold': 10},
            {'name': 'Bread', 'category': 'Snacks', 'buy_price': 20.0, 'sell_price': 25.0, 'stock_quantity': 50, 'low_stock_threshold': 10},
            {'name': 'Sugar', 'category': 'Food', 'buy_price': 35.0, 'sell_price': 40.0, 'stock_quantity': 100, 'low_stock_threshold': 15},
            {'name': 'Rice', 'category': 'Food', 'buy_price': 50.0, 'sell_price': 60.0, 'stock_quantity': 100, 'low_stock_threshold': 15},
        ]
    },
    'Electrical Store': {
        'categories': ['Bulbs', 'Switches', 'Wires', 'Fans', 'Tools', 'Accessories'],
        'products': [
            {'name': 'LED Bulb', 'category': 'Bulbs', 'buy_price': 80.0, 'sell_price': 120.0, 'stock_quantity': 40, 'low_stock_threshold': 5},
            {'name': 'Switch', 'category': 'Switches', 'buy_price': 30.0, 'sell_price': 50.0, 'stock_quantity': 100, 'low_stock_threshold': 10},
            {'name': 'Wire', 'category': 'Wires', 'buy_price': 400.0, 'sell_price': 550.0, 'stock_quantity': 20, 'low_stock_threshold': 5},
        ]
    },
    'Mobile Shop': {
        'categories': ['Smartphones', 'Android Phones', 'iPhones', 'Chargers', 'Earphones', 'Smart Watches'],
        'products': [
            {'name': 'Android Phone', 'category': 'Android Phones', 'buy_price': 12000.0, 'sell_price': 14999.0, 'stock_quantity': 15, 'low_stock_threshold': 3},
            {'name': 'iPhone', 'category': 'iPhones', 'buy_price': 60000.0, 'sell_price': 69999.0, 'stock_quantity': 5, 'low_stock_threshold': 2},
            {'name': 'Charger', 'category': 'Chargers', 'buy_price': 300.0, 'sell_price': 499.0, 'stock_quantity': 40, 'low_stock_threshold': 8},
            {'name': 'Earphones', 'category': 'Earphones', 'buy_price': 800.0, 'sell_price': 1299.0, 'stock_quantity': 30, 'low_stock_threshold': 5},
        ]
    },
    'Hardware Store': {
        'categories': ['Tools', 'Electrical', 'Plumbing', 'Construction Materials'],
        'products': [
            {'name': 'Hammer', 'category': 'Tools', 'buy_price': 120.0, 'sell_price': 199.0, 'stock_quantity': 30, 'low_stock_threshold': 5},
        ]
    },
    'Medical Store': {
        'categories': ['Tablets', 'Syrups', 'First Aid', 'Personal Care'],
        'products': [
            {'name': 'Paracetamol', 'category': 'Tablets', 'buy_price': 12.0, 'sell_price': 18.0, 'stock_quantity': 200, 'low_stock_threshold': 30},
        ]
    },
    'Cosmetics Store': {
        'categories': ['Skincare', 'Makeup', 'Hair Care', 'Personal Care'],
        'products': [
            {'name': 'Face Wash', 'category': 'Skincare', 'buy_price': 90.0, 'sell_price': 149.0, 'stock_quantity': 60, 'low_stock_threshold': 10},
        ]
    },
    'Garment Store': {
        'categories': ["Men's Wear", "Women's Wear", "Kids' Wear", 'Accessories', 'Footwear'],
        'products': [
            {'name': 'T-Shirt', 'category': "Men's Wear", 'buy_price': 250.0, 'sell_price': 399.0, 'stock_quantity': 40, 'low_stock_threshold': 5},
        ]
    },
    'Stationery Store': {
        'categories': ['Notebooks', 'Pens & Pencils', 'Files & Folders', 'Art Supplies', 'Desk Accessories'],
        'products': [
            {'name': 'Spiral Notebook', 'category': 'Notebooks', 'buy_price': 40.0, 'sell_price': 60.0, 'stock_quantity': 100, 'low_stock_threshold': 20},
            {'name': 'Ballpoint Pen Set', 'category': 'Pens & Pencils', 'buy_price': 25.0, 'sell_price': 40.0, 'stock_quantity': 150, 'low_stock_threshold': 30},
        ]
    }
}

# Map frontend store type options to internal templates
STORE_TYPE_ALIASES = {
    'Clothing Store': 'Garment Store',
    'Garment Store': 'Garment Store',
    'Electronics Store': 'Mobile Shop',
    'Mobile Shop': 'Mobile Shop',
    'Pharmacy': 'Medical Store',
    'Medical Store': 'Medical Store',
    'Department Store': 'Grocery Store',
    'Grocery Store': 'Grocery Store',
    'Electrical Store': 'Electrical Store',
    'Hardware Store': 'Hardware Store',
    'Stationery Store': 'Stationery Store',
    'Cosmetics Store': 'Cosmetics Store'
}

def initialize_pos_for_business(store_type, user_id=None):
    """
    Clears existing products, categories, sales, invoices, and credit records
    for the given user, then generates the catalog for the selected store type.
    All created objects are owned by user_id.
    """
    from models import Category, Product, Sale, Invoice, CreditRecord, Customer

    # 1. Clear only THIS user's data
    if user_id:
        db.session.query(Sale).filter_by(user_id=user_id).delete()
        db.session.query(Invoice).filter_by(user_id=user_id).delete()

        # Reset credit records for customers belonging to this user
        customers = db.session.query(Customer).filter_by(user_id=user_id).all()
        for cust in customers:
            for rec in cust.credit_records:
                db.session.delete(rec)
            cust.total_credit = 0.0
            cust.total_paid = 0.0

        db.session.query(Product).filter_by(user_id=user_id).delete()
        db.session.query(Category).filter_by(user_id=user_id).delete()
    else:
        # Fallback: global clear (legacy path, should not be hit in normal flow)
        db.session.query(Sale).delete()
        db.session.query(Invoice).delete()
        db.session.query(CreditRecord).delete()
        for cust in db.session.query(Customer).all():
            cust.total_credit = 0.0
            cust.total_paid = 0.0
        db.session.query(Product).delete()
        db.session.query(Category).delete()

    db.session.commit()

    normalized_type = store_type.strip() if store_type else 'Other'
    mapped_type = STORE_TYPE_ALIASES.get(normalized_type, normalized_type)

    template = BUSINESS_TEMPLATES.get(mapped_type)

    # Fallback: blank store with just "General" category
    if not template or mapped_type == 'Other':
        general_cat = Category(name='General', user_id=user_id)
        db.session.add(general_cat)
        db.session.commit()
        return

    # 2. Add categories for the template (scoped to this user)
    category_map = {}
    for cat_name in template['categories']:
        cat = Category(name=cat_name, user_id=user_id)
        db.session.add(cat)
        category_map[cat_name] = cat

    # Ensure "General" fallback category exists
    if 'General' not in category_map:
        general_cat = Category(name='General', user_id=user_id)
        db.session.add(general_cat)
        category_map['General'] = general_cat

    db.session.commit()

    # 3. Add sample products for the template (scoped to this user)
    for prod_info in template['products']:
        cat_obj = category_map.get(prod_info['category'], category_map['General'])
        new_prod = Product(
            name=prod_info['name'],
            category=cat_obj.name,
            buy_price=prod_info['buy_price'],
            sell_price=prod_info['sell_price'],
            stock_quantity=prod_info['stock_quantity'],
            low_stock_threshold=prod_info['low_stock_threshold'],
            category_id=cat_obj.id,
            user_id=user_id
        )
        db.session.add(new_prod)

    db.session.commit()

