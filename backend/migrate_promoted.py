from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE products ADD COLUMN is_promoted BOOLEAN DEFAULT FALSE;"))
        db.session.execute(text("CREATE INDEX ix_products_is_promoted ON products (is_promoted);"))
        db.session.commit()
        print("Successfully added is_promoted column.")
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
