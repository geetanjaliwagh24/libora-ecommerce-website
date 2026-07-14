import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    FLASK_DEBUG = os.environ.get('FLASK_DEBUG', '0') == '1'
    SEED_DEMO_DATA = os.environ.get('SEED_DEMO_DATA', '0') == '1'
    ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
    
    SMTP_EMAIL = os.environ.get('SMTP_EMAIL')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
    
    # Database configuration
    # Default to SQLite, but prioritize DATABASE_URL if present.
    # Automatically convert legacy 'postgres://' URIs to 'postgresql://' for SQLAlchemy compatibility.
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        SQLALCHEMY_DATABASE_URI = db_url
    else:
        SQLALCHEMY_DATABASE_URI = 'sqlite:///marketplace.db'
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 1800
    }


    # Razorpay payment gateway credentials
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')

    @classmethod
    def validate(cls):
        if not cls.SECRET_KEY or not cls.JWT_SECRET_KEY:
            raise RuntimeError(
                'SECRET_KEY and JWT_SECRET_KEY must be set in the environment.'
            )
    
    # Fraud rule thresholds (Phase 1 Rules Engine)
    FRAUD_VELOCITY_LIMIT_ORDERS = 3      # Max orders
    FRAUD_VELOCITY_LIMIT_WINDOW = 300    # Window in seconds (5 minutes)
    FRAUD_PRICE_ANOMALY_THRESHOLD = 0.25  # Flag if price is < 25% of sub-category median
    FRAUD_HIGH_VOLUME_THRESHOLD = 10000.0 # Flag cumulative transactions over this value from unverified sellers

    # Twilio SMS configuration
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')



