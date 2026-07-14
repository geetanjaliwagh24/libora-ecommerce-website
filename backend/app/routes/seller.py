from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from app.models import db, Seller, Product, Order, OrderItem, SellerOrderSequence, BannerAd, Coupon
from app.routes.auth_helper import token_required, role_required

seller_bp = Blueprint('seller', __name__)

@seller_bp.route('/kyc', methods=['POST'])
@token_required
@role_required(['seller'])
def submit_kyc(current_user):
    seller = db.session.get(Seller, current_user.id)
    if not seller:
        return jsonify({'message': 'Seller profile not found'}), 404
        
    data = request.get_json() or {}
    business_name = data.get('business_name')
    gstin = data.get('gstin')
    bank_details = data.get('bank_details')
    
    if not business_name or not gstin or not bank_details:
        return jsonify({'message': 'Business name, GSTIN, and Bank details are required'}), 400
        
    try:
        seller.business_name = business_name
        seller.gstin = gstin
        seller.bank_details = bank_details
        seller.is_kyc_verified = False 
        seller.kyc_rejection_reason = None
        db.session.commit()
        return jsonify({'message': 'KYC submitted successfully', 'seller': seller.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to submit KYC: {str(e)}'}), 500

@seller_bp.route('/stats', methods=['GET'])
@token_required
@role_required(['seller'])
def get_stats(current_user):
    seller = db.session.get(Seller, current_user.id)
    if not seller:
        return jsonify({'message': 'Seller profile not found'}), 404
    return jsonify(seller.to_dict()), 200

@seller_bp.route('/promote/<int:product_id>', methods=['POST'])
@token_required
@role_required(['seller'])
def promote_product(current_user, product_id):
    product = db.session.get(Product, product_id)
    if not product or product.seller_id != current_user.id:
        return jsonify({'message': 'Product not found or not owned by you'}), 404

    if product.is_promoted:
        return jsonify({'message': 'Product is already promoted'}), 400

    if current_user.coins < 100:
        return jsonify({'message': 'Insufficient Style Coins. You need 100 coins to promote a product.'}), 400

    try:
        current_user.coins -= 100
        product.is_promoted = True
        db.session.commit()
        return jsonify({'message': 'Product promoted successfully', 'coins': current_user.coins}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to promote: {str(e)}'}), 500

@seller_bp.route('/orders', methods=['GET'])
@token_required
@role_required(['seller'])
def get_seller_orders(current_user):
    order_items = OrderItem.query.join(Product).filter(Product.seller_id == current_user.id).all()
    
    orders_dict = {}
    for item in order_items:
        order = item.order
        if order.id not in orders_dict:
            seq_rec = SellerOrderSequence.query.filter_by(seller_id=current_user.id, order_id=order.id).first()
            seller_seq = seq_rec.sequence_number if seq_rec else order.id
            
            orders_dict[order.id] = {
                'id': order.id,
                'user_id': order.user_id,
                'seller_order_sequence': seller_seq,
                'buyer_email': order.buyer.email,
                'status': order.status,
                'created_at': order.created_at.isoformat(),
                'delivery_address': order.delivery_address,
                'payment_method': order.payment_method,
                'payment_status': order.payment_status,
                'seller_items': []
            }
        orders_dict[order.id]['seller_items'].append(item.to_dict())
        
    return jsonify(list(orders_dict.values())), 200

@seller_bp.route('/products', methods=['GET'])
@token_required
@role_required(['seller'])
def get_seller_products(current_user):
    products = Product.query.filter_by(seller_id=current_user.id).order_by(Product.created_at.desc()).all()
    return jsonify([p.to_dict() for p in products]), 200

@seller_bp.route('/analytics', methods=['GET'])
@token_required
@role_required(['seller'])
def get_seller_analytics(current_user):
    from collections import defaultdict
    
    items = OrderItem.query.join(Product).filter(
        Product.seller_id == current_user.id
    ).all()
    
    # Revenue over time (by date)
    revenue_by_date = defaultdict(float)
    for item in items:
        date_str = item.order.created_at.strftime('%d %b')
        revenue_by_date[date_str] += item.price * item.quantity
    
    # Top 5 products by revenue
    product_revenue = defaultdict(float)
    product_names = {}
    for item in items:
        product_revenue[item.product_id] += item.price * item.quantity
        product_names[item.product_id] = item.product.name
    
    top_products = sorted(product_revenue.items(), key=lambda x: x[1], reverse=True)[:5]
    top_products_data = [{'name': product_names[pid][:22], 'revenue': rev} for pid, rev in top_products]
    
    # Category breakdown
    category_revenue = defaultdict(float)
    for item in items:
        cat = item.product.category
        if cat:
            top_cat = cat
            while top_cat.parent_id is not None:
                top_cat = top_cat.parent
            category_revenue[top_cat.name] += item.price * item.quantity
    
    category_data = [{'name': name, 'revenue': rev} for name, rev in category_revenue.items()]
    sorted_dates = sorted(revenue_by_date.keys())
    total_rev = sum(revenue_by_date.values())
    
    return jsonify({
        'revenue_timeline': {
            'labels': sorted_dates,
            'values': [revenue_by_date[d] for d in sorted_dates]
        },
        'top_products': top_products_data,
        'category_breakdown': category_data,
        'total_revenue': total_rev,
        'total_orders': len(set(item.order_id for item in items))
    }), 200

@seller_bp.route('/banner-ad', methods=['POST'])
@token_required
@role_required(['seller'])
def create_banner_ad(current_user):
    data = request.get_json() or {}
    image_url = data.get('image_url', '').strip()
    tagline = data.get('tagline', '').strip()
    try:
        duration = int(data.get('duration', 1))
        if duration not in [1, 2]:
            duration = 1
    except ValueError:
        duration = 1
    
    if not image_url or not tagline:
        return jsonify({'message': 'Banner image URL and Tagline are completely required.'}), 400
    
    seller = db.session.get(Seller, current_user.id)
    if not seller:
        return jsonify({'message': 'Seller profile not found'}), 404
    
    cost = duration * 100
    if current_user.coins < cost:
        return jsonify({'message': f'Insufficient Style Coins. You need {cost} coins for a {duration}-day banner ad.'}), 400
    
    # Validation for product_id removed
    
    try:
        current_user.coins -= cost
        banner = BannerAd(
            seller_id=current_user.id,
            brand_name=seller.business_name,
            image_url=image_url,
            tagline=tagline,
            product_id=None,
            expires_at=datetime.utcnow() + timedelta(days=duration)
        )
        db.session.add(banner)
        db.session.commit()
        return jsonify({
            'message': f'Banner ad created successfully! It will appear on the homepage for {duration} day(s).',
            'coins': current_user.coins,
            'banner': banner.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create banner ad: {str(e)}'}), 500

@seller_bp.route('/my-banners', methods=['GET'])
@token_required
@role_required(['seller'])
def get_my_banners(current_user):
    banners = BannerAd.query.filter_by(seller_id=current_user.id).order_by(BannerAd.created_at.desc()).all()
    return jsonify([b.to_dict() for b in banners]), 200

@seller_bp.route('/buy-coins', methods=['POST'])
@token_required
@role_required(['seller'])
def buy_coins(current_user):
    data = request.get_json() or {}
    amount = data.get('amount')
    try:
        amount = int(amount)
        if amount <= 0:
            return jsonify({'message': 'Invalid amount.'}), 400
    except (TypeError, ValueError):
        return jsonify({'message': 'Invalid amount.'}), 400
    
    try:
        # Simulate payment success and add coins
        current_user.coins += amount
        db.session.commit()
        return jsonify({
            'message': f'Successfully purchased {amount} Style Coins!',
            'coins': current_user.coins
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to process payment: {str(e)}'}), 500

@seller_bp.route('/coupons', methods=['GET'])
@token_required
@role_required(['seller'])
def get_coupons(current_user):
    coupons = Coupon.query.filter_by(seller_id=current_user.id).order_by(Coupon.created_at.desc()).all()
    return jsonify([c.to_dict() for c in coupons]), 200

@seller_bp.route('/coupons', methods=['POST'])
@token_required
@role_required(['seller'])
def create_coupon(current_user):
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper()
    discount_percentage = data.get('discount_percentage')
    days_valid = data.get('days_valid')
    min_cart_value = data.get('min_cart_value', 0)
    
    if not code or not discount_percentage or not days_valid:
        return jsonify({'message': 'Code, discount percentage, and expiry days are required.'}), 400
        
    try:
        discount_percentage = int(discount_percentage)
        days_valid = int(days_valid)
        min_cart_value = int(min_cart_value)
        if not (1 <= discount_percentage <= 99):
            return jsonify({'message': 'Discount percentage must be between 1 and 99.'}), 400
    except ValueError:
        return jsonify({'message': 'Invalid numbers provided.'}), 400
        
    # Check if code already exists for this seller
    existing = Coupon.query.filter_by(seller_id=current_user.id, code=code).first()
    if existing:
        return jsonify({'message': 'You already have a coupon with this code.'}), 400
        
    expires_at = datetime.utcnow() + timedelta(days=days_valid)
    
    coupon = Coupon(
        code=code,
        discount_percentage=discount_percentage,
        seller_id=current_user.id,
        expires_at=expires_at,
        min_cart_value=min_cart_value
    )
    
    db.session.add(coupon)
    db.session.commit()
    
    return jsonify({'message': 'Coupon created successfully!', 'coupon': coupon.to_dict()}), 201
