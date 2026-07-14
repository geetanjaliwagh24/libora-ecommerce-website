from app import create_app
from app.models import db, User, Seller, Product, Order, OrderItem

app = create_app()
with app.app_context():
    seller_user = User.query.filter_by(email='apex_seller@marketplace.com').first()
    if not seller_user:
        print("User not found!")
        exit()
    
    print(f"apex_seller User ID: {seller_user.id}")
    
    seller_profile = Seller.query.get(seller_user.id)
    if seller_profile:
        print(f"Seller profile found: business_name={seller_profile.business_name}, total_sales={seller_profile.total_sales}, order_count={seller_profile.order_count}")
    else:
        print("No seller profile found!")
    
    products = Product.query.filter_by(seller_id=seller_user.id).all()
    print(f"\nProducts owned by seller (seller_id={seller_user.id}): {len(products)}")
    for p in products[:3]:
        print(f"  - [{p.id}] {p.name}")
    
    if products:
        # Check if any OrderItems exist for these products
        product_ids = [p.id for p in products]
        items = OrderItem.query.filter(OrderItem.product_id.in_(product_ids)).all()
        print(f"\nOrderItems for these products: {len(items)}")
        
        paid_items = [i for i in items if i.order.payment_status == 'Paid']
        print(f"OrderItems from PAID orders: {len(paid_items)}")
        
        if paid_items:
            total = sum(i.price * i.quantity for i in paid_items)
            print(f"Total revenue from paid items: INR {total}")
        else:
            print("No paid order items found!")
            # Check all orders
            all_orders = Order.query.all()
            print(f"\nTotal orders in DB: {len(all_orders)}")
            paid = [o for o in all_orders if o.payment_status == 'Paid']
            print(f"Total PAID orders in DB: {len(paid)}")
