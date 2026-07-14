import os

file_path = r"C:\Users\geeta\.gemini\antigravity-ide\scratch\ai-marketplace\backend\app\routes\products.py"

with open(file_path, "r") as f:
    lines = f.readlines()

missing_content = """            while queue:
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
        
    if search_query:
        sq = f"%{search_query}%"
        query = query.filter(Product.name.ilike(sq) | Product.description.ilike(sq))
    
    products = query.all()
    
    # Apply sorting in memory to include all calculated fields like average rating
    if sort == 'price_asc':
        products = sorted(products, key=lambda p: (not p.is_promoted, p.price))
    elif sort == 'price_desc':
        products = sorted(products, key=lambda p: (not p.is_promoted, -p.price))
    elif sort == 'rating':
        def avg_rating_key(p):
            ratings = [r.rating for r in p.reviews]
            avg = sum(ratings) / len(ratings) if ratings else 0
            return (not p.is_promoted, -avg)
        products = sorted(products, key=avg_rating_key)
    else:
        products = sorted(products, key=lambda p: (not p.is_promoted, p.created_at), reverse=True)
        
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
    return jsonify(product.to_dict()), 200

@products_bp.route('', methods=['POST'])
@token_required
@role_required(['seller'])
"""

# Insert at line 75 (index 74)
lines.insert(74, missing_content)

with open(file_path, "w") as f:
    f.writelines(lines)

print("Fixed products.py")
