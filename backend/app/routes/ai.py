from flask import Blueprint, request, jsonify
from app.models import Product, Category
from sqlalchemy import or_
import os, re

ai_bp = Blueprint('ai', __name__)

def mock_recommend(query):
    """Smart keyword-based fallback when Gemini key is not available."""
    price_limit = None
    price_match = re.search(r'(under|below|<|₹|rs\.?)\s*(\d+)', query.lower())
    if price_match:
        price_limit = float(price_match.group(2))

    filler = {'i','want','a','an','the','looking','for','show','me','some','under','below',
              'dollars','rupees','rs','in','of','with','find','get','buy','need'}
    keywords = [w for w in query.lower().split() if w not in filler and not w.isdigit()]

    db_query = Product.query
    if price_limit:
        db_query = db_query.filter(Product.price <= price_limit)
    if keywords:
        filters = []
        for kw in keywords:
            filters.append(Product.name.ilike(f'%{kw}%'))
            filters.append(Product.description.ilike(f'%{kw}%'))
        db_query = db_query.filter(or_(*filters))

    return db_query.limit(6).all()

@ai_bp.route('/recommend', methods=['GET'])
def ai_recommend():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])

    groq_key = os.environ.get('GROQ_API_KEY')
    
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            
            # Build category list for context
            cats = Category.query.filter_by(parent_id=None).all()
            cat_names = [c.name for c in cats]
            
            prompt = f"""You are a smart shopping assistant for an Indian fashion & lifestyle marketplace.
Categories available: {', '.join(cat_names)}.

User query: "{query}"

Extract search intent and return ONLY a JSON object (no markdown, no explanation) with these fields:
- "keywords": list of 1-3 product search keywords (e.g. ["saree", "silk"]). IMPORTANT: ALWAYS use SINGULAR root words (e.g. "smartphone" not "smartphones", "iphone" not "iphones").
- "max_price": number or null (extract from "under ₹500", "below 1000" etc.)
- "category": one of {cat_names} or null
- "intent_summary": one short sentence describing what user wants

Example: {{"keywords": ["silk", "saree"], "max_price": 3000, "category": "WOMEN", "intent_summary": "Looking for a silk saree under ₹3000"}}"""

            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=256,
            )
            text = completion.choices[0].message.content.strip()
            
            # Parse JSON from response
            import json
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                
                db_query = Product.query
                
                # Apply category filter
                if parsed.get('category'):
                    cat = Category.query.filter_by(name=parsed['category'], parent_id=None).first()
                    if cat:
                        def get_all_ids(c):
                            ids = [c.id]
                            for sub in c.subcategories:
                                ids.extend(get_all_ids(sub))
                            return ids
                        db_query = db_query.filter(Product.category_id.in_(get_all_ids(cat)))
                
                # Apply price filter
                if parsed.get('max_price'):
                    db_query = db_query.filter(Product.price <= float(parsed['max_price']))
                
                # Apply keyword filter
                keywords = parsed.get('keywords', [])
                if keywords:
                    filters = []
                    for kw in keywords:
                        filters.append(Product.name.ilike(f'%{kw}%'))
                        filters.append(Product.description.ilike(f'%{kw}%'))
                    db_query = db_query.filter(or_(*filters))
                
                products = db_query.limit(6).all()
                
                # If too restrictive, fallback to keyword-only search
                if not products and keywords:
                    fallback = []
                    for kw in keywords:
                        fallback.extend(Product.query.filter(
                            Product.name.ilike(f'%{kw}%') | Product.description.ilike(f'%{kw}%')
                        ).limit(3).all())
                    products = list({p.id: p for p in fallback}.values())[:6]
                
                result = [p.to_dict() for p in products]
                # Attach intent summary to first product as metadata
                return jsonify({
                    'products': result,
                    'intent': parsed.get('intent_summary', ''),
                    'powered_by': 'groq'
                }), 200
                
        except Exception as e:
            print(f"Groq error: {e}, falling back to mock")
    
    # Fallback: smart mock
    products = mock_recommend(query)
    return jsonify({
        'products': [p.to_dict() for p in products],
        'intent': f'Showing results for: {query}',
        'powered_by': 'mock'
    }), 200
