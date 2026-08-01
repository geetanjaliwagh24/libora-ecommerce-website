import datetime
import random
from collections import defaultdict
from app import create_app
from app.models import db, User, Product, Order, OrderItem, FraudLog, Seller

app = create_app()
with app.app_context():
    print("Seeding order history for ALL sellers to enable rich Analytics...")

    sellers = Seller.query.all()
    buyers = User.query.filter_by(role='buyer').all()
    if not buyers:
        print("No buyers found!")
        exit(1)

    print(f"Found {len(sellers)} sellers and {len(buyers)} buyers.")

    rules = [
        "Velocity Limit exceeded", 
        "Price anomaly", 
        "High volume unverified merchant"
    ]

    now = datetime.datetime.utcnow()
    total_orders_created = 0
    total_items_created = 0

    for idx, seller in enumerate(sellers):
        seller_user = db.session.get(User, seller.id)
        if not seller_user:
            continue

        seller_products = Product.query.filter_by(seller_id=seller.id).all()
        if not seller_products:
            continue

        # Generate 15 to 30 orders spread across the last 30 days for each seller
        num_orders = random.randint(15, 30)
        
        for _ in range(num_orders):
            days_ago = random.randint(0, 30)
            hours_offset = random.randint(0, 23)
            order_date = now - datetime.timedelta(days=days_ago, hours=hours_offset)

            buyer = random.choice(buyers)
            chosen_products = random.sample(seller_products, k=min(len(seller_products), random.randint(1, 3)))
            
            order = Order(
                user_id=buyer.id,
                total_amount=0.0,
                status='Delivered',
                created_at=order_date,
                billing_address="Flat 402, Cyber Towers, Mumbai",
                delivery_address="Flat 402, Cyber Towers, Mumbai",
                payment_method=random.choice(['UPI', 'Card', 'NetBanking']),
                payment_status='Paid',
                device_ip=f"192.168.1.{random.randint(10, 250)}",
                device_fingerprint=f"fp_{random.randint(1000, 9999)}"
            )
            db.session.add(order)
            db.session.flush()

            order_total = 0.0
            for p in chosen_products:
                qty = random.randint(1, 4)
                price = p.discounted_price or p.price or 499.0
                item_sum = price * qty
                order_total += item_sum
                
                item = OrderItem(
                    order_id=order.id,
                    product_id=p.id,
                    quantity=qty,
                    price=price
                )
                db.session.add(item)
                total_items_created += 1

            order.total_amount = order_total
            total_orders_created += 1

            # Flag occasional fraud (~15%)
            if random.random() < 0.15:
                log = FraudLog(
                    order_id=order.id,
                    user_id=buyer.id,
                    seller_id=seller.id,
                    rule_triggered=random.choice(rules),
                    risk_score=random.uniform(55.0, 95.0),
                    details="Auto-flagged during volume transaction analysis.",
                    status='Pending',
                    created_at=order_date
                )
                db.session.add(log)

        if (idx + 1) % 20 == 0:
            db.session.commit()
            print(f"Processed {idx + 1}/{len(sellers)} sellers...")

    db.session.commit()
    print(f"\nSuccessfully seeded {total_orders_created} orders and {total_items_created} items across {len(sellers)} sellers!")
