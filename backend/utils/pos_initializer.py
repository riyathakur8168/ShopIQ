from extensions import db

# Templates for each store type containing their categories and sample products
BUSINESS_TEMPLATES = {
    'Grocery Store': {
        'categories': ['Fruits & Vegetables', 'Dairy', 'Beverages', 'Snacks', 'Household Essentials'],
        'products': [
            {'name': 'Milk', 'category': 'Dairy', 'buy_price': 30.0, 'sell_price': 40.0, 'stock_quantity': 80, 'low_stock_threshold': 10},
            {'name': 'Bread', 'category': 'Snacks', 'buy_price': 20.0, 'sell_price': 25.0, 'stock_quantity': 50, 'low_stock_threshold': 10},
            {'name': 'Rice', 'category': 'Household Essentials', 'buy_price': 50.0, 'sell_price': 60.0, 'stock_quantity': 100, 'low_stock_threshold': 15},
            {'name': 'Sugar', 'category': 'Household Essentials', 'buy_price': 35.0, 'sell_price': 40.0, 'stock_quantity': 100, 'low_stock_threshold': 15},
            {'name': 'Soft Drinks', 'category': 'Beverages', 'buy_price': 15.0, 'sell_price': 20.0, 'stock_quantity': 60, 'low_stock_threshold': 10}
        ]
    },
    'Department Store': {
        'categories': ['Clothing', 'Footwear', 'Home & Kitchen', 'Personal Care', 'Accessories'],
        'products': [
            {'name': 'T-Shirt', 'category': 'Clothing', 'buy_price': 250.0, 'sell_price': 399.0, 'stock_quantity': 40, 'low_stock_threshold': 5},
            {'name': 'Jeans', 'category': 'Clothing', 'buy_price': 600.0, 'sell_price': 999.0, 'stock_quantity': 30, 'low_stock_threshold': 5},
            {'name': 'Shoes', 'category': 'Footwear', 'buy_price': 800.0, 'sell_price': 1499.0, 'stock_quantity': 20, 'low_stock_threshold': 3},
            {'name': 'Backpack', 'category': 'Accessories', 'buy_price': 400.0, 'sell_price': 699.0, 'stock_quantity': 25, 'low_stock_threshold': 5},
            {'name': 'Water Bottle', 'category': 'Home & Kitchen', 'buy_price': 80.0, 'sell_price': 149.0, 'stock_quantity': 50, 'low_stock_threshold': 10}
        ]
    },
    'Clothing Store': {
        'categories': ['Men', 'Women', 'Kids', 'Accessories'],
        'products': [
            {'name': 'Shirt', 'category': 'Men', 'buy_price': 400.0, 'sell_price': 699.0, 'stock_quantity': 35, 'low_stock_threshold': 5},
            {'name': 'Jeans', 'category': 'Men', 'buy_price': 600.0, 'sell_price': 999.0, 'stock_quantity': 30, 'low_stock_threshold': 5},
            {'name': 'Dress', 'category': 'Women', 'buy_price': 700.0, 'sell_price': 1299.0, 'stock_quantity': 15, 'low_stock_threshold': 3},
            {'name': 'Jacket', 'category': 'Women', 'buy_price': 1000.0, 'sell_price': 1899.0, 'stock_quantity': 10, 'low_stock_threshold': 2},
            {'name': 'Cap', 'category': 'Accessories', 'buy_price': 100.0, 'sell_price': 199.0, 'stock_quantity': 40, 'low_stock_threshold': 8}
        ]
    },
    'Electronics Store': {
        'categories': ['Mobile Phones', 'Accessories', 'Computers', 'Audio Devices', 'Smart Gadgets'],
        'products': [
            {'name': 'Smartphone', 'category': 'Mobile Phones', 'buy_price': 12000.0, 'sell_price': 14999.0, 'stock_quantity': 15, 'low_stock_threshold': 3},
            {'name': 'Earbuds', 'category': 'Audio Devices', 'buy_price': 999.0, 'sell_price': 1499.0, 'stock_quantity': 40, 'low_stock_threshold': 8},
            {'name': 'Laptop', 'category': 'Computers', 'buy_price': 35000.0, 'sell_price': 42999.0, 'stock_quantity': 8, 'low_stock_threshold': 2},
            {'name': 'Power Bank', 'category': 'Accessories', 'buy_price': 800.0, 'sell_price': 1299.0, 'stock_quantity': 30, 'low_stock_threshold': 5},
            {'name': 'Smart Watch', 'category': 'Smart Gadgets', 'buy_price': 1800.0, 'sell_price': 2999.0, 'stock_quantity': 25, 'low_stock_threshold': 5}
        ]
    },
    'Pharmacy': {
        'categories': ['Medicines', 'Personal Care', 'Health Supplements', 'Medical Devices'],
        'products': [
            {'name': 'Paracetamol', 'category': 'Medicines', 'buy_price': 12.0, 'sell_price': 18.0, 'stock_quantity': 200, 'low_stock_threshold': 30},
            {'name': 'Vitamin Tablets', 'category': 'Health Supplements', 'buy_price': 110.0, 'sell_price': 150.0, 'stock_quantity': 80, 'low_stock_threshold': 10},
            {'name': 'Bandages', 'category': 'Medical Devices', 'buy_price': 25.0, 'sell_price': 40.0, 'stock_quantity': 150, 'low_stock_threshold': 20},
            {'name': 'Hand Sanitizer', 'category': 'Personal Care', 'buy_price': 45.0, 'sell_price': 60.0, 'stock_quantity': 100, 'low_stock_threshold': 15}
        ]
    },
    'Hardware Store': {
        'categories': ['Tools', 'Electrical', 'Plumbing', 'Construction Materials'],
        'products': [
            {'name': 'Hammer', 'category': 'Tools', 'buy_price': 120.0, 'sell_price': 199.0, 'stock_quantity': 30, 'low_stock_threshold': 5},
            {'name': 'Screwdriver', 'category': 'Tools', 'buy_price': 40.0, 'sell_price': 69.0, 'stock_quantity': 80, 'low_stock_threshold': 10},
            {'name': 'Drill Machine', 'category': 'Tools', 'buy_price': 1500.0, 'sell_price': 2499.0, 'stock_quantity': 12, 'low_stock_threshold': 3},
            {'name': 'PVC Pipe', 'category': 'Plumbing', 'buy_price': 70.0, 'sell_price': 110.0, 'stock_quantity': 60, 'low_stock_threshold': 10}
        ]
    },
    'Stationery Store': {
        'categories': ['Writing Supplies', 'School Supplies', 'Office Supplies', 'Art Materials'],
        'products': [
            {'name': 'Notebook', 'category': 'School Supplies', 'buy_price': 30.0, 'sell_price': 45.0, 'stock_quantity': 120, 'low_stock_threshold': 20},
            {'name': 'Pen', 'category': 'Writing Supplies', 'buy_price': 5.0, 'sell_price': 10.0, 'stock_quantity': 300, 'low_stock_threshold': 50},
            {'name': 'Marker', 'category': 'Art Materials', 'buy_price': 15.0, 'sell_price': 25.0, 'stock_quantity': 80, 'low_stock_threshold': 15},
            {'name': 'Calculator', 'category': 'Office Supplies', 'buy_price': 350.0, 'sell_price': 499.0, 'stock_quantity': 20, 'low_stock_threshold': 4}
        ]
    },
    'Cosmetics Store': {
        'categories': ['Skincare', 'Makeup', 'Hair Care', 'Personal Care'],
        'products': [
            {'name': 'Face Wash', 'category': 'Skincare', 'buy_price': 90.0, 'sell_price': 149.0, 'stock_quantity': 60, 'low_stock_threshold': 10},
            {'name': 'Shampoo', 'category': 'Hair Care', 'buy_price': 120.0, 'sell_price': 180.0, 'stock_quantity': 50, 'low_stock_threshold': 8},
            {'name': 'Lipstick', 'category': 'Makeup', 'buy_price': 150.0, 'sell_price': 299.0, 'stock_quantity': 45, 'low_stock_threshold': 5},
            {'name': 'Moisturizer', 'category': 'Skincare', 'buy_price': 180.0, 'sell_price': 249.0, 'stock_quantity': 40, 'low_stock_threshold': 8}
        ]
    }
}

# Keep aliases of old names to new types for compatibility
STORE_TYPE_ALIASES = {
    'Electrical Store': 'Hardware Store',
    'Mobile Shop': 'Electronics Store',
    'Medical Store': 'Pharmacy',
    'Garment Store': 'Clothing Store'
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

