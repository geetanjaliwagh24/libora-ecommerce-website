import datetime
import random
from app import create_app
from app.models import db, User, Product, Order, OrderItem, FraudLog, Seller

app = create_app()
with app.app_context():
    # 1. Fetch or create a buyer user
    buyer = User.query.filter_by(role='buyer').first()
    if not buyer:
        buyer = User(email='buyer_dummy@marketplace.com', role='buyer')
        buyer.set_password('password123')
        db.session.add(buyer)
        db.session.commit()
        
    seller = Seller.query.first()
    if not seller:
        print("No seller found to attribute sales stats to!")
        exit()

    # 2. Get some products
    products = Product.query.all()
    if not products:
        print("No products found in DB. Please make sure the DB is seeded first.")
        exit()

    # 3. Generate paid orders for the past 7 days to populate timelines
    start_date = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    
    rules = [
        "Velocity Limit exceeded", 
        "Price anomaly", 
        "High volume unverified merchant"
    ]
    
    print("Seeding dummy orders for charts and analytics...")
    
    for i in range(25):
        # Evenly spread orders over the last 7 days
        day_offset = random.randint(0, 7)
        hour_offset = random.randint(0, 23)
        order_date = start_date + datetime.timedelta(days=day_offset, hours=hour_offset)
        
        # Pick 1-2 random products
        order_products = random.sample(products, k=min(len(products), random.randint(1, 2)))
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
            device_fingerprint=f"dummy_fingerprint_{random.randint(1000, 9999)}"
        )
        db.session.add(order)
        db.session.flush() # generates order.id
        
        for p in order_products:
            qty = random.randint(1, 3)
            item_price = p.price
            total_amount += (item_price * qty)
            
            item = OrderItem(
                order_id=order.id,
                product_id=p.id,
                quantity=qty,
                price=item_price
            )
            db.session.add(item)
            
        order.total_amount = total_amount
        
        # Generate some fraud logs for about 40% of the orders
        if random.random() < 0.4:
            rule = random.choice(rules)
            risk = random.uniform(55.0, 98.0)
            
            # Find the seller associated with the first product in the order
            first_product = order_products[0]
            prod_seller_id = first_product.seller_id
            
            log = FraudLog(
                order_id=order.id,
                user_id=buyer.id,
                seller_id=prod_seller_id,
                rule_triggered=rule,
                risk_score=risk,
                details=f"Automatic safety flag: {rule} detected during transaction sequence analysis.",
                status='Pending',
                created_at=order_date
            )
            db.session.add(log)
            
    db.session.commit()
    
    # 4. Recalculate seller statistics based on all order items
    all_sellers = Seller.query.all()
    for s in all_sellers:
        # Sum of paid orders
        sales_sum = db.session.query(db.func.sum(OrderItem.price * OrderItem.quantity))\
            .join(Product, Product.id == OrderItem.product_id)\
            .join(Order, Order.id == OrderItem.order_id)\
            .filter(Product.seller_id == s.id)\
            .filter(Order.payment_status == 'Paid')\
            .scalar() or 0.0
            
        order_count = db.session.query(db.func.count(db.distinct(Order.id)))\
            .join(OrderItem, OrderItem.order_id == Order.id)\
            .join(Product, Product.id == OrderItem.product_id)\
            .filter(Product.seller_id == s.id)\
            .filter(Order.payment_status == 'Paid')\
            .scalar() or 0
            
        s.total_sales = sales_sum
        s.order_count = order_count
        s.rating = round(random.uniform(4.2, 4.9), 1)
        s.return_count = random.randint(0, int(order_count * 0.1) + 1)
        s.complaint_count = random.randint(0, int(order_count * 0.05) + 1)
        
    db.session.commit()
    print("Successfully seeded dummy paid order history, seller metrics, and fraud logs for analytics visualization!")
