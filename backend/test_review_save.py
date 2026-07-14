from app import create_app
from app.models import db, Review, User, Product

app = create_app()
with app.app_context():
    # Fetch first user and first product
    u = User.query.first()
    p = Product.query.first()
    if not u or not p:
        print("No user or product found to test.")
    else:
        try:
            r = Review(
                user_id=u.id,
                product_id=p.id,
                rating=5,
                comment="Testing images and videos",
                images=["http://image.jpg"],
                video_url="http://video.mp4"
            )
            db.session.add(r)
            db.session.commit()
            print("Successfully saved review!")
            print("Review from database:")
            saved_r = Review.query.get(r.id)
            print("images_url raw:", saved_r.images_url)
            print("images property:", saved_r.images)
            print("video_url:", saved_r.video_url)
            print("to_dict output:", saved_r.to_dict())
            
            # Clean up
            db.session.delete(saved_r)
            db.session.commit()
        except Exception as e:
            print("Failed to save review:", e)
