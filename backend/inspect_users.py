from app import create_app
from app.models import db, User

app = create_app()
with app.app_context():
    users = User.query.all()
    print("User accounts in database:")
    for u in users:
        print(f"Email: {u.email} | Role: {u.role}")
