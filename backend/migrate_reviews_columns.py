from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # 1. Add images_url
    try:
        db.session.execute(text('ALTER TABLE reviews ADD COLUMN images_url TEXT;'))
        db.session.commit()
        print("Successfully added images_url column to reviews.")
    except Exception as e:
        print("images_url column note:", e)
        
    # 2. Add video_url
    try:
        db.session.execute(text('ALTER TABLE reviews ADD COLUMN video_url TEXT;'))
        db.session.commit()
        print("Successfully added video_url column to reviews.")
    except Exception as e:
        print("video_url column note:", e)
