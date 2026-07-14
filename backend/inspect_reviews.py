from app import create_app
from app.models import db, Review

app = create_app()
with app.app_context():
    reviews = Review.query.all()
    print(f"Total reviews in DB: {len(reviews)}")
    for r in reviews:
        print(f"ID: {r.id}, Product: {r.product_id}, Rating: {r.rating}")
        print(f"  Comment: {r.comment}")
        print(f"  Images raw: {r.images_url}")
        print(f"  Images property: {r.images}")
        print(f"  Video: {r.video_url}")
