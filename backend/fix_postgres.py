import os
from sqlalchemy import create_engine, text
from config import Config

def fix_db():
    db_url = Config().SQLALCHEMY_DATABASE_URI
    if not db_url.startswith('postgres'):
        print(f"Current DB is {db_url}, which is not postgres. This script is meant for postgres.")
        print("Please ensure your DATABASE_URL environment variable is set before running.")
        return

    print(f"Connecting to {db_url}")
    engine = create_engine(db_url)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0;"))
            conn.commit()
            print("Successfully added 'coins' column to 'users' table in Postgres!")
        except Exception as e:
            print(f"Error (column might already exist or connection failed): {e}")

if __name__ == '__main__':
    fix_db()
