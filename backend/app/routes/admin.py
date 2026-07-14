from flask import Blueprint, request, jsonify
from app.models import db, Seller, FraudLog, Order, Product, User
from app.routes.auth_helper import token_required, role_required
from app.routes.orders import update_order_status_logic
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/sellers', methods=['GET'])
@token_required
@role_required(['admin'])
def get_sellers(current_user):
    sellers = Seller.query.all()
    # Add email from User table
    results = []
    for s in sellers:
        d = s.to_dict()
        d['email'] = s.user.email
        results.append(d)
    return jsonify(results), 200

@admin_bp.route('/sellers/<int:seller_id>/verify', methods=['PUT'])
@token_required
@role_required(['admin'])
def verify_seller(current_user, seller_id):
    seller = db.get_or_404(Seller, seller_id)
    data = request.get_json() or {}
    approve = data.get('approve', True)
    rejection_reason = data.get('rejection_reason')
    
    try:
        seller.is_kyc_verified = approve
        if not approve:
            seller.kyc_rejection_reason = rejection_reason
        else:
            seller.kyc_rejection_reason = None
            
        db.session.commit()
        return jsonify({'message': f'Seller KYC status updated to {"Verified" if approve else "Rejected"}', 'seller': seller.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update seller verification: {str(e)}'}), 500

@admin_bp.route('/fraud-queue', methods=['GET'])
@token_required
@role_required(['admin'])
def get_fraud_queue(current_user):
    status_filter = request.args.get('status', 'Pending')
    logs = FraudLog.query.filter_by(status=status_filter).order_by(FraudLog.created_at.desc()).all()
    return jsonify([log.to_dict() for log in logs]), 200

@admin_bp.route('/fraud-queue/<int:log_id>', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_fraud_status(current_user, log_id):
    log = db.get_or_404(FraudLog, log_id)
    data = request.get_json() or {}
    new_status = data.get('status') # Approved (Confirmed Fraud) or Dismissed (Legitimate)
    
    if new_status not in ['Approved', 'Dismissed']:
        return jsonify({'message': 'Invalid status. Choose Approved or Dismissed'}), 400
        
    try:
        log.status = new_status
        # If confirmed fraud, update order payment status to Failed / Cancelled
        if new_status == 'Approved' and log.order_id:
            order = db.session.get(Order, log.order_id)
            if order:
                update_order_status_logic(order, 'Returned')
                order.payment_status = 'Refunded'
                
        db.session.commit()
        return jsonify({'message': 'Fraud status updated successfully', 'log': log.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update fraud log: {str(e)}'}), 500

@admin_bp.route('/stats', methods=['GET'])
@token_required
@role_required(['admin'])
def get_admin_stats(current_user):
    # Total revenue
    total_rev = db.session.query(func.sum(Order.total_amount)).filter(Order.payment_status == 'Paid').scalar() or 0.0
    
    # Platform revenue (coins + platform_fee)
    # We will just use platform_fee from Orders for now
    platform_revenue = db.session.query(func.sum(Order.platform_fee)).filter(Order.payment_status == 'Paid').scalar() or 0.0
    
    # Total orders count
    total_orders = Order.query.count()
    
    # Count flagged orders
    flagged_orders = Order.query.join(FraudLog, FraudLog.order_id == Order.id).distinct().count()
    
    # Unverified KYC seller count
    unverified_sellers = Seller.query.filter_by(is_kyc_verified=False).count()

    # 1. Category Breakdown (Join OrderItem -> Product -> Category)
    from app.models import OrderItem, Category
    cat_sales = db.session.query(
        Category.name, 
        func.sum(OrderItem.price * OrderItem.quantity)
    ).join(Product, Product.id == OrderItem.product_id)\
     .join(Category, Category.id == Product.category_id)\
     .join(Order, Order.id == OrderItem.order_id)\
     .filter(Order.payment_status == 'Paid')\
     .group_by(Category.name).all()
     
    category_breakdown = [{'name': cat_name, 'revenue': rev} for cat_name, rev in cat_sales]

    # 2. Seller Performance (Top Sellers)
    top_sellers = db.session.query(
        Seller.business_name,
        Seller.total_sales
    ).order_by(Seller.total_sales.desc()).limit(5).all()
    
    seller_performance = [{'name': name, 'revenue': rev} for name, rev in top_sellers]

    # 3. Monthly Sales (Last 6 Months approx, simple grouping by month/year)
    # PostgeSQL has TO_CHAR
    monthly_sales = db.session.query(
        func.to_char(Order.created_at, 'YYYY-MM').label('month'),
        func.sum(Order.total_amount).label('revenue')
    ).filter(Order.payment_status == 'Paid')\
     .group_by('month')\
     .order_by('month').limit(6).all()
     
    sales_trend = [{'date': month, 'amount': rev} for month, rev in monthly_sales]

    return jsonify({
        'total_revenue': total_rev,
        'platform_revenue': platform_revenue,
        'total_orders': total_orders,
        'flagged_orders': flagged_orders,
        'unverified_sellers': unverified_sellers,
        'category_breakdown': category_breakdown,
        'seller_performance': seller_performance,
        'sales_trend': sales_trend
    }), 200
