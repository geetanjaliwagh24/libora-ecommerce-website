from flask import Blueprint, request, jsonify, current_app
from app.models import db, Order, OrderItem, CartItem, Product, Seller, FraudLog, SellerOrderSequence, Coupon, PaymentTransfer
from app.routes.auth_helper import token_required
from app.services.fraud_rules import evaluate_transaction_risk
from app import limiter
from datetime import datetime
import json
import razorpay

orders_bp = Blueprint('orders', __name__)

VALID_PAYMENT_METHODS = {'UPI', 'Card', 'COD', 'Razorpay'}

VALID_ORDER_STATUSES = {
    'Placed', 'Confirmed', 'Shipped', 'Delivered',
    'Return_Requested', 'Returned', 'Refunded'
}

def seller_has_order_item(seller_id, order):
    return any(
        item.product and item.product.seller_id == seller_id
        for item in order.items
    )

@orders_bp.route('', methods=['GET'])
@token_required
def get_orders(current_user):
    orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders]), 200

@orders_bp.route('/<int:order_id>', methods=['GET'])
@token_required
def get_order(current_user, order_id):
    order = db.get_or_404(Order, order_id)
    
    if current_user.role == 'buyer' and order.user_id != current_user.id:
        return jsonify({'message': 'Access denied'}), 403
    if current_user.role == 'seller' and not seller_has_order_item(current_user.id, order):
        return jsonify({'message': 'Access denied'}), 403
        
    return jsonify(order.to_dict()), 200

@orders_bp.route('/validate-coupon', methods=['POST'])
@token_required
def validate_coupon(current_user):
    data = request.get_json() or {}
    coupon_code = data.get('coupon_code')
    if not coupon_code:
        return jsonify({'message': 'Coupon code is required'}), 400
        
    coupon = Coupon.query.filter_by(code=coupon_code.strip().upper()).first()
    if not coupon or not coupon.is_active or coupon.expires_at < datetime.utcnow():
        return jsonify({'message': 'Invalid or expired coupon code'}), 400
        
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    if not cart_items:
        return jsonify({'message': 'Cart is empty'}), 400
        
    seller_cart_value = 0.0
    
    for item in cart_items:
        product = Product.query.get(item.product_id)
        if product and product.seller_id == coupon.seller_id:
            seller_cart_value += (product.discounted_price * item.quantity)
            
    if seller_cart_value == 0.0:
        return jsonify({'message': 'This coupon is not valid for any items in your cart'}), 400
        
    if coupon.min_cart_value and seller_cart_value < coupon.min_cart_value:
        return jsonify({'message': f'To redeem this coupon, your cart value for this seller must be at least ₹{coupon.min_cart_value}'}), 400
        
    coupon_discount = seller_cart_value * (coupon.discount_percentage / 100.0)
        
    return jsonify({
        'message': f'Coupon applied! {coupon.discount_percentage}% off eligible items.',
        'discount_amount': coupon_discount
    }), 200

@orders_bp.route('', methods=['POST'])
@token_required
@limiter.limit("10 per minute")
def create_order(current_user):
    data = request.get_json() or {}
    billing_address = data.get('billing_address')
    delivery_address = data.get('delivery_address')
    payment_method = data.get('payment_method')
    
    device_ip = request.remote_addr
    device_fingerprint = data.get('device_fingerprint', 'unknown_browser_client')
    
    if not billing_address or not delivery_address or not payment_method:
        return jsonify({'message': 'Billing/delivery addresses and payment method are required'}), 400
    if not current_user.address:
        return jsonify({'message': 'You must have a delivery address saved in your profile before checking out.'}), 400
    if payment_method not in VALID_PAYMENT_METHODS:
        return jsonify({'message': 'Invalid payment method'}), 400
        
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    if not cart_items:
        return jsonify({'message': 'Cart is empty'}), 400
        
    coupon_code = data.get('coupon_code')
    coupon = None
    if coupon_code:
        coupon = Coupon.query.filter_by(code=coupon_code.strip().upper()).first()
        if not coupon or not coupon.is_active or coupon.expires_at < datetime.utcnow():
            return jsonify({'message': 'Invalid or expired coupon code'}), 400

    # Calculate order total & check stock with pessimistic locking
    subtotal = 0.0
    coupon_discount = 0.0
    seller_cart_value = 0.0
    locked_products = {}
    for item in cart_items:
        product = Product.query.filter_by(id=item.product_id).with_for_update().first()
        if not product:
            return jsonify({'message': 'One of the items in your cart is no longer available'}), 404
        if product.sizes_dict and item.selected_size and isinstance(product.sizes_dict, dict):
            size_stock = product.sizes_dict.get(item.selected_size, 0)
            if size_stock < item.quantity:
                return jsonify({'message': f'Insufficient stock for {product.name} in size {item.selected_size}'}), 400
        elif product.stock < item.quantity:
            return jsonify({'message': f'Insufficient stock for {product.name}'}), 400
        item_total = product.discounted_price * item.quantity
        subtotal += item_total
        if coupon and product.seller_id == coupon.seller_id:
            seller_cart_value += item_total
            
        locked_products[item.product_id] = (product, item.quantity)

    if coupon:
        if seller_cart_value == 0.0:
            return jsonify({'message': 'This coupon is not valid for any items in your cart'}), 400
        if coupon.min_cart_value and seller_cart_value < coupon.min_cart_value:
            return jsonify({'message': f'To redeem this coupon, your cart value for this seller must be at least ₹{coupon.min_cart_value}'}), 400
        coupon_discount = seller_cart_value * (coupon.discount_percentage / 100.0)

    discounted_subtotal = subtotal - coupon_discount
    shipping_fee = 0.0 if discounted_subtotal > 1000 else 99.0
    tax_amount = discounted_subtotal * 0.18
    total_amount = discounted_subtotal + shipping_fee + tax_amount
        
    # Check velocity_score (time since last order)
    last_order = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).first()
    velocity_seconds = -1.0
    if last_order:
        time_diff = datetime.utcnow() - last_order.created_at
        velocity_seconds = time_diff.total_seconds()
        
    use_coins = data.get('use_coins', False)
    if use_coins and current_user.coins >= 100:
        # 100 style coins = 1 rupee discount
        discount = current_user.coins / 100.0
        # Deduct coins that are used
        if discount >= total_amount:
            coins_needed = int(total_amount * 100)
            current_user.coins -= coins_needed
            total_amount = 0.0
        else:
            current_user.coins = 0
            total_amount -= discount

            
    try:
        # 1. EVALUATE FRAUD RISK
        fraud_result = evaluate_transaction_risk(current_user.id, data, cart_items)
        
        # Calculate buyer sequence count
        buyer_seq = Order.query.filter_by(user_id=current_user.id).count() + 1

        # 2. CREATE ORDER
        order = Order(
            user_id=current_user.id,
            buyer_order_sequence=buyer_seq,
            total_amount=total_amount,
            platform_fee=round(subtotal * 0.10, 2),
            billing_address=billing_address,
            delivery_address=delivery_address,
            payment_method=payment_method,
            payment_status='Pending', # Always start online orders as Pending, COD is also Pending
            status='Placed',
            device_ip=device_ip,
            device_fingerprint=device_fingerprint,
            velocity_score=velocity_seconds
        )
        db.session.add(order)
        db.session.flush() # get order ID
        
        # Initialize Razorpay order if applicable
        razorpay_order_id = None
        razorpay_key_id = current_app.config.get('RAZORPAY_KEY_ID')
        razorpay_key_secret = current_app.config.get('RAZORPAY_KEY_SECRET')
        requires_payment = payment_method != 'COD' and total_amount > 0
        sandbox_mode = False

        if requires_payment:
            if razorpay_key_id and razorpay_key_secret:
                try:
                    client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
                    # Amount must be in paise (multiply by 100)
                    amount_paise = int(total_amount * 100)
                    rz_order = client.order.create({
                        'amount': amount_paise,
                        'currency': 'INR',
                        'receipt': f'order_receipt_{order.id}',
                        'payment_capture': 1
                    })
                    razorpay_order_id = rz_order['id']
                    order.razorpay_order_id = razorpay_order_id
                except Exception as rz_err:
                    current_app.logger.error(f"Failed to create Razorpay order: {str(rz_err)}")
                    # Fallback to sandbox mode if Razorpay client errors out
                    sandbox_mode = True
            else:
                # No keys, run in sandbox mode
                sandbox_mode = True
        else:
            # For COD or zero amount, mark as Paid if zero amount
            if total_amount == 0:
                order.payment_status = 'Paid'

        # 3. CREATE ORDER ITEMS & UPDATE PRODUCT STOCK & SELLER METRICS
        unique_seller_ids = set()
        for item in cart_items:
            product, quantity = locked_products[item.product_id]
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=quantity,
                price=product.discounted_price,
                selected_color=item.selected_color,
                selected_size=item.selected_size
            )
            db.session.add(order_item)
            
            # Decrease product stock
            if item.selected_size:
                sizes_dict = product.sizes_dict
                if sizes_dict and item.selected_size in sizes_dict:
                    sizes_dict[item.selected_size] -= quantity
                    product.sizes_dict = sizes_dict
            product.stock -= quantity
            
            # Increase seller sales metrics
            seller = db.session.get(Seller, product.seller_id)
            if seller:
                seller.total_sales += product.discounted_price * quantity
                seller.order_count += 1
                unique_seller_ids.add(seller.id)
                
        # Generate Seller Order Sequences
        for s_id in unique_seller_ids:
            seller_seq = SellerOrderSequence.query.filter_by(seller_id=s_id).count() + 1
            seq_rec = SellerOrderSequence(
                seller_id=s_id,
                order_id=order.id,
                sequence_number=seller_seq
            )
            db.session.add(seq_rec)
                
        # 4. LOG FRAUD TRIGGERS IF RISKY
        if fraud_result['is_flagged']:
            for flag in fraud_result['flags']:
                # Save log
                fraud_log = FraudLog(
                    order_id=order.id,
                    user_id=current_user.id,
                    seller_id=cart_items[0].product.seller_id if cart_items else None, # associate with first seller in cart
                    rule_triggered=flag['rule'],
                    risk_score=flag['score'],
                    details=flag['details'],
                    status='Pending'
                )
                db.session.add(fraud_log)
                
        # Award coins (5 coins per 100 spent)
        coins_earned = int((total_amount * 5) / 100)
        current_user.coins += coins_earned
                
        # Clear cart
        for item in cart_items:
            db.session.delete(item)
            
        db.session.commit()
        
        response_data = {
            'message': 'Order placed successfully' if not requires_payment else 'Order created. Payment required.',
            'requires_payment': requires_payment,
            'sandbox_mode': sandbox_mode,
            'order': order.to_dict(),
            'fraud_checked': {
                'is_flagged': fraud_result['is_flagged'],
                'risk_score': fraud_result['risk_score'],
                'flags': fraud_result['flags']
            }
        }

        if requires_payment:
            response_data.update({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_key_id': razorpay_key_id,
                'amount': int(total_amount * 100),
                'currency': 'INR'
            })
            
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to place order: {str(e)}'}), 500

def create_split_transfers(order, is_sandbox=False, client=None):
    # Group payouts by seller
    payouts = {}
    for item in order.items:
        if item.product:
            item_total = item.price * item.quantity
            seller_share = round(item_total * 0.90, 2) # Admin fee is 10%
            payouts[item.product.seller_id] = payouts.get(item.product.seller_id, 0.0) + seller_share

    for seller_id, amount in payouts.items():
        seller = db.session.get(Seller, seller_id)
        razorpay_transfer_id = None
        status = 'on_hold'

        if not is_sandbox and client and seller and seller.razorpay_account_id:
            try:
                # Razorpay Route API Call
                transfer_res = client.transfer.create({
                    'account': seller.razorpay_account_id,
                    'amount': int(amount * 100), # in paise
                    'currency': 'INR',
                    'on_hold': True
                })
                razorpay_transfer_id = transfer_res['id']
            except Exception as t_err:
                current_app.logger.error(f"Failed to create Razorpay transfer for seller {seller_id}: {str(t_err)}")
                razorpay_transfer_id = f"tfr_mock_{order.id}_{seller_id}"
        else:
            # Sandbox or mock fallback
            razorpay_transfer_id = f"tfr_mock_{order.id}_{seller_id}"

        # Create transfer record
        transfer = PaymentTransfer(
            order_id=order.id,
            seller_id=seller_id,
            razorpay_transfer_id=razorpay_transfer_id,
            amount=amount,
            status=status
        )
        db.session.add(transfer)

@orders_bp.route('/verify-payment', methods=['POST'])
@token_required
def verify_payment(current_user):
    data = request.get_json() or {}
    order_id = data.get('order_id')
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_signature = data.get('razorpay_signature')
    is_sandbox = data.get('is_sandbox', False)

    if not order_id:
        return jsonify({'message': 'Order ID is required'}), 400

    order = db.session.get(Order, order_id)
    if not order or order.user_id != current_user.id:
        return jsonify({'message': 'Order not found'}), 404

    # Run verification
    if is_sandbox or not current_app.config.get('RAZORPAY_KEY_SECRET'):
        # Mock payment verification for sandbox test cases
        order.payment_status = 'Paid'
        if order.payment_method == 'COD':
            order.payment_method = 'Razorpay'
        create_split_transfers(order, is_sandbox=True)
        db.session.commit()
        return jsonify({
            'message': 'Sandbox payment verified successfully',
            'order': order.to_dict()
        }), 200
    
    # Real signature verification
    if not razorpay_payment_id or not razorpay_signature:
        return jsonify({'message': 'Missing payment verification details'}), 400

    try:
        client = razorpay.Client(auth=(
            current_app.config['RAZORPAY_KEY_ID'],
            current_app.config['RAZORPAY_KEY_SECRET']
        ))
        
        # Verify the signature cryptographically
        client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id or order.razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        
        order.payment_status = 'Paid'
        if order.payment_method == 'COD':
            order.payment_method = 'Razorpay'
        order.razorpay_payment_id = razorpay_payment_id
        order.razorpay_order_id = razorpay_order_id or order.razorpay_order_id
        order.razorpay_signature = razorpay_signature
        create_split_transfers(order, is_sandbox=False, client=client)
        db.session.commit()
        
        return jsonify({
            'message': 'Payment verified successfully',
            'order': order.to_dict()
        }), 200
    except Exception as e:
        order.payment_status = 'Failed'
        db.session.commit()
        return jsonify({
            'message': f'Payment signature verification failed: {str(e)}'
        }), 400

@orders_bp.route('/<int:order_id>/pay-online', methods=['POST'])
@token_required
def pay_online(current_user, order_id):
    order = db.session.get(Order, order_id)
    if not order or order.user_id != current_user.id:
        return jsonify({'message': 'Order not found'}), 404
        
    if order.payment_status == 'Paid':
        return jsonify({'message': 'Order is already paid'}), 400
        
    if order.status in ['Returned', 'Refunded']:
        return jsonify({'message': 'Cannot pay for returned or refunded orders'}), 400

    razorpay_key_id = current_app.config.get('RAZORPAY_KEY_ID')
    razorpay_key_secret = current_app.config.get('RAZORPAY_KEY_SECRET')
    
    requires_payment = True
    sandbox_mode = False
    razorpay_order_id = None
    
    if razorpay_key_id and razorpay_key_secret:
        try:
            client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
            amount_paise = int(order.total_amount * 100)
            rz_order = client.order.create({
                'amount': amount_paise,
                'currency': 'INR',
                'receipt': f'order_receipt_{order.id}',
                'payment_capture': 1
            })
            razorpay_order_id = rz_order['id']
            order.razorpay_order_id = razorpay_order_id
            db.session.commit()
        except Exception as rz_err:
            current_app.logger.error(f"Failed to create Razorpay order for existing order {order.id}: {str(rz_err)}")
            sandbox_mode = True
    else:
        sandbox_mode = True

    response_data = {
        'requires_payment': requires_payment,
        'sandbox_mode': sandbox_mode,
        'order': order.to_dict(),
        'amount': int(order.total_amount * 100),
        'currency': 'INR'
    }
    
    if not sandbox_mode:
        response_data.update({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_key_id': razorpay_key_id
        })
        
    return jsonify(response_data), 200


def update_order_status_logic(order, new_status):
    old_status = order.status
    if old_status == new_status:
        return
        
    # 1. Update return count (only increment once when transitioning into return lifecycle)
    if (new_status in ['Return_Requested', 'Returned']) and (old_status not in ['Return_Requested', 'Returned']):
        for item in order.items:
            product = db.session.get(Product, item.product_id)
            if product:
                seller = db.session.get(Seller, product.seller_id)
                if seller:
                    seller.return_count += 1
                    
    # 2. Subtract price from seller total earnings if return is completed
    if new_status == 'Returned' and old_status != 'Returned':
        for item in order.items:
            product = db.session.get(Product, item.product_id)
            if product:
                seller = db.session.get(Seller, product.seller_id)
                if seller:
                    seller.total_sales = max(0.0, seller.total_sales - (item.price * item.quantity))
                    
    # 3. Award Style Coins to seller when order is delivered
    if new_status == 'Delivered' and old_status != 'Delivered':
        for item in order.items:
            product = db.session.get(Product, item.product_id)
            if product:
                seller = db.session.get(Seller, product.seller_id)
                if seller and seller.user:
                    # Award 1% of the item total in Style Coins
                    coins_earned = int((item.price * item.quantity) / 100)
                    seller.user.coins += coins_earned
                    
    # 4. Release or reverse Razorpay Route transfers
    client = None
    key_id = current_app.config.get('RAZORPAY_KEY_ID')
    key_secret = current_app.config.get('RAZORPAY_KEY_SECRET')
    if key_id and key_secret:
        client = razorpay.Client(auth=(key_id, key_secret))

    # Release held transfers when order is delivered
    if new_status == 'Delivered' and old_status != 'Delivered':
        transfers = PaymentTransfer.query.filter_by(order_id=order.id, status='on_hold').all()
        for t in transfers:
            if client and not t.razorpay_transfer_id.startswith('tfr_mock_'):
                try:
                    client.transfer.release(t.razorpay_transfer_id)
                    t.status = 'released'
                except Exception as ex:
                    current_app.logger.error(f"Failed to release Razorpay transfer {t.razorpay_transfer_id}: {str(ex)}")
                    t.status = 'released'
            else:
                t.status = 'released'

    # Reverse transfers and refund customer when order is refunded or returned
    if new_status in ['Refunded', 'Returned'] and old_status not in ['Refunded', 'Returned']:
        # 1. Reverse transfers
        transfers = PaymentTransfer.query.filter_by(order_id=order.id).all()
        for t in transfers:
            if t.status in ['on_hold', 'released']:
                if client and not t.razorpay_transfer_id.startswith('tfr_mock_'):
                    try:
                        client.transfer.reverse(t.razorpay_transfer_id)
                        t.status = 'reversed'
                    except Exception as ex:
                        current_app.logger.error(f"Failed to reverse Razorpay transfer {t.razorpay_transfer_id}: {str(ex)}")
                        t.status = 'reversed'
                else:
                    t.status = 'reversed'

        # 2. Trigger refund to customer
        if order.razorpay_payment_id and order.payment_status == 'Paid':
            if client and not order.razorpay_payment_id.startswith('pay_mock_'):
                try:
                    client.refund.create({
                        'payment_id': order.razorpay_payment_id,
                        'amount': int(order.total_amount * 100),
                        'speed': 'normal'
                    })
                    order.payment_status = 'Refunded'
                except Exception as ex:
                    current_app.logger.error(f"Failed to create Razorpay refund for payment {order.razorpay_payment_id}: {str(ex)}")
                    order.payment_status = 'Refunded'
            else:
                order.payment_status = 'Refunded'
                
    # 5. Handle Cash on Delivery (COD) payment status transitions
    if order.payment_method == 'COD':
        if new_status == 'Delivered' and old_status != 'Delivered':
            order.payment_status = 'Paid'
        elif new_status in ['Refunded', 'Returned'] and old_status not in ['Refunded', 'Returned']:
            order.payment_status = 'Refunded'

    order.status = new_status

@orders_bp.route('/<int:order_id>/status', methods=['PUT'])
@token_required
def update_order_status(current_user, order_id):
    order = db.get_or_404(Order, order_id)
    data = request.get_json() or {}
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({'message': 'Status is required'}), 400
    if new_status not in VALID_ORDER_STATUSES:
        return jsonify({'message': 'Invalid order status'}), 400
        
    if current_user.role == 'buyer':
        if order.user_id != current_user.id or new_status != 'Return_Requested':
            return jsonify({'message': 'Unauthorized to make this status change'}), 403
    elif current_user.role == 'seller':
        if not seller_has_order_item(current_user.id, order):
            return jsonify({'message': 'Access denied'}), 403
        if new_status not in {'Confirmed', 'Shipped', 'Delivered', 'Returned'}:
            return jsonify({'message': 'Unauthorized to make this status change'}), 403
    elif current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized to make this status change'}), 403
        
    try:
        update_order_status_logic(order, new_status)
        db.session.commit()
        return jsonify(order.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update status: {str(e)}'}), 500

@orders_bp.route('/<int:order_id>/return', methods=['POST'])
@token_required
def request_return(current_user, order_id):
    order = Order.query.get_or_404(order_id)
    if order.user_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403
        
    if order.status != 'Delivered':
        return jsonify({'message': 'Only delivered orders can be returned'}), 400
        
    days_since_order = (datetime.utcnow() - order.created_at).days
    if days_since_order > 14:
        return jsonify({'message': 'Return period (14 days) has expired'}), 400
        
    data = request.get_json()
    reason = data.get('reason', '').strip()
    
    if not reason:
        return jsonify({'message': 'Return reason is required'}), 400
        
    order.status = 'Return_Requested'
    order.return_reason = reason
    db.session.commit()
    
    return jsonify({'message': 'Return requested successfully', 'order': order.to_dict()}), 200
