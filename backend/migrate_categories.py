import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'shopiq_v2.db')

def migrate():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    print("Starting category migration...")
    
    # 1. Create categories table
    c.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) UNIQUE NOT NULL
        )
    ''')
    
    # 2. Add category_id to products if not exists
    try:
        c.execute('ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)')
        print("Added category_id column to products.")
    except sqlite3.OperationalError:
        print("category_id column already exists.")
        pass
        
    # 3. Get all existing products
    try:
        c.execute('SELECT id, category FROM products')
        products = c.fetchall()
    except sqlite3.OperationalError as e:
        print(f"Error querying products: {e}")
        return
        
    # Dictionary to cache lowercase -> Category ID
    cat_map = {}
    
    for pid, cat_str in products:
        if not cat_str:
            cat_str = 'General'
            
        clean_cat = cat_str.strip()
        lower_cat = clean_cat.lower()
        
        if lower_cat not in cat_map:
            # Determine normalized name
            normalized_name = clean_cat.title() if lower_cat != 'general' else 'General'
            
            c.execute('SELECT id FROM categories WHERE lower(name) = ?', (lower_cat,))
            row = c.fetchone()
            if row:
                cat_id = row[0]
            else:
                c.execute('INSERT INTO categories (name) VALUES (?)', (normalized_name,))
                cat_id = c.lastrowid
                print(f"Created category: {normalized_name} (ID: {cat_id})")
                
            cat_map[lower_cat] = cat_id
            
        cat_id = cat_map[lower_cat]
        
        # 4. Update product with category_id
        c.execute('UPDATE products SET category_id = ? WHERE id = ?', (cat_id, pid))
        
    conn.commit()
    conn.close()
    print(f"Migration completed. Processed {len(products)} products and {len(cat_map)} unique categories.")

if __name__ == '__main__':
    migrate()
