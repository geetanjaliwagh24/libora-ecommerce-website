import datetime
import random
from app import create_app
from app.models import db, User, Product, Order, OrderItem, FraudLog, Seller

app = create_app()
with app.app_context():
    # 1. Find the apex_seller and cheap_seller accounts
    sellers_to_seed = ['apex_seller@marketplace.com', 'cheap_seller@marketplace.com']
    
    for seller_email in sellers_to_seed:
        seller_user = User.query.filter_by(email=seller_email).first()
        if not seller_user:
            print(f"Seller user not found: {seller_email}")
            continue
            
        seller_profile = Seller.query.get(seller_user.id)
        if not seller_profile:
            print(f"Seller profile not found for: {seller_email}")
            continue
            
        # 2. Get this seller's products
        seller_products = Product.query.filter_by(seller_id=seller_user.id).all()
        if not seller_products:
            print(f"No products found for {seller_email}")
            continue
            
        print(f"Found {len(seller_products)} products for {seller_email}. Seeding orders...")
        
        # 3. Find a buyer
        buyer = User.query.filter_by(email='buyer@marketplace.com').first()
        if not buyer:
            buyer = User.query.filter_by(role='buyer').first()
        if not buyer:
            print("No buyer found!")
            continue

        rules = [
            "Velocity Limit exceeded", 
            "Price anomaly", 
            "High volume unverified merchant"
        ]
        
        start_date = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        
        # 4. Generate 20 paid orders per seller 
        for i in range(20):
            day_offset = random.randint(0, 7)
            hour_offset = random.randint(0, 23)
            order_date = start_date + datetime.timedelta(days=day_offset, hours=hour_offset)
            
            # Pick 1-2 products from THIS seller's catalog
            chosen_products = random.sample(seller_products, k=min(len(seller_products), random.randint(1, 2)))
            total_amount = 0.0
            
            order = Order(
                user_id=buyer.id,
                total_amount=0.0,
                status='Delivered',
                created_at=order_date,
                billing_address="Flat 402, Matrix Cyber Towers, Mumbai",
                delivery_address="Flat 402, Matrix Cyber Towers, Mumbai",
                payment_method=random.choice(['UPI', 'Card', 'NetBanking']),
                payment_status='Paid',
                device_ip=f"192.168.1.{random.randint(10, 250)}",
                device_fingerprint=f"fp_{random.randint(1000, 9999)}"
            )
            db.session.add(order)
            db.session.flush()
            
            for p in chosen_products:
                qty = random.randint(1, 3)
                total_amount += (p.price * qty)
                item = OrderItem(
                    order_id=order.id,
                    product_id=p.id,
                    quantity=qty,
                    price=p.price
                )
                db.session.add(item)
                
            order.total_amount = total_amount
            
            # Occasional fraud flags (~30%)
            if random.random() < 0.3:
                log = FraudLog(
                    order_id=order.id,
                    user_id=buyer.id,
                    seller_id=seller_user.id,
                    rule_triggered=random.choice(rules),
                    risk_score=random.uniform(55.0, 95.0),
                    details="Auto-flagged during transaction analysis.",
                    status='Pending',
                    created_at=order_date
                )
                db.session.add(log)
        
        # 5. Update seller stats
        from sqlalchemy import func, distinct
        sales_sum = db.session.query(func.sum(OrderItem.price * OrderItem.quantity))\
            .join(Product, Product.id == OrderItem.product_id)\
            .join(Order, Order.id == OrderItem.order_id)\
            .filter(Product.seller_id == seller_user.id)\
            .filter(Order.payment_status == 'Paid')\
            .scalar() or 0.0
            
        order_count = db.session.query(func.count(distinct(Order.id)))\
            .join(OrderItem, OrderItem.order_id == Order.id)\
            .join(Product, Product.id == OrderItem.product_id)\
            .filter(Product.seller_id == seller_user.id)\
            .filter(Order.payment_status == 'Paid')\
            .scalar() or 0

        seller_profile.total_sales = sales_sum
        seller_profile.order_count = order_count
        seller_profile.rating = round(random.uniform(4.2, 4.9), 1)
        seller_profile.return_count = random.randint(0, max(1, int(order_count * 0.1)))
        seller_profile.complaint_count = random.randint(0, max(1, int(order_count * 0.05)))
        
        db.session.commit()
        print(f"Done: {seller_email} - {order_count} total orders, INR {round(sales_sum, 2)} revenue")

    print("\nAll analytics data seeded successfully!")
