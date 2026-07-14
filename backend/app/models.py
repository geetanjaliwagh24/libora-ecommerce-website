from datetime import datetime
import json
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='buyer') # buyer, seller, admin
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    is_email_verified = db.Column(db.Boolean, default=False)
    coins = db.Column(db.Integer, default=0)
    
    # Relationships
    orders = db.relationship('Order', backref='buyer', lazy=True, cascade="all, delete-orphan")
    reviews = db.relationship('Review', backref='author', lazy=True, cascade="all, delete-orphan")
    cart_items = db.relationship('CartItem', backref='user', lazy=True, cascade="all, delete-orphan")
    wishlist_items = db.relationship('WishlistItem', backref='user', lazy=True, cascade="all, delete-orphan")
    seller_profile = db.relationship('Seller', backref='user', uselist=False, lazy=True, cascade="all, delete-orphan")
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat(),
            'phone': self.phone,
            'address': self.address,
            'is_email_verified': self.is_email_verified,
            'coins': self.coins,
            'is_seller': self.seller_profile is not None,
            'seller_details': self.seller_profile.to_dict() if self.seller_profile else None
        }

class Seller(db.Model):
    __tablename__ = 'sellers'
    
    id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    business_name = db.Column(db.String(100), nullable=False)
    gstin = db.Column(db.String(15), nullable=True)
    bank_details = db.Column(db.Text, nullable=True)
    is_kyc_verified = db.Column(db.Boolean, default=False)
    kyc_rejection_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    razorpay_account_id = db.Column(db.String(100), nullable=True)
    
    # Behavior metrics for fraud classification
    rating = db.Column(db.Float, default=5.0)
    total_sales = db.Column(db.Float, default=0.0)
    order_count = db.Column(db.Integer, default=0)
    return_count = db.Column(db.Integer, default=0)
    complaint_count = db.Column(db.Integer, default=0)
    
    # Relationships
    products = db.relationship('Product', backref='seller', lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'business_name': self.business_name,
            'gstin': self.gstin,
            'bank_details': self.bank_details,
            'is_kyc_verified': self.is_kyc_verified,
            'kyc_rejection_reason': self.kyc_rejection_reason,
            'rating': self.rating,
            'total_sales': self.total_sales,
            'order_count': self.order_count,
            'return_rate': (self.return_count / max(self.order_count, 1)) * 100,
            'complaint_rate': (self.complaint_count / max(self.order_count, 1)) * 100,
            'razorpay_account_id': self.razorpay_account_id
        }

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True, index=True)
    
    # Self-referential relationship for parent/child categories
    subcategories = db.relationship('Category', backref=db.backref('parent', remote_side=[id]), lazy=True)
    products = db.relationship('Product', backref='category', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'parent_id': self.parent_id
        }

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False, index=True)
    discount = db.Column(db.Integer, nullable=False, default=0)
    stock = db.Column(db.Integer, nullable=False, default=0)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False, index=True)
    image_url = db.Column(db.Text, nullable=True) # Will store JSON list of image URLs
    colors = db.Column(db.Text, nullable=True) # Deprecated
    sizes = db.Column(db.Text, nullable=True) # JSON list of sizes
    group_id = db.Column(db.String(100), nullable=True, index=True)
    color_name = db.Column(db.String(100), nullable=True)
    is_promoted = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    @property
    def discounted_price(self):
        if self.discount and self.discount > 0:
            return round(self.price * (1 - self.discount / 100.0), 2)
        return self.price

    # Relationships
    reviews = db.relationship('Review', backref='product', lazy=True, cascade="all, delete-orphan")
    
    @property
    def images(self):
        if not self.image_url:
            return []
        try:
            parsed = json.loads(self.image_url)
            if isinstance(parsed, list):
                return parsed
            return [parsed]
        except Exception:
            return [self.image_url]

    @images.setter
    def images(self, value):
        if isinstance(value, list):
            self.image_url = json.dumps(value)
        else:
            self.image_url = json.dumps([value] if value else [])

    def to_dict(self):
        # Calculate rating - defaults to 0.0 if there are no reviews
        ratings = [r.rating for r in self.reviews]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0.0
        
        main_cat_name = 'Uncategorized'
        if self.category:
            if self.category.parent_id is None:
                main_cat_name = self.category.name
            else:
                p = self.category.parent
                if p and p.parent_id is None:
                    main_cat_name = p.name
                elif p and p.parent:
                    main_cat_name = p.parent.name
                    
        return {
            'id': self.id,
            'seller_id': self.seller_id,
            'seller_name': self.seller.business_name,
            'name': self.name,
            'description': self.description,
            'price': self.discounted_price,
            'discount': self.discount,
            'original_price': self.price if self.discount > 0 else None,
            'stock': self.stock,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else 'Unknown',
            'main_category_name': main_cat_name,
            'images': self.images,
            'image_url': self.images[0] if self.images else None,
            'colors': self.colors_list,
            'sizes': self.sizes_dict,
            'group_id': self.group_id,
            'color_name': self.color_name,
            'is_promoted': self.is_promoted,
            'created_at': self.created_at.isoformat(),
            'rating': avg_rating,
            'review_count': len(self.reviews)
        }

    @property
    def colors_list(self):
        if not self.colors:
            return []
        try:
            parsed = json.loads(self.colors)
            if isinstance(parsed, list):
                return parsed
            return [parsed]
        except Exception:
            # Fallback to comma separated if it wasn't JSON
            return [c.strip() for c in self.colors.split(',') if c.strip()]

    @colors_list.setter
    def colors_list(self, value):
        if isinstance(value, list):
            self.colors = json.dumps(value)
        elif isinstance(value, str):
            # If they pass a comma separated string directly
            self.colors = json.dumps([c.strip() for c in value.split(',') if c.strip()])
        else:
            self.colors = json.dumps([])

    @property
    def sizes_dict(self):
        if not self.sizes:
            return {}
        try:
            parsed = json.loads(self.sizes)
            if isinstance(parsed, dict):
                return parsed
            if isinstance(parsed, list):
                return {s: 0 for s in parsed}
            return {}
        except Exception:
            return {s.strip(): 0 for s in self.sizes.split(',') if s.strip()}

    @sizes_dict.setter
    def sizes_dict(self, value):
        if isinstance(value, dict):
            self.sizes = json.dumps(value)
        elif isinstance(value, list):
            self.sizes = json.dumps({s: 0 for s in value})
        else:
            self.sizes = json.dumps({})

class Coupon(db.Model):
    __tablename__ = 'coupons'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), nullable=False)
    discount_percentage = db.Column(db.Integer, nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    min_cart_value = db.Column(db.Integer, nullable=True, default=0)

    seller = db.relationship('Seller')

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'discount_percentage': self.discount_percentage,
            'seller_id': self.seller_id,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'min_cart_value': self.min_cart_value
        }

class CartItem(db.Model):
    __tablename__ = 'cart_items'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    selected_color = db.Column(db.String(50), nullable=True)
    selected_size = db.Column(db.String(50), nullable=True)
    
    product = db.relationship('Product')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'seller_id': self.product.seller_id,
            'product_name': self.product.name,
            'price': self.product.discounted_price,
            'original_price': self.product.price,
            'discount': self.product.discount,
            'image_url': self.product.images[0] if self.product.images else '',
            'quantity': self.quantity,
            'selected_color': self.selected_color,
            'selected_size': self.selected_size,
            'subtotal': self.product.discounted_price * self.quantity
        }

class WishlistItem(db.Model):
    __tablename__ = 'wishlist_items'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    product = db.relationship('Product')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'seller_id': self.product.seller_id,
            'product_name': self.product.name,
            'price': self.product.discounted_price,
            'original_price': self.product.price,
            'discount': self.product.discount,
            'image_url': self.product.images[0] if self.product.images else '',
            'created_at': self.created_at.isoformat()
        }

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    buyer_order_sequence = db.Column(db.Integer, nullable=True) # Lifetime sequence number for this buyer
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='Placed') # Placed, Confirmed, Shipped, Delivered, Return_Requested, Returned, Refunded
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    billing_address = db.Column(db.String(255), nullable=False)
    delivery_address = db.Column(db.String(255), nullable=False)
    
    payment_method = db.Column(db.String(50), nullable=False) # UPI, Card, NetBanking, COD, Razorpay
    payment_status = db.Column(db.String(20), default='Pending') # Pending, Paid, Failed, Refunded
    
    # Razorpay tracking info
    razorpay_order_id = db.Column(db.String(100), nullable=True)
    razorpay_payment_id = db.Column(db.String(100), nullable=True)
    razorpay_signature = db.Column(db.String(256), nullable=True)
    
    platform_fee = db.Column(db.Float, nullable=False, default=0.0)
    
    # Behavioral features for Fraud Detection ML
    device_ip = db.Column(db.String(50), nullable=True)
    device_fingerprint = db.Column(db.String(100), nullable=True)
    velocity_score = db.Column(db.Float, default=0.0) # time since last order in seconds (or -1 if first order)

    
    # Relationships
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")
    fraud_logs = db.relationship('FraudLog', backref='order', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'buyer_order_sequence': self.buyer_order_sequence or self.id, # Fallback to standard ID if sequence not set
            'buyer_email': self.buyer.email,
            'total_amount': self.total_amount,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'billing_address': self.billing_address,
            'delivery_address': self.delivery_address,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'platform_fee': self.platform_fee,
            'items': [item.to_dict() for item in self.items],
            'is_flagged': len(self.fraud_logs) > 0
        }

class SellerOrderSequence(db.Model):
    __tablename__ = 'seller_order_sequences'
    
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    sequence_number = db.Column(db.Integer, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'seller_id': self.seller_id,
            'order_id': self.order_id,
            'sequence_number': self.sequence_number
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    price = db.Column(db.Float, nullable=False) # purchase-time price
    selected_color = db.Column(db.String(50), nullable=True)
    selected_size = db.Column(db.String(50), nullable=True)
    
    product = db.relationship('Product')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else 'Deleted Product',
            'seller_id': self.product.seller_id if self.product else None,
            'seller_name': self.product.seller.business_name if self.product else 'Unknown Seller',
            'quantity': self.quantity,
            'price': self.price,
            'selected_color': self.selected_color,
            'selected_size': self.selected_size,
            'subtotal': self.price * self.quantity,
            'image_url': self.product.images[0] if (self.product and self.product.images) else ''
        }

class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    images_url = db.Column(db.Text, nullable=True) # JSON list of images
    video_url = db.Column(db.Text, nullable=True)  # Video URL
    is_verified_purchase = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def images(self):
        if not self.images_url:
            return []
        try:
            parsed = json.loads(self.images_url)
            if isinstance(parsed, list):
                return parsed
            return [parsed]
        except Exception:
            return [self.images_url]

    @images.setter
    def images(self, value):
        if isinstance(value, list):
            self.images_url = json.dumps(value)
        else:
            self.images_url = json.dumps([value] if value else [])
            
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'author_email': self.author.email,
            'product_id': self.product_id,
            'rating': self.rating,
            'comment': self.comment,
            'images': self.images,
            'video_url': self.video_url or '',
            'is_verified_purchase': self.is_verified_purchase,
            'created_at': self.created_at.isoformat()
        }

class FraudLog(db.Model):
    __tablename__ = 'fraud_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=True)
    
    rule_triggered = db.Column(db.String(100), nullable=False)
    risk_score = db.Column(db.Float, nullable=False) # 0 to 100
    details = db.Column(db.Text, nullable=True) # JSON or descriptive string
    status = db.Column(db.String(20), default='Pending') # Pending, Approved (Confirmed Fraud), Dismissed (Legitimate)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User')
    seller = db.relationship('Seller')
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'user_id': self.user_id,
            'user_email': self.user.email if self.user else None,
            'seller_id': self.seller_id,
            'seller_business_name': self.seller.business_name if self.seller else None,
            'rule_triggered': self.rule_triggered,
            'risk_score': self.risk_score,
            'details': self.details,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

class BannerAd(db.Model):
    __tablename__ = 'banner_ads'
    
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=False)
    brand_name = db.Column(db.String(100), nullable=False)
    image_url = db.Column(db.Text, nullable=False)
    tagline = db.Column(db.String(200), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    
    seller = db.relationship('Seller')
    product = db.relationship('Product')
    
    @property
    def is_active(self):
        return datetime.utcnow() < self.expires_at
    
    def to_dict(self):
        return {
            'id': self.id,
            'seller_id': self.seller_id,
            'brand_name': self.brand_name,
            'image_url': self.image_url,
            'tagline': self.tagline,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'is_active': self.is_active
        }

class OTPRecord(db.Model):
    __tablename__ = 'otp_records'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    email_otp = db.Column(db.String(6), nullable=True)
    phone_otp = db.Column(db.String(6), nullable=True)
    verification_token = db.Column(db.String(100), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class PaymentTransfer(db.Model):
    __tablename__ = 'payment_transfers'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=False)
    razorpay_transfer_id = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='on_hold') # on_hold, released, reversed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    order = db.relationship('Order', backref=db.backref('transfers', lazy=True, cascade="all, delete-orphan"))
    seller = db.relationship('Seller')

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'seller_id': self.seller_id,
            'razorpay_transfer_id': self.razorpay_transfer_id,
            'amount': self.amount,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

