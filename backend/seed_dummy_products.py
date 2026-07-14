from app import create_app
from app.models import db, User, Seller, Category, Product, Review
import random

app = create_app()

dummy_products = [
    # Fashion (Men)
    {"name": "Roadster Men Cotton Casual Shirt", "cat": "Casual Shirts", "price": 799, "img": "https://images.unsplash.com/photo-1596755094514-f87e32f85e23?w=500&q=80"},
    {"name": "Puma Men Enzo Running Shoes", "cat": "Sports Shoes", "price": 2499, "img": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80"},
    {"name": "Levis Men 511 Slim Fit Jeans", "cat": "Jeans", "price": 1899, "img": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80"},
    {"name": "WROGN Men Olive Green Jacket", "cat": "Jackets", "price": 2199, "img": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&q=80"},
    {"name": "Fastrack Men Analog Watch", "cat": "Watches", "price": 1499, "img": "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80"},
    
    # Fashion (Women)
    {"name": "Biba Women Floral Printed Kurta", "cat": "Kurtis, Tunics & Tops", "price": 1299, "img": "https://images.unsplash.com/photo-1583391733958-67520c5bf183?w=500&q=80"},
    {"name": "H&M Women Solid A-Line Dress", "cat": "Dresses", "price": 1499, "img": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80"},
    {"name": "MAC Ruby Woo Matte Lipstick", "cat": "Lipstick", "price": 1950, "img": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&q=80"},
    {"name": "Loreal Paris Revitalift Serum", "cat": "Serum", "price": 899, "img": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80"},
    {"name": "Catwalk Women Block Heels", "cat": "Heels", "price": 1699, "img": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&q=80"},

    # Home & Living
    {"name": "Portico New York Double Bedsheet", "cat": "Bedsheets", "price": 1199, "img": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&q=80"},
    {"name": "Philips 12W LED Bulb (Pack of 4)", "cat": "Lamps & Lighting", "price": 499, "img": "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=500&q=80"},
    {"name": "Borosil Glass Lunch Box Set", "cat": "Kitchen Storage & Tools", "price": 850, "img": "https://images.unsplash.com/photo-1584346808796-03fbd259f9eb?w=500&q=80"},
    {"name": "Milton Thermosteel Flask 1L", "cat": "Bar & Drinkware", "price": 999, "img": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80"},
    
    # Kids
    {"name": "Gini & Jony Boys Cotton T-Shirt", "cat": "T-Shirts", "price": 499, "img": "https://images.unsplash.com/photo-1519241047957-be31d7379a5d?w=500&q=80"},
    {"name": "Allen Solly Junior Girls Top", "cat": "Tops", "price": 599, "img": "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500&q=80"},
    {"name": "Hot Wheels 5-Car Gift Pack", "cat": "Toys & Accessories", "price": 799, "img": "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=500&q=80"},
    
    # Electronics / Gadgets (mapped to Gadgets or Watches)
    {"name": "Sony WH-1000XM4 Wireless Headphones", "cat": "Gadgets", "price": 24990, "img": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80"},
    {"name": "Apple Watch Series 8", "cat": "Watches", "price": 41900, "img": "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=500&q=80"},
    {"name": "Samsung Galaxy S23 Ultra", "cat": "Gadgets", "price": 124999, "img": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80"}
]

with app.app_context():
    # 1. Ensure a user exists to act as the seller and reviewer
    user = User.query.filter_by(email="seller@example.com").first()
    if not user:
        user = User(email="seller@example.com", role="seller")
        user.set_password("password")
        db.session.add(user)
        db.session.commit()
        
    buyer = User.query.filter_by(email="buyer@example.com").first()
    if not buyer:
        buyer = User(email="buyer@example.com", role="buyer")
        buyer.set_password("password")
        db.session.add(buyer)
        db.session.commit()

    # 2. Ensure seller profile exists
    seller = Seller.query.get(user.id)
    if not seller:
        seller = Seller(id=user.id, business_name="Amazon Retail Hub", is_kyc_verified=True)
        db.session.add(seller)
        db.session.commit()

    # 3. Add products
    added_count = 0
    for p_data in dummy_products:
        cat_name = p_data["cat"]
        # Find category by name (assuming the leaf categories from update_categories_force exist)
        category = Category.query.filter_by(name=cat_name).first()
        if not category:
            print(f"Skipping {p_data['name']} - Category {cat_name} not found.")
            continue
            
        prod = Product(
            seller_id=seller.id,
            name=p_data["name"],
            description=f"Premium quality {p_data['name']} designed for ultimate comfort and durability. This is a dummy description added by the seed script.",
            price=p_data["price"],
            stock=random.randint(10, 200),
            category_id=category.id,
            images=p_data["img"]
        )
        db.session.add(prod)
        db.session.flush() # get prod.id
        
        # Add random reviews
        num_reviews = random.randint(1, 15)
        for _ in range(num_reviews):
            review = Review(
                user_id=buyer.id,
                product_id=prod.id,
                rating=random.randint(3, 5), # 3 to 5 stars
                comment="Great product! Would buy again.",
                is_verified_purchase=True
            )
            db.session.add(review)
            
        added_count += 1
        
    db.session.commit()
    print(f"Successfully seeded {added_count} products and reviews!")
