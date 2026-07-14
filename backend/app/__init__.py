from flask import Flask, jsonify
from flask_cors import CORS
from app.models import db, User, Seller, Category, Product
from config import Config
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://"
)

import os

def create_app(config_class=Config):
    # Calculate the path to the frontend's dist directory
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    frontend_dist = os.path.join(base_dir, 'frontend', 'dist')
    
    app = Flask(__name__, static_folder=frontend_dist, static_url_path='/')
    app.config.from_object(config_class)
    if hasattr(config_class, 'validate') and not app.config.get('TESTING'):
        config_class.validate()
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=app.config.get('ALLOWED_ORIGINS', []))
    limiter.init_app(app)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        try:
            db.session.execute(db.text('SELECT 1'))
            return jsonify({
                'status': 'healthy',
                'database': 'connected'
            }), 200
        except Exception as e:
            app.logger.error(f"Health check database query failed: {str(e)}")
            return jsonify({
                'status': 'unhealthy',
                'database': 'error',
                'details': str(e) if app.debug else 'Database connectivity failed'
            }), 500

    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        if response.content_type == 'application/json':
            response.headers['Content-Security-Policy'] = "default-src 'none'"
        return response


    # Logging and global error handling
    import logging
    from werkzeug.exceptions import HTTPException
    from flask_limiter.errors import RateLimitExceeded

    if not app.debug:
        logging.basicConfig(level=logging.INFO)
    
    @app.errorhandler(RateLimitExceeded)
    def handle_rate_limit(e):
        return jsonify({
            'message': f'Rate limit exceeded: {e.description}'
        }), 429

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        return jsonify({
            'message': e.description
        }), e.code

    @app.errorhandler(Exception)
    def handle_unexpected_exception(e):
        app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
        return jsonify({
            'message': 'An unexpected error occurred. Please try again later.'
        }), 500

    
    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.products import products_bp
    from app.routes.cart import cart_bp
    from app.routes.orders import orders_bp
    from app.routes.seller import seller_bp
    from app.routes.admin import admin_bp
    from app.routes.reviews import reviews_bp
    from app.routes.wishlist import wishlist_bp
    from app.routes.ai import ai_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(seller_bp, url_prefix='/api/seller')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(wishlist_bp, url_prefix='/api/wishlist')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    
    # Unified Serving: serve frontend index.html for all non-API routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path.startswith('api/'):
            return jsonify({'error': 'Not Found'}), 404
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return app.send_static_file(path)
        return app.send_static_file('index.html')
    
    # Database initialization and seeding
    with app.app_context():
        db.create_all()
        if app.config.get('SEED_DEMO_DATA'):
            seed_database()
        
    return app

def seed_database():
    # 1. Seed categories if missing (permanent fix for missing categories)
    if Category.query.count() == 0:
        print("Categories table is empty. Auto-seeding categories...")
        main_categories = {
            'MEN': {
                'Topwear': ['T-Shirts', 'Casual Shirts', 'Formal Shirts', 'Jackets', 'Sweaters', 'Sweatshirts', 'Blazers'],
                'Bottomwear': ['Jeans', 'Casual Trousers', 'Formal Trousers', 'Shorts', 'Track Pants', 'Joggers'],
                'Footwear': ['Sneakers', 'Sports Shoes', 'Formal Shoes', 'Casual Shoes', 'Sandals', 'Flip Flops'],
                'Accessories': ['Watches', 'Sunglasses', 'Belts', 'Wallets', 'Bags', 'Ties', 'Caps'],
                'Innerwear & Sleepwear': ['Briefs', 'Trunks', 'Boxers', 'Vests', 'Sleepwear']
            },
            'WOMEN': {
                'Indian Wear': ['Kurtas & Suits', 'Sarees', 'Lehengas', 'Kurtis', 'Tunics', 'Skirts', 'Palazzos', 'Leggings', 'Salwars', 'Dupattas'],
                'Western Wear': ['Dresses', 'Tops', 'T-Shirts', 'Jeans', 'Trousers', 'Shorts', 'Skirts', 'Jackets', 'Sweaters', 'Jumpsuits', 'One Piece', 'Bottoms', 'Activewear'],
                'Footwear': ['Heels', 'Flats', 'Sneakers', 'Casual Shoes', 'Sports Shoes', 'Boots', 'Wedges'],
                'Accessories': ['Handbags', 'Jewellery', 'Sunglasses', 'Watches', 'Belts', 'Scarves', 'Hair Accessories'],
                'Innerwear & Sleepwear': ['Bras', 'Panties', 'Shapewear', 'Sleepwear', 'Loungewear'],
                'Beauty & Personal Care': ['Makeup', 'Skincare', 'Haircare', 'Fragrances', 'Bath & Body']
            },
            'KIDS': {
                'Boys': ['T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Shorts', 'Ethnic Wear', 'Nightwear', 'Jackets'],
                'Girls': ['Dresses', 'Tops', 'T-Shirts', 'Jeans', 'Trousers', 'Skirts', 'Shorts', 'Ethnic Wear', 'Nightwear'],
                'Infants': ['Rompers', 'Bodysuits', 'Sets', 'Sleepsuits', 'Innerwear', 'Accessories'],
                'Toys & Games': ['Educational', 'Action Figures', 'Board Games', 'Soft Toys', 'Puzzles', 'Outdoor Play'],
                'Footwear': ['Sneakers', 'Sandals', 'Casual Shoes', 'Sports Shoes', 'Boots', 'Flats']
            },
            'LIVING': {
                'Furniture': ['Sofas', 'Tables', 'Storage', 'Beds', 'Chairs', 'Wardrobes', 'Bookshelves'],
                'Kitchen & Dining': ['Cookware', 'Dinnerware', 'Coffee & Tea', 'Cutlery', 'Drinkware', 'Kitchen Storage'],
                'Decor': ['Wall Art', 'Candles & Diffusers', 'Rugs', 'Vases', 'Mirrors', 'Clocks', 'Indoor Plants'],
                'Bed & Bath': ['Bedsheets', 'Towels', 'Pillows', 'Blankets', 'Cushions', 'Bath Rugs'],
                'Lighting': ['Lamps', 'Ceiling Lights', 'Wall Lights', 'String Lights', 'Outdoor Lighting']
            },
            'COSMETICS': {
                'Makeup': ['Lipstick', 'Foundation', 'Eye Makeup', 'Nail Polish', 'Primers', 'Concealers', 'Blushes'],
                'Skincare': ['Moisturisers', 'Serums', 'Sunscreen', 'Cleansers', 'Toners', 'Masks', 'Lip Care'],
                'Haircare': ['Shampoo', 'Conditioner', 'Hair Oils', 'Hair Masks', 'Styling Products', 'Hair Tools'],
                'Fragrances': ['Perfumes', 'Body Mists', 'Deodorants', 'Colognes'],
                'Bath & Body': ['Body Wash', 'Body Lotions', 'Scrubs', 'Hand Creams', 'Bath Salts'],
                "Men's Grooming": ['Shaving', 'Beard Care', 'Skincare', 'Haircare', 'Fragrances']
            },
            'ELECTRONICS': {
                'Mobiles': ['Smartphones', 'Feature Phones', 'Mobile Accessories', 'Cases & Covers', 'Power Banks'],
                'Laptops & Computers': ['Laptops', 'Desktops', 'Monitors', 'PC Components', 'Keyboards', 'Mice', 'Storage'],
                'Audio': ['Headphones', 'Earbuds', 'Speakers', 'Soundbars', 'Home Theatre'],
                'Wearables': ['Smartwatches', 'Fitness Bands', 'VR Headsets'],
                'Cameras': ['DSLR', 'Mirrorless', 'Action Cameras', 'Camera Accessories', 'Lenses', 'Drones'],
                'Home Appliances': ['Televisions', 'Washing Machines', 'Refrigerators', 'Air Conditioners', 'Microwaves', 'Vacuum Cleaners'],
                'Personal Care': ['Trimmers', 'Hair Dryers', 'Straighteners', 'Epilators', 'Shavers']
            }
        }
        
        for main_name, groups in main_categories.items():
            main_cat = Category(name=main_name)
            db.session.add(main_cat)
            db.session.commit()
            
            for group_name, subs in groups.items():
                group_cat = Category(name=group_name, parent_id=main_cat.id)
                db.session.add(group_cat)
                db.session.commit()
                
                for sub_name in subs:
                    sub_cat = Category(name=sub_name, parent_id=group_cat.id)
                    db.session.add(sub_cat)
                    
        db.session.commit()
        print("Auto-seeding of categories completed successfully!")

    # Only seed remaining demo data (Users, Sellers, Products) if User table is empty
    if User.query.first():
        return
        
    print("Seeding database with demo marketplace data...")
    
    # 1. Create Admins, Sellers, and Buyers
    admin = User(email='admin@marketplace.com', role='admin', phone='9876543210', address='Marketplace HQ, Delhi')
    admin.set_password('admin123')
    
    seller1 = User(email='apex_seller@marketplace.com', role='seller', phone='9876543211', address='12 Textile Zone, Surat')
    seller1.set_password('seller123')
    
    seller2 = User(email='cheap_seller@marketplace.com', role='seller', phone='9876543212', address='404 Grey Market, Delhi')
    seller2.set_password('seller123')
    
    buyer = User(email='buyer@marketplace.com', role='buyer', phone='9876543213', address='221B Baker St, Mumbai, Maharashtra')
    buyer.set_password('buyer123')
    
    db.session.add_all([admin, seller1, seller2, buyer])
    db.session.commit() # Save users to get their IDs
    
    # Create Seller Profiles
    apex_profile = Seller(
        id=seller1.id,
        business_name='Apex Fashion Retail',
        gstin='24AAAAB1111A1Z1',
        bank_details='HDFC Bank, Acct 501002345678',
        is_kyc_verified=True,
        rating=4.8,
        total_sales=45000.0,
        order_count=15
    )
    
    cheap_profile = Seller(
        id=seller2.id,
        business_name='Shady Discount Mall',
        gstin='07BBBBB2222B2Z2',
        bank_details='SBI, Acct 1029384756',
        is_kyc_verified=False, # Unverified KYC to trigger fraud alerts
        rating=3.2,
        total_sales=2500.0,
        order_count=5,
        complaint_count=2
    )
    
    db.session.add_all([apex_profile, cheap_profile])
    db.session.commit()
    
    # Retrieve categories to construct category_map for product seeding
    category_map = {}
    all_cats = Category.query.all()
    # Build maps
    for cat_obj in all_cats:
        if cat_obj.parent_id is not None:
            parent_cat = db.session.get(Category, cat_obj.parent_id)
            if parent_cat and parent_cat.parent_id is not None:
                root_cat = db.session.get(Category, parent_cat.parent_id)
                if root_cat:
                    category_map[(root_cat.name, cat_obj.name)] = cat_obj
        category_map[cat_obj.name] = cat_obj
    
    # Helper to get category
    def cat(main, sub):
        return category_map.get((main, sub)) or category_map.get(sub)

    # 3. Create Products
    p1 = Product(
        seller_id=seller1.id,
        name='Premium Silk Kanjivaram Saree',
        description='Elegant handwoven silk saree with intricate gold zari borders, perfect for wedding seasons and celebrations.',
        price=2999.0,
        stock=50,
        category_id=cat('WOMEN', 'Sarees').id,
        images=[
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    p2 = Product(
        seller_id=seller1.id,
        name='Slim Fit Leather Jacket',
        description='100% genuine black biker leather jacket with zip closure and premium interior lining.',
        price=4999.0,
        stock=20,
        category_id=cat('MEN', 'Jackets').id,
        images=[
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    p3 = Product(
        seller_id=seller2.id,
        name='Replica Gold Luxury Watch',
        description='Stunning heavy gold-plated luxury style watch. Super shiny. Grab it now!',
        price=99.0,
        stock=100,
        category_id=cat('MEN', 'Watches').id,
        images=[
            'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    p4 = Product(
        seller_id=seller2.id,
        name='SuperBass Wireless Earbuds',
        description='High fidelity sound with deep bass, Bluetooth 5.2, and up to 24 hours of battery life with case.',
        price=899.0,
        stock=150,
        category_id=cat('LIVING', 'Coffee & Tea').id,  # gadgets go to LIVING
        images=[
            'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    p5 = Product(
        seller_id=seller1.id,
        name='High-End Smartphone 128GB',
        description='Flagship mobile device with 6.7 inch AMOLED display, 50MP triple camera system, and 5G support.',
        price=39999.0,
        stock=15,
        category_id=cat('LIVING', 'Storage').id,
        images=[
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1565849906461-0e443307e838?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    p6 = Product(
        seller_id=seller1.id,
        name='Minimalist White Sneakers',
        description='Classic all-white leather sneakers with comfortable memory foam insoles. Perfect for everyday casual wear.',
        price=1499.0,
        stock=30,
        category_id=cat('MEN', 'Sneakers').id,
        images=[
            'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    p7 = Product(
        seller_id=seller1.id,
        name='Matte Black Coffee Mug Set',
        description='Set of 4 premium matte black ceramic mugs with wooden coasters. Aesthetic and durable.',
        price=799.0,
        stock=45,
        category_id=cat('LIVING', 'Coffee & Tea').id,
        images=[
            'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    p8 = Product(
        seller_id=seller2.id,
        name='Vintage Aviator Sunglasses',
        description='Retro-inspired aviator sunglasses with UV400 protection and gold-toned metallic frames.',
        price=499.0,
        stock=60,
        category_id=cat('MEN', 'Sunglasses').id,
        images=[
            'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    p9 = Product(
        seller_id=seller1.id,
        name='Over-Ear ANC Headphones',
        description='Professional active noise cancelling headphones with plush ear cushions and 40h battery.',
        price=3499.0,
        stock=25,
        category_id=cat('LIVING', 'Coffee & Tea').id,
        images=[
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    p10 = Product(
        seller_id=seller1.id,
        name='Floral Summer Maxi Dress',
        description='Breezy bohemian floral maxi dress in vibrant colors. Made from sustainable cotton.',
        price=1899.0,
        stock=40,
        category_id=cat('WOMEN', 'Dresses').id,
        images=[
            'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&q=80&w=600'
        ]
    )

    # LIVING products
    p11 = Product(
        seller_id=seller2.id,
        name='Scented Soy Candle Set',
        description='Set of 3 hand-poured soy wax candles in lavender, vanilla, and sandalwood. Up to 40 hours burn time each.',
        price=649.0,
        stock=80,
        category_id=cat('LIVING', 'Candles & Diffusers').id,
        images=[
            'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1602523960834-1aea6a74de78?auto=format&fit=crop&q=80&w=600'
        ]
    )

    p12 = Product(
        seller_id=seller1.id,
        name='Luxury Cotton Bedsheet Set',
        description='400 thread-count Egyptian cotton bedsheet set with 2 pillow covers. Cool, soft, and hotel-quality.',
        price=1299.0,
        stock=35,
        category_id=cat('LIVING', 'Bedsheets').id,
        images=[
            'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&q=80&w=600'
        ]
    )

    p13 = Product(
        seller_id=seller2.id,
        name='Boho Wall Tapestry',
        description='Large bohemian mandala wall art tapestry. Lightweight, machine-washable. Perfect for bedrooms.',
        price=449.0,
        stock=55,
        category_id=cat('LIVING', 'Wall Art').id,
        images=[
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&q=80&w=600'
        ]
    )

    # COSMETICS products
    p14 = Product(
        seller_id=seller1.id,
        name='Vitamin C Brightening Serum',
        description='10% Vitamin C + Hyaluronic Acid serum for radiant, even-toned skin. Dermatologist tested.',
        price=599.0,
        stock=120,
        category_id=cat('COSMETICS', 'Serums').id,
        images=[
            'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1601049676869-702ea24cfd58?auto=format&fit=crop&q=80&w=600'
        ]
    )

    p15 = Product(
        seller_id=seller2.id,
        name='Matte Liquid Lipstick (6-shade set)',
        description='Long-lasting transfer-proof matte formula in 6 gorgeous shades from nudes to bold reds.',
        price=799.0,
        stock=90,
        category_id=cat('COSMETICS', 'Lipstick').id,
        images=[
            'https://images.unsplash.com/photo-1586495777744-4e6f4c4c9e64?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1631214499236-e5fb70312a91?auto=format&fit=crop&q=80&w=600'
        ]
    )

    p16 = Product(
        seller_id=seller1.id,
        name='Eau de Parfum - Rose Oud',
        description='Oriental floral fragrance with top notes of rose, heart of oud, and base of musk & amber.',
        price=1899.0,
        stock=40,
        category_id=cat('COSMETICS', 'Perfumes').id,
        images=[
            'https://images.unsplash.com/photo-1541643600914-78b084683702?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1592945403536-29c5b5b1c1be?auto=format&fit=crop&q=80&w=600'
        ]
    )

    p17 = Product(
        seller_id=seller2.id,
        name='SPF 50+ Sunscreen Gel',
        description='Lightweight, non-greasy broad spectrum sunscreen. Water-resistant, reef-safe. 100ml.',
        price=349.0,
        stock=200,
        category_id=cat('COSMETICS', 'Sunscreen').id,
        images=[
            'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1618961861651-00fd7eef5fc5?auto=format&fit=crop&q=80&w=600'
        ]
    )

    # KIDS product
    p18 = Product(
        seller_id=seller1.id,
        name='Princess Frock - Party Wear',
        description='Gorgeous layered tulle party frock for girls aged 3-10. Available in pink, lavender, and gold.',
        price=899.0,
        stock=60,
        category_id=cat('KIDS', 'Dresses').id,
        images=[
            'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&q=80&w=600',
            'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=600'
        ]
    )
    
    db.session.add_all([p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18])
    db.session.commit()
    
    print("Database seeding completed successfully!")
