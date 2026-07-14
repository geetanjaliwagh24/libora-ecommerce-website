import sqlite3
import os

def migrate():
    # Use absolute or relative path to marketplace.db
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'marketplace.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("Adding sizes column to products table...")
        cursor.execute("ALTER TABLE products ADD COLUMN sizes TEXT;")
        print("Success!")
    except sqlite3.OperationalError as e:
        print(f"Skipping products: {e}")

    try:
        print("Adding selected_size column to cart_items table...")
        cursor.execute("ALTER TABLE cart_items ADD COLUMN selected_size VARCHAR(50);")
        print("Success!")
    except sqlite3.OperationalError as e:
        print(f"Skipping cart_items: {e}")

    try:
        print("Adding selected_size column to order_items table...")
        cursor.execute("ALTER TABLE order_items ADD COLUMN selected_size VARCHAR(50);")
        print("Success!")
    except sqlite3.OperationalError as e:
        print(f"Skipping order_items: {e}")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == '__main__':
    migrate()
