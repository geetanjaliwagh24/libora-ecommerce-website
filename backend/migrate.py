from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE orders ADD COLUMN buyer_order_sequence INTEGER;'))
        db.session.commit()
        print("Successfully added column.")
    except Exception as e:
        print("Error adding column:", e)
