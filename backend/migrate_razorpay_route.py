import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment
load_dotenv()

db_url = os.environ.get('DATABASE_URL')
if not db_url:
    print("DATABASE_URL not found in environment!")
    exit(1)

# SQLAlchemy compatibility conversion
if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)

print(f"Connecting to database...")
engine = create_engine(db_url)

with engine.connect() as conn:
    print("Checking if razorpay_account_id column exists in sellers...")
    # Add column to sellers if it doesn't exist
    try:
        conn.execute(text("ALTER TABLE sellers ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(100);"))
        conn.commit()
        print("Successfully added razorpay_account_id column to sellers table!")
    except Exception as e:
        print(f"Error adding column: {e}")

    print("Checking if payment_transfers table exists...")
    try:
        # Create payment_transfers table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS payment_transfers (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                seller_id INTEGER NOT NULL,
                razorpay_transfer_id VARCHAR(100) NOT NULL,
                amount DOUBLE PRECISION NOT NULL,
                status VARCHAR(20) DEFAULT 'on_hold',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (seller_id) REFERENCES sellers(id)
            );
        """))
        conn.commit()
        print("Successfully verified/created payment_transfers table!")
    except Exception as e:
        print(f"Error creating table: {e}")

print("Migration completed!")
