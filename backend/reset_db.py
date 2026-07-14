import os
from sqlalchemy import create_engine, MetaData
from config import Config

def reset_db():
    db_url = Config().SQLALCHEMY_DATABASE_URI
    print(f"Connecting to {db_url}")
    engine = create_engine(db_url)
    
    with engine.begin() as conn:
        print("Dropping all tables to start fresh...")
        meta = MetaData()
        meta.reflect(bind=engine)
        meta.drop_all(bind=engine)
        print("All tables dropped successfully!")
        print("You can now run 'python run.py' and it will freshly seed the database with the correct mega-menu categories and all 10 products!")

if __name__ == '__main__':
    reset_db()
