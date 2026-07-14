from flask import Blueprint, request, jsonify
from sqlalchemy.orm import joinedload, subqueryload
from app.models import db, Product, Category, Seller, BannerAd, Review, Order, OrderItem, Coupon, CartItem, WishlistItem
from datetime import datetime
from app.routes.auth_helper import token_required, role_required

products_bp = Blueprint('products', __name__)

def validate_product_payload(data):
    name = (data.get('name') or '').strip()
    description = data.get('description')
    price = data.get('price')
    stock = data.get('stock')
    category_id = data.get('category_id')
    images = data.get('images', [])
    discount = data.get('discount')
    group_id = data.get('group_id')
    color_name = data.get('color_name')
    sizes = data.get('sizes', {})

    if not name or price is None or stock is None or not category_id or discount is None:
        return None, 'Name, price, discount, stock, and category_id are required'

    try:
        price = float(price)
        stock = int(stock)
        category_id = int(category_id)
        discount = int(discount)
    except (TypeError, ValueError):
        return None, 'Price, stock, category_id, and discount must be valid numbers'

    if price <= 0:
        return None, 'Price must be greater than zero'
    if stock < 0:
        return None, 'Stock cannot be negative'
    if discount < 0 or discount > 99:
        return None, 'Discount must be between 0 and 99'
    if not isinstance(images, list) or len(images) < 1 or len(images) > 8:
        return None, 'Product must have between 1 and 8 image URLs'
    if not all(isinstance(url, str) and url.strip().startswith(('http://', 'https://')) for url in images):
        return None, 'All product images must be valid HTTP(S) URLs'
    
    if sizes and not isinstance(sizes, dict):
        return None, 'Sizes must be a dictionary of size to stock mappings'

    return {
        'name': name,
        'description': description,
        'price': price,
        'discount': discount,
        'stock': stock,
        'category_id': category_id,
        'images': [url.strip() for url in images],
        'group_id': group_id if group_id and str(group_id).strip() else None,
        'color_name': color_name if color_name and str(color_name).strip() else None,
        'sizes': sizes if isinstance(sizes, dict) else {}
    }, None

@products_bp.route('', methods=['GET'])
def get_products():
    category_id = request.args.get('category_id', type=int)
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    search_query = request.args.get('q', type=str)
    seller_id = request.args.get('seller_id', type=int)
    sort = request.args.get('sort', 'newest')
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', type=int)
    
    # Eager load relationships to avoid N+1 query problem during serialization
    query = Product.query.options(
        joinedload(Product.category).joinedload(Category.parent).joinedload(Category.parent),
        joinedload(Product.seller),
        subqueryload(Product.reviews)
    )
    
    if category_id:
        category = db.session.get(Category, category_id)
        if category:
            # Query all category IDs and parent IDs to avoid recursive database queries
            all_cats = db.session.query(Category.id, Category.parent_id).all()
            from collections import defaultdict
            parent_to_children = defaultdict(list)
            for cid, pid in all_cats:
                if pid is not None:
                    parent_to_children[pid].append(cid)
            
            cat_ids = []
            queue = [category_id]
            while queue:
                curr = queue.pop(0)
                cat_ids.append(curr)
                if curr in parent_to_children:
                    queue.extend(parent_to_children[curr])
            
            query = query.filter(Product.category_id.in_(cat_ids))
            
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
        
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
        
    if seller_id:
        query = query.filter(Product.seller_id == seller_id)
        
    products = query.all()
    
    if search_query:
        # Clean the query
        search_query_clean = search_query.lower().strip()
        words = [w for w in search_query_clean.split() if w]
        
        if words:
            import difflib
            
            def calculate_relevance(product):
                name_lower = product.name.lower()
                desc_lower = (product.description or '').lower()
                cat_lower = (product.category.name if product.category else '').lower()
                
                score = 0.0
                
                # 1. Exact phrase match
                if search_query_clean in name_lower:
                    score += 1.5
                elif search_query_clean in desc_lower:
                    score += 0.8
                    
                # 2. Category name exact match
                if cat_lower and (search_query_clean in cat_lower or cat_lower in search_query_clean):
                    score += 1.0
                    
                # 3. Individual word matches & fuzzy similarity
                word_matches = 0
                for word in words:
                    # Substring match
                    if word in name_lower:
                        score += 0.5
                        word_matches += 1
                    elif word in desc_lower:
                        score += 0.25
                        word_matches += 1
                    elif cat_lower and word in cat_lower:
                        score += 0.4
                        word_matches += 1
                    else:
                        # Fuzzy word match using difflib
                        name_words = name_lower.split()
                        best_ratio = 0.0
                        for nw in name_words:
                            ratio = difflib.SequenceMatcher(None, word, nw).ratio()
                            if ratio > best_ratio:
                                best_ratio = ratio
                        if best_ratio > 0.65:
                            score += 0.4 * best_ratio
                            word_matches += 1
                            
                        # Fuzzy category match
                        if cat_lower:
                            cat_words = cat_lower.split()
                            best_cat_ratio = 0.0
                            for cw in cat_words:
                                ratio = difflib.SequenceMatcher(None, word, cw).ratio()
                                if ratio > best_cat_ratio:
                                    best_cat_ratio = ratio
                            if best_cat_ratio > 0.65:
                                score += 0.3 * best_cat_ratio
                                word_matches += 1
                                
                # Boost products where at least one word matched
                if word_matches > 0:
                    score += 0.2 * (word_matches / len(words))
                    
                return score

            scored_products = []
            for p in products:
                score = calculate_relevance(p)
                if score > 0.2:  # relevance threshold
                    scored_products.append((p, score))
                    
            # Sort by relevance score descending
            scored_products.sort(key=lambda x: x[1], reverse=True)
            products = [sp[0] for sp in scored_products]
            
    # Apply sorting in memory to include all calculated fields like average rating
    if sort == 'price_asc':
        products = sorted(products, key=lambda p: p.price)
    elif sort == 'price_desc':
        products = sorted(products, key=lambda p: p.price, reverse=True)
    elif sort == 'rating':
        def avg_rating_key(p):
            ratings = [r.rating for r in p.reviews]
            avg = sum(ratings) / len(ratings) if ratings else 0
            return -avg
        products = sorted(products, key=avg_rating_key)
    else:
        # Default: only sort by created_at if not searching (since search has its own relevance sorting)
        if not search_query:
            products = sorted(products, key=lambda p: p.created_at, reverse=True)
        
    if page and per_page:
        total = len(products)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_products = products[start:end]
        import math
        pages = math.ceil(total / per_page)
        
        return jsonify({
            'products': [p.to_dict() for p in paginated_products],
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': pages,
            'has_next': page < pages,
            'has_prev': page > 1
        }), 200
        
    return jsonify([p.to_dict() for p in products]), 200

@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = db.get_or_404(Product, product_id)
    product_dict = product.to_dict()
    
    if product.group_id:
        variants = Product.query.filter(Product.group_id == product.group_id, Product.id != product.id).all()
        product_dict['variants'] = [{
            'id': v.id,
            'color_name': v.color_name,
            'image_url': v.images[0] if v.images else None
        } for v in variants]
        
    return jsonify(product_dict), 200

@products_bp.route('/<int:product_id>/recommendations', methods=['GET'])
def get_recommendations(product_id):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    # We will build recommendations based on:
    # 1. Recently viewed products (passed as query param ?viewed_ids=1,2,3)
    # 2. Category similarity (other products in same category)
    # 3. Order history (if user is authenticated)
    
    viewed_ids_param = request.args.get('viewed_ids', '')
    viewed_ids = []
    if viewed_ids_param:
        try:
            viewed_ids = [int(i.strip()) for i in viewed_ids_param.split(',') if i.strip()]
        except ValueError:
            pass
            
    # Optional: Get current user if token is provided
    # Instead of strict @token_required which errors out on guest users, we manually check Authorization header
    current_user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            import jwt
            from flask import current_app
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data.get('user_id')
        except Exception:
            pass
            
    # Accumulate categories of interest
    target_category_ids = {product.category_id}
    
    # Add categories from viewed products
    if viewed_ids:
        viewed_products = Product.query.filter(Product.id.in_(viewed_ids)).all()
        for vp in viewed_products:
            target_category_ids.add(vp.category_id)
            
    # Add categories from order history
    if current_user_id:
        # Get past order items
        past_items = OrderItem.query.join(Order).filter(
            Order.user_id == current_user_id
        ).all()
        for pi in past_items:
            if pi.product:
                target_category_ids.add(pi.product.category_id)
                
    # Now query for recommended products in the target categories
    # Exclude current product to avoid redundancy
    exclude_ids = {product.id}
    
    # Query up to 6 products
    query = Product.query.filter(
        Product.category_id.in_(list(target_category_ids)),
        Product.id.notin_(list(exclude_ids)),
        Product.stock > 0
    )
    
    # Order by recent
    recommended_products = query.order_by(Product.created_at.desc()).limit(6).all()
    
    # Fallback: if we don't have enough recommendations, fill with general recent products
    if len(recommended_products) < 4:
        filled_ids = {p.id for p in recommended_products} | exclude_ids
        fill_count = 6 - len(recommended_products)
        fallback_products = Product.query.filter(
            Product.id.notin_(list(filled_ids)),
            Product.stock > 0
        ).order_by(Product.created_at.desc()).limit(fill_count).all()
        recommended_products.extend(fallback_products)
        
    return jsonify([p.to_dict() for p in recommended_products[:6]]), 200

@products_bp.route('', methods=['POST'])
@token_required
@role_required(['seller'])
def create_product(current_user):
    seller = db.session.get(Seller, current_user.id)
    if not seller:
        return jsonify({'message': 'Seller profile not found'}), 404
        
    data = request.get_json() or {}
    payload, error = validate_product_payload(data)
    if error:
        return jsonify({'message': error}), 400
        
    category = db.session.get(Category, payload['category_id'])
    if not category:
        return jsonify({'message': 'Category not found'}), 404
        
    try:
        product = Product(
            seller_id=seller.id,
            name=payload['name'],
            description=payload['description'],
            price=payload['price'],
            discount=payload['discount'],
            stock=payload['stock'],
            category_id=payload['category_id'],
            images=payload['images'],
            group_id=payload['group_id'],
            color_name=payload['color_name']
        )
        product.sizes_dict = payload.get('sizes', {})
        db.session.add(product)
        db.session.commit()
        return jsonify(product.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to create product: {str(e)}'}), 500

@products_bp.route('/<int:product_id>', methods=['PUT'])
@token_required
@role_required(['seller'])
def update_product(current_user, product_id):
    seller = db.session.get(Seller, current_user.id)
    if not seller:
        return jsonify({'message': 'Seller profile not found'}), 404
        
    product = db.get_or_404(Product, product_id)
    
    # Verify ownership
    if product.seller_id != seller.id:
        return jsonify({'message': 'Unauthorized! You do not own this product.'}), 403
        
    data = request.get_json() or {}
    payload, error = validate_product_payload(data)
    if error:
        return jsonify({'message': error}), 400
        
    category = db.session.get(Category, payload['category_id'])
    if not category:
        return jsonify({'message': 'Category not found'}), 404
        
    try:
        product.name = payload['name']
        product.description = payload['description']
        product.price = payload['price']
        product.discount = payload['discount']
        product.stock = payload['stock']
        product.category_id = payload['category_id']
        product.images = payload['images']
        product.group_id = payload['group_id']
        product.color_name = payload['color_name']
        product.sizes_dict = payload.get('sizes', {})
        
        db.session.commit()
        return jsonify(product.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update product: {str(e)}'}), 500

@products_bp.route('/<int:product_id>', methods=['DELETE'])
@token_required
@role_required(['seller'])
def delete_product(current_user, product_id):
    seller = db.session.get(Seller, current_user.id)
    if not seller:
        return jsonify({'message': 'Seller profile not found'}), 404
        
    product = db.get_or_404(Product, product_id)
    
    # Verify ownership
    if product.seller_id != seller.id:
        return jsonify({'message': 'Unauthorized! You do not own this product.'}), 403
        
    # Check if the product has any historical orders
    has_orders = OrderItem.query.filter_by(product_id=product_id).first() is not None
    if has_orders:
        return jsonify({
            'message': 'Cannot delete this product because it has been purchased in existing orders. Please set its stock to 0 to disable it.'
        }), 400
        
    try:
        # Delete from carts and wishlists first
        CartItem.query.filter_by(product_id=product_id).delete()
        WishlistItem.query.filter_by(product_id=product_id).delete()
        
        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Product deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete product: {str(e)}'}), 500
# Global cache for categories
_categories_cache = None

@products_bp.route('/categories', methods=['GET'])
def get_categories():
    global _categories_cache
    if _categories_cache is not None:
        return jsonify(_categories_cache), 200

    print("Fetching categories from DB...")
    all_categories = Category.query.all()
    if not all_categories:
        from app import seed_database
        seed_database()
        all_categories = Category.query.all()
    print("Found categories count:", len(all_categories))
    
    # Build tree in memory
    cat_dict = {cat.id: {'id': cat.id, 'name': cat.name, 'subcategories': [], 'parent_id': cat.parent_id} for cat in all_categories}
    
    main_cats = []
    for cat in cat_dict.values():
        if cat['parent_id'] is None:
            main_cats.append(cat)
        elif cat['parent_id'] in cat_dict:
            cat_dict[cat['parent_id']]['subcategories'].append(cat)
            
    # Clean up parent_id before returning
    for cat in cat_dict.values():
        del cat['parent_id']
        
    _categories_cache = main_cats
    return jsonify(main_cats), 200

@products_bp.route('/update_categories_force', methods=['POST'])
@token_required
@role_required(['admin'])
def update_categories_force():
    try:
        from app.models import CartItem, OrderItem, Order, Product
        # Safely clear tables in order of dependencies
        CartItem.query.delete()
        OrderItem.query.delete()
        Order.query.delete()
        Product.query.delete()
        Category.query.delete()
        db.session.commit()

    
        main_categories = {
            'MEN': {
                'Topwear': ['T-Shirts', 'Casual Shirts', 'Formal Shirts', 'Sweatshirts', 'Sweaters', 'Jackets', 'Blazers & Coats', 'Suits'],
                'Bottomwear': ['Jeans', 'Casual Trousers', 'Formal Trousers', 'Shorts', 'Track Pants & Joggers'],
                'Footwear': ['Casual Shoes', 'Sports Shoes', 'Formal Shoes', 'Sneakers', 'Sandals & Floaters', 'Flip Flops', 'Socks'],
                'Innerwear & Sleepwear': ['Briefs & Trunks', 'Boxers', 'Vests', 'Sleepwear & Loungewear', 'Thermals'],
                'Accessories': ['Watches', 'Gadgets', 'Bags & Backpacks', 'Sunglasses & Frames', 'Personal Care & Grooming']
            },
            'WOMEN': {
                'Indian & Fusion Wear': ['Kurtas & Suits', 'Kurtis, Tunics & Tops', 'Sarees', 'Ethnic Wear', 'Leggings, Salwars & Churidars', 'Skirts & Palazzos', 'Dress Materials', 'Lehenga Cholis', 'Dupattas & Shawls'],
                'Western Wear': ['Dresses', 'Tops', 'Tshirts', 'Jeans', 'Trousers & Capris', 'Shorts & Skirts', 'Co-ords', 'Playsuits', 'Jumpsuits', 'Shrugs', 'Sweaters & Sweatshirts', 'Jackets & Coats', 'Blazers & Waistcoats'],
                'Footwear': ['Flats', 'Casual Shoes', 'Heels', 'Boots', 'Sports Shoes & Floaters'],
                'Lingerie & Sleepwear': ['Bra', 'Briefs', 'Shapewear', 'Sleepwear & Loungewear', 'Swimwear', 'Camisoles & Thermals'],
                'Beauty & Accessories': ['Makeup', 'Skincare', 'Haircare', 'Fragrances', 'Handbags, Bags & Wallets', 'Watches & Wearables', 'Fashion Jewellery', 'Fine Jewellery']
            },
            'KIDS': {
                'Boys Clothing': ['T-Shirts', 'Shirts', 'Shorts', 'Jeans', 'Trousers', 'Clothing Sets', 'Ethnic Wear', 'Track Pants & Pyjamas', 'Jacket, Sweater & Sweatshirts'],
                'Girls Clothing': ['Dresses', 'Tops', 'Lehenga cholis', 'Kurta Suits', 'Party wear', 'Skirts & shorts', 'Tights & Leggings'],
                'Footwear': ['Casual Shoes', 'Flipflops', 'Sports Shoes', 'Flats', 'Sandals', 'Heeled Shoes', 'School Shoes'],
                'Toys & Accessories': ['Learning & Education', 'Action Figures', 'Soft Toys', 'Bags & Backpacks', 'Watches', 'Jewellery & Hair accessory', 'Sunglasses']
            },
            'LIVING': {
                'Bed Linen & Furnishing': ['Bedsheets', 'Bedding Sets', 'Blankets, Quilts & Dohars', 'Pillows & Pillow Covers', 'Bed Covers', 'Bed Runners', 'Mattress Protectors'],
                'Bath': ['Bath Towels', 'Hand & Face Towels', 'Beach Towels', 'Towel Set', 'Bath Rugs', 'Bath Robes', 'Bathroom Accessories'],
                'Home Décor': ['Plants & Planters', 'Aromas & Candles', 'Clocks', 'Mirrors', 'Wall Décor', 'Festive Decor', 'Pooja Essentials', 'Showpieces & Vases'],
                'Kitchen & Table': ['Table Runners', 'Dinnerware & Serveware', 'Cups and Mugs', 'Bakeware & Cookware', 'Kitchen Storage & Tools', 'Bar & Drinkware'],
                'Lamps & Lighting': ['Floor Lamps', 'Ceiling Lamps', 'Table Lamps', 'Wall Lamps', 'Outdoor Lamps', 'String Lights']
            },
            'COSMETICS': {
                'Makeup': ['Lipstick', 'Lip Gloss', 'Lip Liner', 'Mascara', 'Eyeliner', 'Kajal', 'Eyeshadow', 'Foundation', 'Primer', 'Concealer', 'Compact', 'Nail Polish'],
                'Skincare & Body': ['Face Cleanser', 'Toner', 'Face Wash', 'Makeup Remover', 'Lip Balm', 'Body Lotion', 'Body Wash', 'Body Scrub', 'Hand Cream', 'Baby Care', 'Masks & Peels', 'Sunscreen', 'Serum', 'Face Cream'],
                'Haircare': ['Shampoo', 'Conditioner', 'Hair Cream', 'Hair Oil', 'Hair Gel', 'Hair Color', 'Hair Serum', 'Hair Accessory'],
                'Appliances': ['Hair Straightener', 'Hair Dryer', 'Epilator', 'Trimmers'],
                'Fragrances & Grooming': ['Perfume', 'Deodorant', 'Body Mist', 'Beard Oil', 'Hair Wax']
            }
        }
        
        for main_name, groups in main_categories.items():
            main_cat = Category(name=main_name, parent_id=None)
            db.session.add(main_cat)
            db.session.flush() # get ID
            
            for group_name, items in groups.items():
                group_cat = Category(name=group_name, parent_id=main_cat.id)
                db.session.add(group_cat)
                db.session.flush() # get ID
                
                # Deduplicate just in case
                unique_items = list(dict.fromkeys(items))
                
                for item_name in unique_items:
                    item_cat = Category(name=item_name, parent_id=group_cat.id)
                    db.session.add(item_cat)
                    
        db.session.commit()
        return jsonify({"message": "Categories updated successfully"}), 200
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@products_bp.route('/banner-ads', methods=['GET'])
def get_active_banner_ads():
    """Public endpoint: returns all active (non-expired) banner ads for the homepage carousel."""
    now = datetime.utcnow()
    banners = BannerAd.query.filter(BannerAd.expires_at > now).order_by(BannerAd.created_at.desc()).all()
    return jsonify([b.to_dict() for b in banners]), 200

@products_bp.route('/<int:product_id>/reviews', methods=['POST'])
@token_required
def add_review(current_user, product_id):
    data = request.get_json() or {}
    rating = data.get('rating')
    comment = data.get('comment', '').strip()
    
    if not rating or not isinstance(rating, (int, float)) or not (1 <= rating <= 5):
        return jsonify({'message': 'Please provide a valid rating between 1 and 5.'}), 400
        
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    # Security Check: Ensure user bought the product and it is Delivered
    has_bought = OrderItem.query.join(Order).filter(
        Order.user_id == current_user.id,
        Order.status == 'Delivered',
        OrderItem.product_id == product_id
    ).first()
    
    if not has_bought:
        return jsonify({'message': 'You can only review products that have been delivered to you.'}), 403
        
    # Check if they already reviewed it twice
    existing_reviews_count = Review.query.filter_by(user_id=current_user.id, product_id=product_id).count()
    if existing_reviews_count >= 2:
        return jsonify({'message': 'Strict limit reached: You can submit up to 2 reviews for this product.'}), 400
        
    review = Review(
        user_id=current_user.id,
        product_id=product_id,
        rating=rating,
        comment=comment,
        is_verified_purchase=True
    )
    
    db.session.add(review)
    db.session.commit()
    
    return jsonify({'message': 'Review submitted successfully!', 'review': review.to_dict()}), 201

@products_bp.route('/public/coupons', methods=['GET'])
def get_public_coupons():
    """
    Public endpoint: Returns active coupons for the requested seller(s).
    Query params: ?seller_ids=1,2,3
    """
    seller_ids_param = request.args.get('seller_ids')
    if not seller_ids_param:
        return jsonify([]), 200
        
    try:
        seller_ids = [int(s.strip()) for s in seller_ids_param.split(',') if s.strip()]
    except ValueError:
        return jsonify({'message': 'Invalid seller IDs'}), 400
        
    if not seller_ids:
        return jsonify([]), 200
        
    now = datetime.utcnow()
    coupons = Coupon.query.filter(
        Coupon.seller_id.in_(seller_ids),
        Coupon.is_active == True,
        Coupon.expires_at > now
    ).all()
    
    return jsonify([c.to_dict() for c in coupons]), 200
