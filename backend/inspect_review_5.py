from app import create_app
from app.models import db, Review

app = create_app()
with app.app_context():
    r = Review.query.get(5)
    if not r:
        print("Review ID 5 not found in DB!")
    else:
        print("Review ID 5:")
        print("  Comment:", r.comment)
        print("  Images raw:", r.images_url)
        print("  Images property:", r.images)
        print("  Video:", r.video_url)
