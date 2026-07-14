from app import create_app
from app.models import db, WishlistItem

app = create_app()

with app.app_context():
    print("Creating wishlist_items table...")
    WishlistItem.__table__.create(db.engine, checkfirst=True)
    print("Table created successfully!")
