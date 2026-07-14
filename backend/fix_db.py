import os
from sqlalchemy import create_engine
from config import Config

def fix_db():
    db_url = Config().SQLALCHEMY_DATABASE_URI
    print(f"Connecting to {db_url}")
    engine = create_engine(db_url)
    with engine.connect() as conn:
        try:
            conn.execute("ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0;")
            print("Successfully added 'coins' column to 'users' table.")
        except Exception as e:
            print(f"Error (column might already exist): {e}")

if __name__ == '__main__':
    fix_db()
