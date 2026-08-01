import random
import json
import time
from datetime import datetime
from app import create_app
from app.models import db, User, Seller, Category, Product, Review
from werkzeug.security import generate_password_hash

app = create_app()

BUSINESS_PREFIXES = ["Apex", "Zenith", "Royal", "Urban", "Vogue", "Elite", "Starlight", "Nova", "Heritage", "Bliss", "Prism", "Crown", "Velocity", "Aura", "Matrix", "Omni", "Luxe", "Titan", "Matrix", "Pulse"]
BUSINESS_SUFFIXES = ["Traders", "Enterprises", "Retail Hub", "Fashion Studio", "Apparel Co.", "Electronics Direct", "Lifestyle & Co.", "Boutique", "World", "Emporium", "Global", "Creation", "Store", "Exports"]

CATEGORIZED_PRODUCTS = {
    "Fashion": [
        "Slim Fit Casual Shirt", "Classic Cotton T-Shirt", "Slim Fit Denim Jeans", "Biker Leather Jacket",
        "Ethnic Silk Saree", "Floral Printed Kurti", "A-Line Party Dress", "Formal Trouser Pants",
        "Sports Running Shoes", "Classic Leather Loafers", "Analog Quartz Watch", "Polarized Sunglasses"
    ],
    "Electronics": [
        "Noise Cancelling Headphones", "Wireless Bluetooth Earbuds", "Smartwatch Series 5",
        "Fast Charging Power Bank", "Portable Bluetooth Speaker", "Mechanical Gaming Keyboard",
        "Ergonomic Wireless Mouse", "Ultra HD Smart TV Stick", "USB-C Multiport Adapter"
    ],
    "Home & Living": [
        "100% Cotton Bedsheet Set", "Ergonomic Memory Foam Pillow", "Glass Water Bottle 1L",
        "Non-Stick Cookware Set", "LED Desk Study Lamp", "Stainless Steel Cutlery Set",
        "Soft Microfiber Bath Towel", "Decorative Velvet Cushion Covers"
    ],
    "Beauty & Grooming": [
        "Hydrating Face Serum 30ml", "Matte Waterproof Lipstick", "Organic Herbal Shampoo",
        "Charcoal Facial Cleanser", "Sunscreen SPF 50 Gel", "Beard Grooming Oil"
    ]
}

IMAGES = [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1596755094514-f87e32f85e23?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=600"
]

def generate_data():
    start_time = time.time()
    with app.app_context():
        print("Starting Scalable Data Generation Process...")
        
        # Pre-hash standard password to save hashing CPU time
        hashed_password = generate_password_hash("Password123")
        
        # 1. Fetch categories
        categories = Category.query.all()
        if not categories:
            print("[ERROR] No categories found. Please run category initialization first.")
            return
            
        cat_ids = [c.id for c in categories]
        print(f"Found {len(cat_ids)} product categories.")

        # 2. Create 100 Sellers and corresponding User profiles
        print("Creating 100 Sellers and Business Profiles...")
        sellers_user_mappings = []
        for i in range(1, 101):
            sellers_user_mappings.append({
                'email': f'seller{i}_scale@marketplace.com',
                'password_hash': hashed_password,
                'role': 'seller',
                'phone': f'+9198{random.randint(10000000, 99999999)}',
                'address': f'{random.randint(1, 999)} Commerce Tower, Industrial Area, City #{i}',
                'is_email_verified': True,
                'coins': random.randint(100, 5000),
                'created_at': datetime.utcnow()
            })
            
        db.session.bulk_insert_mappings(User, sellers_user_mappings)
        db.session.commit()
        
        # Query created seller users to get their generated IDs
        seller_users = User.query.filter(User.email.like('seller%_scale@marketplace.com')).all()
        seller_ids = [u.id for u in seller_users]
        
        seller_profiles = []
        for idx, u_id in enumerate(seller_ids):
            b_name = f"{random.choice(BUSINESS_PREFIXES)} {random.choice(BUSINESS_SUFFIXES)}"
            seller_profiles.append({
                'id': u_id,
                'business_name': b_name,
                'gstin': f'27{random.choice("ABCDE")}{random.choice("FGHIJ")}1234{random.choice("KLMN")}1Z5',
                'bank_details': f'HDFC Bank, Account #{1000000000 + idx}, IFSC: HDFC0001234',
                'is_kyc_verified': True,
                'rating': round(random.uniform(4.0, 5.0), 1),
                'total_sales': float(random.randint(50000, 2000000)),
                'order_count': random.randint(50, 1000),
                'return_count': random.randint(0, 10),
                'complaint_count': random.randint(0, 5),
                'created_at': datetime.utcnow()
            })
            
        db.session.bulk_insert_mappings(Seller, seller_profiles)
        db.session.commit()
        print(f"Created {len(seller_ids)} Sellers successfully!")

        # 3. Create 100 Buyer Accounts
        print("Creating 100 Buyer Accounts...")
        buyer_mappings = []
        for i in range(1, 101):
            buyer_mappings.append({
                'email': f'buyer{i}_scale@marketplace.com',
                'password_hash': hashed_password,
                'role': 'buyer',
                'phone': f'+9197{random.randint(10000000, 99999999)}',
                'address': f'{random.randint(10, 500)} Park View Residency, Sector {random.randint(1, 50)}',
                'is_email_verified': True,
                'coins': random.randint(0, 2500),
                'created_at': datetime.utcnow()
            })
            
        db.session.bulk_insert_mappings(User, buyer_mappings)
        db.session.commit()
        
        buyer_users = User.query.filter(User.email.like('buyer%_scale@marketplace.com')).all()
        buyer_ids = [u.id for u in buyer_users]
        print(f"Created {len(buyer_ids)} Buyer Accounts!")

        # 4. Generate 100 to 200 Products PER Seller
        print("Bulk Generating 100 to 200 Products for EACH Seller...")
        all_product_categories = list(CATEGORIZED_PRODUCTS.keys())
        
        total_products_count = 0
        product_batch = []
        BATCH_SIZE = 3000

        for s_id in seller_ids:
            num_products = random.randint(100, 200) # 100 to 200 products per seller
            for _ in range(num_products):
                cat_group = random.choice(all_product_categories)
                base_name = random.choice(CATEGORIZED_PRODUCTS[cat_group])
                variant_name = f"{random.choice(BUSINESS_PREFIXES)} {base_name} #{random.randint(100, 999)}"
                price = float(random.randint(399, 14999))
                discount = random.choice([0, 10, 15, 20, 25, 30, 40, 50])
                stock = random.randint(5, 250)
                img = random.choice(IMAGES)
                
                # Sizes dict
                sizes_dict = json.dumps({"S": random.randint(5, 50), "M": random.randint(5, 50), "L": random.randint(5, 50), "XL": random.randint(5, 50)})
                
                product_batch.append({
                    'seller_id': s_id,
                    'category_id': random.choice(cat_ids),
                    'name': variant_name,
                    'description': f"Premium quality {variant_name}. High durability, stylish aesthetics, and premium craftsmanship designed for modern everyday use.",
                    'price': price,
                    'discount': discount,
                    'stock': stock,
                    'image_url': json.dumps([img]),
                    'sizes': sizes_dict,
                    'is_promoted': random.choice([True, False, False, False, False]), # ~20% promoted
                    'created_at': datetime.utcnow()
                })
                
                total_products_count += 1

                if len(product_batch) >= BATCH_SIZE:
                    db.session.bulk_insert_mappings(Product, product_batch)
                    db.session.commit()
                    print(f"   Saved batch... ({total_products_count} products committed)")
                    product_batch = []

        if product_batch:
            db.session.bulk_insert_mappings(Product, product_batch)
            db.session.commit()
            print(f"   Final batch committed! Total: {total_products_count} products.")

        # 5. Generate random product reviews
        print("Adding reviews to generated products...")
        inserted_products = Product.query.filter(Product.seller_id.in_(seller_ids)).all()
        review_batch = []
        
        sample_comments = [
            "Excellent build quality and fast delivery! Highly recommended.",
            "Really satisfied with this purchase. Worth every penny.",
            "Great fit and stylish design. Five stars!",
            "Good product for the price. Would buy again.",
            "Awesome quality! Exceeded my expectations."
        ]
        
        for p in random.sample(inserted_products, min(len(inserted_products), 2500)):
            review_batch.append({
                'user_id': random.choice(buyer_ids),
                'product_id': p.id,
                'rating': random.randint(4, 5),
                'comment': random.choice(sample_comments),
                'is_verified_purchase': True,
                'created_at': datetime.utcnow()
            })
            
        db.session.bulk_insert_mappings(Review, review_batch)
        db.session.commit()

        elapsed = round(time.time() - start_time, 2)
        print("\n=======================================================")
        print(f"SUCCESS! Bulk Seeding Complete in {elapsed} seconds!")
        print(f"   - Total Sellers: 100")
        print(f"   - Total Buyers: 100")
        print(f"   - Total Products Added: {total_products_count:,}")
        print(f"   - Credentials: password for all created test accounts is 'Password123'")
        print("=======================================================\n")

if __name__ == '__main__':
    generate_data()
