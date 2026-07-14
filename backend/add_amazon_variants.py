import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ.get('DATABASE_URL')

def migrate():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    try:
        cur.execute("ALTER TABLE products ADD COLUMN group_id VARCHAR(100);")
        print("Added group_id column.")
    except Exception as e:
        print("group_id might already exist:", e)
        conn.rollback()
        
    try:
        cur.execute("ALTER TABLE products ADD COLUMN color_name VARCHAR(100);")
        print("Added color_name column.")
    except Exception as e:
        print("color_name might already exist:", e)
        conn.rollback()

    conn.commit()
    cur.close()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
