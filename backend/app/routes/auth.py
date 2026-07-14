from flask import Blueprint, request, jsonify, current_app
from app.models import db, User, Seller, Product, CartItem, Review, FraudLog, SellerOrderSequence, Order, OrderItem, OTPRecord
from app.routes.auth_helper import token_required
from app import limiter
import jwt
from datetime import datetime, timedelta
import random
import uuid
import json
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import smtplib
from email.message import EmailMessage

auth_bp = Blueprint('auth', __name__)

def send_real_email(to_email, subject, body):
    smtp_email = current_app.config.get('SMTP_EMAIL')
    smtp_password = current_app.config.get('SMTP_PASSWORD')
    
    if not smtp_email or not smtp_password:
        print("SMTP credentials missing, skipping real email.")
        return False, "SMTP credentials missing from environment variables."
        
    try:
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = smtp_email
        msg['To'] = to_email

        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(smtp_email, smtp_password)
        server.send_message(msg)
        server.quit()
        print(f"Email sent successfully to {to_email}", flush=True)
        return True, ""
    except Exception as e:
        error_msg = str(e)
        print(f"Error sending email: {error_msg}", flush=True)
        return False, error_msg

def send_welcome_email(user_email):
    subject = "Welcome to Libora!"
    body = "A successful Libora account has been created for you. Happy shopping!"
    send_real_email(user_email, subject, body)

def send_deletion_email(user_email):
    subject = "Account Deleted"
    body = "Your account has been permanently deleted. Sad to see you go!"
    send_real_email(user_email, subject, body)

def send_twilio_sms(phone, otp):
    try:
        account_sid = current_app.config.get('TWILIO_ACCOUNT_SID')
        auth_token = current_app.config.get('TWILIO_AUTH_TOKEN')
        twilio_number = current_app.config.get('TWILIO_PHONE_NUMBER')

        if not all([account_sid, auth_token, twilio_number]):
            print("Twilio credentials missing, skipping real SMS sending.")
            return False

        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=f"Your Libora verification code is {otp}",
            from_=twilio_number,
            to=phone
        )
        print(f"Twilio SMS sent successfully, SID: {message.sid}")
        return True
    except TwilioRestException as e:
        print(f"Twilio Error: {e}")
        return False
    except Exception as e:
        print(f"Error sending Twilio SMS: {str(e)}")
        return False



@auth_bp.route('/send-otp', methods=['POST'])
@limiter.limit("5 per minute")
def send_otp():
    data = request.get_json() or {}
    email = data.get('email')
    phone = data.get('phone')
    otp_id = data.get('otp_id')
    
    if not email and not phone:
        return jsonify({'message': 'Email or phone is required'}), 400
        
    record = None
    if otp_id:
        record = db.session.get(OTPRecord, otp_id)
        if not record:
            return jsonify({'message': 'Invalid session'}), 404
    else:
        record = OTPRecord(
            expires_at=datetime.utcnow() + timedelta(minutes=15)
        )
        db.session.add(record)
    
    if email:
        email_otp = str(random.randint(100000, 999999))
        record.email = email
        record.email_otp = email_otp
        success, email_err = send_real_email(email, "Your Libora Verification Code", f"Your Libora verification code is {email_otp}")
        if not success:
            db.session.rollback()
            return jsonify({'message': f'Failed to send Email OTP: {email_err}'}), 500
            
    if phone:
        phone_otp = str(random.randint(100000, 999999))
        record.phone = phone
        record.phone_otp = phone_otp
        send_twilio_sms(phone, phone_otp)
        
    db.session.commit()
    return jsonify({'message': 'OTP sent successfully', 'otp_id': record.id}), 200

@auth_bp.route('/verify-otp', methods=['POST'])
@limiter.limit("10 per minute")
def verify_otp():
    data = request.get_json() or {}
    otp_id = data.get('otp_id')
    email_otp = data.get('email_otp')
    phone_otp = data.get('phone_otp')
    
    if not otp_id:
        return jsonify({'message': 'OTP ID missing'}), 400
        
    record = db.session.get(OTPRecord, otp_id)
    if not record:
        return jsonify({'message': 'OTP record not found'}), 404
        
    if record.expires_at < datetime.utcnow():
        return jsonify({'message': 'OTP expired'}), 400
        
    if email_otp and record.email_otp != email_otp:
        return jsonify({'message': 'Invalid Email OTP'}), 400
        
    if phone_otp and record.phone_otp != phone_otp:
        return jsonify({'message': 'Invalid Phone OTP'}), 400
        
    # Mark as verified
    if email_otp: record.email_otp = None
    if phone_otp: record.phone_otp = None
        
    verification_token = record.verification_token or str(uuid.uuid4())
    record.verification_token = verification_token
    db.session.commit()
    
    return jsonify({
        'message': 'Verification successful',
        'verification_token': verification_token,
        'email': record.email,
        'phone': record.phone
    }), 200

@auth_bp.route('/signup', methods=['POST'])
@limiter.limit("5 per minute")
def signup():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'buyer')
    phone = data.get('phone')
    address = data.get('address')
    
    if not email or not password or not phone:
        return jsonify({'message': 'Email, phone, and password are required'}), 400
        
    verification_token = data.get('verification_token')
    if not verification_token:
        return jsonify({'message': 'OTP verification required'}), 400
        
    otp_record = OTPRecord.query.filter_by(
        verification_token=verification_token
    ).first()
    
    if not otp_record or otp_record.expires_at < datetime.utcnow():
        return jsonify({'message': 'Invalid or expired verification session. Please verify OTP again.'}), 400
        
    if otp_record.email != email or otp_record.phone != phone:
        return jsonify({'message': 'Email or phone does not match verification session'}), 400
        
    # Enforce password strength rules
    if len(password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters long'}), 400
    if not any(char.isdigit() for char in password):
        return jsonify({'message': 'Password must contain at least one number'}), 400
    if not any(char.isupper() for char in password):
        return jsonify({'message': 'Password must contain at least one uppercase letter'}), 400
    if not any(char.islower() for char in password):
        return jsonify({'message': 'Password must contain at least one lowercase letter'}), 400
        
    if role not in ['buyer', 'seller']:
        return jsonify({'message': 'Invalid role'}), 400
        
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already registered'}), 400
        
    try:
        user = User(email=email, role=role, phone=phone, address=address)
        user.set_password(password)
        db.session.add(user)
        db.session.flush() # Get user ID
        
        # If registering as seller, initialize Seller profile
        if role == 'seller':
            business_name = data.get('business_name')
            gstin = data.get('gstin')
            bank_details = data.get('bank_details')
            
            if not business_name:
                db.session.rollback()
                return jsonify({'message': 'Business name is required for seller registration'}), 400
                
            seller = Seller(
                id=user.id,
                business_name=business_name,
                gstin=gstin,
                bank_details=bank_details,
                is_kyc_verified=False # Verification is done by admin
            )
            db.session.add(seller)
            
        db.session.commit()
        
        # Send welcome email
        send_welcome_email(user.email)
        
        return jsonify({'message': 'User registered successfully', 'user_id': user.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password'}), 401
        
    # Generate JWT token
    token_expiry = datetime.utcnow() + timedelta(hours=24)
    token = jwt.encode(
        {
            'user_id': user.id,
            'exp': token_expiry
        },
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify(current_user.to_dict()), 200

@auth_bp.route('/delete-account', methods=['DELETE'])
@token_required
def delete_account(current_user):
    data = request.get_json(silent=True) or {}
    password = data.get('password')
    
    if not password or not current_user.check_password(password):
        return jsonify({'message': 'Invalid password'}), 401

    try:
        user_id = current_user.id
        role = current_user.role
        
        # 1. Delete associated FraudLogs where this user is either user or seller
        FraudLog.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        if role == 'seller':
            FraudLog.query.filter_by(seller_id=user_id).delete(synchronize_session=False)
            
        # 2. Delete FraudLogs for the user's orders (since orders will be deleted)
        user_orders = Order.query.filter_by(user_id=user_id).all()
        user_order_ids = [o.id for o in user_orders]
        if user_order_ids:
            FraudLog.query.filter(FraudLog.order_id.in_(user_order_ids)).delete(synchronize_session=False)
            
        # 3. Handle seller-specific data cleanup if the user is a seller
        if role == 'seller':
            # Find all products of this seller
            products = Product.query.filter_by(seller_id=user_id).all()
            product_ids = [p.id for p in products]
            
            if product_ids:
                # Delete CartItems of other users referencing this seller's products
                CartItem.query.filter(CartItem.product_id.in_(product_ids)).delete(synchronize_session=False)
                
                # Delete OrderItems referencing this seller's products
                OrderItem.query.filter(OrderItem.product_id.in_(product_ids)).delete(synchronize_session=False)
                
                # Delete Reviews referencing this seller's products
                Review.query.filter(Review.product_id.in_(product_ids)).delete(synchronize_session=False)
                
                # Explicitly delete seller's products to ensure cascade is triggered cleanly
                for p in products:
                    db.session.delete(p)
            
            # Delete SellerOrderSequence entries for this seller
            SellerOrderSequence.query.filter_by(seller_id=user_id).delete(synchronize_session=False)
            
            # Delete SellerOrderSequence entries referencing the user's orders
            if user_order_ids:
                SellerOrderSequence.query.filter(SellerOrderSequence.order_id.in_(user_order_ids)).delete(synchronize_session=False)
        
        # 4. Send email notification before deleting the user object
        send_deletion_email(current_user.email)

        # 5. Delete the User object (SQLAlchemy cascades will delete User's orders, reviews, cart_items, and seller_profile)
        db.session.delete(current_user)
        
        # 6. Clean up any empty orders across the DB that might have been left with 0 items
        # after deleting seller's order items.
        db.session.flush() # Flush to update relationships in memory before querying empty orders
        empty_orders = Order.query.filter(~Order.items.any()).all()
        for eo in empty_orders:
            # Delete associated FraudLogs for this order
            FraudLog.query.filter_by(order_id=eo.id).delete(synchronize_session=False)
            # Delete SellerOrderSequence for this order
            SellerOrderSequence.query.filter_by(order_id=eo.id).delete(synchronize_session=False)
            db.session.delete(eo)
            
        db.session.commit()
        return jsonify({'message': 'Account deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete account: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json() or {}
    try:
        new_phone = data.get('phone')
        new_email = data.get('email')
        verification_token = data.get('verification_token')
        
        if (new_phone and new_phone != current_user.phone) or (new_email and new_email != current_user.email):
            if not verification_token:
                return jsonify({'message': 'OTP verification required to change email or phone'}), 400
                
            otp_record = OTPRecord.query.filter_by(
                verification_token=verification_token
            ).first()
            
            if not otp_record or otp_record.expires_at < datetime.utcnow():
                return jsonify({'message': 'Invalid or expired verification session.'}), 400
                
            if new_phone and new_phone != current_user.phone:
                if otp_record.phone != new_phone:
                    return jsonify({'message': 'Phone number in OTP verification does not match'}), 400
            if new_email and new_email != current_user.email:
                if otp_record.email != new_email:
                    return jsonify({'message': 'Email in OTP verification does not match'}), 400
        
        if new_phone: current_user.phone = new_phone
        if new_email: current_user.email = new_email
        if data.get('address'): current_user.address = data['address']
        if data.get('name') and hasattr(current_user, 'name'): current_user.name = data['name']
        db.session.commit()
        return jsonify({'message': 'Profile updated', 'user': current_user.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500
