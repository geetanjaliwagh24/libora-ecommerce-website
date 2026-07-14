import os
import sys
import time
from sqlalchemy import create_engine

def wait_for_db():
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not set, skipping database connection wait.")
        return

    # Adapt legacy postgres:// to postgresql://
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)

    # SQLite database requires no wait
    if db_url.startswith('sqlite:'):
        print("Using SQLite database. No wait required.")
        return

    print(f"Waiting for database connection to be ready ({db_url.split('@')[-1]})...")
    timeout = 30
    start_time = time.time()
    
    while True:
        try:
            engine = create_engine(db_url)
            with engine.connect() as conn:
                conn.execute(engine.dialect.dbapi.Symbol("SELECT 1") if hasattr(engine.dialect.dbapi, "Symbol") else "SELECT 1")
                print("Database connection successfully established!")
                return
        except Exception as e:
            elapsed = time.time() - start_time
            if elapsed > timeout:
                print(f"Error: Database connection timed out after {timeout} seconds.")
                print(f"Last error details: {str(e)}")
                sys.exit(1)
            print("Database not ready yet. Retrying in 1 second...")
            time.sleep(1)

if __name__ == '__main__':
    wait_for_db()
