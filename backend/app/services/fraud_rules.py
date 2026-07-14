from datetime import datetime, timedelta
from app.models import db, Order, Product, Seller, User, FraudLog
from flask import current_app
import json

def check_order_velocity(user_id):
    """
    Check if the user is placing orders too rapidly.
    Returns: (is_flagged, details, risk_score)
    """
    window_seconds = current_app.config.get('FRAUD_VELOCITY_LIMIT_WINDOW', 300)
    limit_orders = current_app.config.get('FRAUD_VELOCITY_LIMIT_ORDERS', 3)
    
    cutoff_time = datetime.utcnow() - timedelta(seconds=window_seconds)
    
    # Count orders in the window
    recent_orders_count = Order.query.filter(
        Order.user_id == user_id,
        Order.created_at >= cutoff_time
    ).count()
    
    if (recent_orders_count + 1) >= limit_orders:
        return True, f"High order velocity: {recent_orders_count + 1} orders (including current attempt) in last 5 minutes", 80.0
    return False, None, 0.0

def check_price_anomaly(product_id, current_price):
    """
    Check if a product is listed at a suspiciously low price compared to the category median.
    Returns: (is_flagged, details, risk_score)
    """
    product = db.session.get(Product, product_id)
    if not product:
        return False, None, 0.0
        
    category_id = product.category_id
    threshold = current_app.config.get('FRAUD_PRICE_ANOMALY_THRESHOLD', 0.25)
    
    # Get all product prices in this category
    sibling_products = Product.query.filter(
        Product.category_id == category_id,
        Product.id != product_id
    ).all()
    
    if not sibling_products:
        return False, None, 0.0
        
    prices = [p.price for p in sibling_products]
    prices.sort()
    
    # Calculate median
    n = len(prices)
    if n % 2 == 1:
        median_price = prices[n // 2]
    else:
        median_price = (prices[n // 2 - 1] + prices[n // 2]) / 2.0
        
    if current_price < median_price * threshold:
        return True, f"Suspiciously low price: ₹{current_price} is less than 25% of category median (₹{median_price:.2f})", 75.0
        
    return False, None, 0.0

def check_unverified_seller_volume(seller_id):
    """
    Check if an unverified seller is generating large sales volumes.
    Returns: (is_flagged, details, risk_score)
    """
    seller = db.session.get(Seller, seller_id)
    if not seller or seller.is_kyc_verified:
        return False, None, 0.0
        
    high_volume_threshold = current_app.config.get('FRAUD_HIGH_VOLUME_THRESHOLD', 10000.0)
    
    if seller.total_sales > high_volume_threshold:
        return True, f"High volume sales from unverified seller: ₹{seller.total_sales:.2f} (Threshold: ₹{high_volume_threshold})", 70.0
        
    return False, None, 0.0

def check_address_discrepancy(billing_address, delivery_address):
    """
    Check if the billing address and shipping address have mismatched profiles.
    We do a simple check on city/state names parsed from the addresses.
    Returns: (is_flagged, details, risk_score)
    """
    # Simple heuristic check: if states or postal codes are completely different
    # Normally, people ship gifts, so we assign a lower risk score (e.g. 30.0)
    billing_parts = [p.strip().lower() for p in billing_address.split(',')]
    delivery_parts = [p.strip().lower() for p in delivery_address.split(',')]
    
    # Extract last part (often state/country or pincode)
    b_loc = billing_parts[-1] if billing_parts else ""
    d_loc = delivery_parts[-1] if delivery_parts else ""
    
    if b_loc != d_loc:
        # Check if the state is different (often second-to-last or last part)
        b_state = billing_parts[-2] if len(billing_parts) > 1 else ""
        d_state = delivery_parts[-2] if len(delivery_parts) > 1 else ""
        
        if b_state != d_state:
            return True, f"Address state discrepancy: Billing '{b_state}' vs Delivery '{d_state}'", 30.0
            
    return False, None, 0.0

def evaluate_transaction_risk(user_id, order_data, cart_items):
    """
    Runs all rule engines on an incoming checkout request.
    If flags are raised, we create FraudLog records and calculate an overall risk score.
    """
    flags = []
    max_score = 0.0
    
    # 1. Check order velocity
    is_vel, vel_det, vel_score = check_order_velocity(user_id)
    if is_vel:
        flags.append({"rule": "Order Velocity", "details": vel_det, "score": vel_score})
        max_score = max(max_score, vel_score)
        
    # 2. Check price anomalies for each item in cart
    for item in cart_items:
        # For cart items, item is a CartItem object or a dictionary
        product_id = item.product_id if hasattr(item, 'product_id') else item.get('product_id')
        price = item.product.price if hasattr(item, 'product') else item.get('price')
        
        is_pr, pr_det, pr_score = check_price_anomaly(product_id, price)
        if is_pr:
            flags.append({"rule": "Price Anomaly", "details": pr_det, "score": pr_score})
            max_score = max(max_score, pr_score)
            
        # Check unverified seller status
        product = db.session.get(Product, product_id)
        if product:
            is_seller_flag, seller_det, seller_score = check_unverified_seller_volume(product.seller_id)
            if is_seller_flag:
                flags.append({"rule": "Unverified Seller Volume", "details": seller_det, "score": seller_score})
                max_score = max(max_score, seller_score)
                
    # 3. Check billing vs shipping address mismatch
    billing_addr = order_data.get('billing_address', '')
    delivery_addr = order_data.get('delivery_address', '')
    is_addr, addr_det, addr_score = check_address_discrepancy(billing_addr, delivery_addr)
    if is_addr:
        flags.append({"rule": "Address Discrepancy", "details": addr_det, "score": addr_score})
        max_score = max(max_score, addr_score)
        
    # Calculate composite score (e.g. max_score + a small bonus if multiple rules trigger, capped at 99)
    composite_score = max_score
    if len(flags) > 1:
        composite_score = min(composite_score + (10.0 * (len(flags) - 1)), 99.0)
        
    return {
        'is_flagged': len(flags) > 0,
        'flags': flags,
        'risk_score': composite_score
    }
