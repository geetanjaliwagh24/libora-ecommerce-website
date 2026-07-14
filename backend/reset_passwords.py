from app import create_app
from app.models import db, User

app = create_app()
with app.app_context():
    accounts = [
        'admin@marketplace.com',
        'apex_seller@marketplace.com',
        'cheap_seller@marketplace.com',
        'buyer@marketplace.com',
    ]
    for email in accounts:
        user = User.query.filter_by(email=email).first()
        if user:
            user.set_password('Test@1234')
            print(f"Reset password for: {email}")
        else:
            print(f"User not found: {email}")
    db.session.commit()
    print("\nAll passwords have been reset to: Test@1234")
