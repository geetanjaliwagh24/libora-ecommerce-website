from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE orders ADD COLUMN return_reason TEXT;'))
        db.session.commit()
        print("Added return_reason to orders.")
    except Exception as e:
        print("Error adding column (might exist):", e)
        db.session.rollback()
        
    try:
        db.create_all()
        print("Created new tables (messages).")
    except Exception as e:
        print("Error creating tables:", e)
