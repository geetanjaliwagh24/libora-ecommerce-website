from flask import Blueprint, request, jsonify
from app.models import db, CartItem, Product
from app.routes.auth_helper import token_required

cart_bp = Blueprint('cart', __name__)

@cart_bp.route('', methods=['GET'])
@token_required
def get_cart(current_user):
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    
    total = sum(item.product.price * item.quantity for item in cart_items if item.product)
    
    return jsonify({
        'items': [item.to_dict() for item in cart_items],
        'total': total
    }), 200

@cart_bp.route('', methods=['POST'])
@token_required
def add_to_cart(current_user):
    data = request.get_json() or {}
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    selected_color = data.get('selected_color')
    selected_size = data.get('selected_size')
    
    if not product_id:
        return jsonify({'message': 'Product ID is required'}), 400
    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return jsonify({'message': 'Quantity must be a valid number'}), 400
    if quantity < 1:
        return jsonify({'message': 'Quantity must be at least 1'}), 400
        
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    if product.sizes_dict and selected_size and isinstance(product.sizes_dict, dict):
        size_stock = product.sizes_dict.get(selected_size, 0)
        if size_stock < quantity:
            return jsonify({'message': f'Only {size_stock} items available in size {selected_size}'}), 400
    elif product.stock < quantity:
        return jsonify({'message': f'Only {product.stock} items available in stock'}), 400
        
    # Check if item is already in cart with the SAME color and size
    existing_item = CartItem.query.filter_by(
        user_id=current_user.id, 
        product_id=product_id,
        selected_color=selected_color,
        selected_size=selected_size
    ).first()
    
    try:
        if existing_item:
            existing_item.quantity = quantity
        else:
            if quantity > 0:
                item = CartItem(
                    user_id=current_user.id, 
                    product_id=product_id, 
                    quantity=quantity,
                    selected_color=selected_color,
                    selected_size=selected_size
                )
                db.session.add(item)
                
        db.session.commit()
        
        # Return updated cart
        cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
        total = sum(i.product.price * i.quantity for i in cart_items if i.product)
        return jsonify({
            'items': [i.to_dict() for i in cart_items],
            'total': total
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update cart: {str(e)}'}), 500

@cart_bp.route('/<int:item_id>', methods=['DELETE'])
@token_required
def delete_cart_item(current_user, item_id):
    item = CartItem.query.filter_by(id=item_id, user_id=current_user.id).first()
    if not item:
        return jsonify({'message': 'Cart item not found'}), 404
        
    try:
        db.session.delete(item)
        db.session.commit()
        
        # Return updated cart
        cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
        total = sum(i.product.price * i.quantity for i in cart_items if i.product)
        return jsonify({
            'items': [i.to_dict() for i in cart_items],
            'total': total
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete item: {str(e)}'}), 500
