import os
from sqlalchemy import text
from app import create_app
from app.models import db

app = create_app()

with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE products ADD COLUMN colors TEXT;'))
        print("Added colors to products")
    except Exception as e:
        print(f"Error on products (might already exist): {e}")
        db.session.rollback()

    try:
        db.session.execute(text('ALTER TABLE cart_items ADD COLUMN selected_color VARCHAR(50);'))
        print("Added selected_color to cart_items")
    except Exception as e:
        print(f"Error on cart_items (might already exist): {e}")
        db.session.rollback()
        
    try:
        db.session.execute(text('ALTER TABLE order_items ADD COLUMN selected_color VARCHAR(50);'))
        print("Added selected_color to order_items")
    except Exception as e:
        print(f"Error on order_items (might already exist): {e}")
        db.session.rollback()
        
    db.session.commit()
    print("Migration complete!")
