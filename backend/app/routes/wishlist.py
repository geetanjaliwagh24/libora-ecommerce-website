from flask import Blueprint, request, jsonify
from app.models import db, WishlistItem, Product
from app.routes.auth_helper import token_required

wishlist_bp = Blueprint('wishlist', __name__)

@wishlist_bp.route('', methods=['GET'])
@token_required
def get_wishlist(current_user):
    items = WishlistItem.query.filter_by(user_id=current_user.id).order_by(WishlistItem.created_at.desc()).all()
    return jsonify([item.to_dict() for item in items]), 200

@wishlist_bp.route('', methods=['POST'])
@token_required
def add_to_wishlist(current_user):
    data = request.get_json() or {}
    product_id = data.get('product_id')
    
    if not product_id:
        return jsonify({'message': 'Product ID is required'}), 400
        
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    existing = WishlistItem.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if existing:
        return jsonify({'message': 'Product already in wishlist', 'item': existing.to_dict()}), 200
        
    try:
        new_item = WishlistItem(user_id=current_user.id, product_id=product_id)
        db.session.add(new_item)
        db.session.commit()
        return jsonify(new_item.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to add to wishlist: {str(e)}'}), 500

@wishlist_bp.route('/<int:product_id>', methods=['DELETE'])
@token_required
def remove_from_wishlist(current_user, product_id):
    item = WishlistItem.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    
    if not item:
        return jsonify({'message': 'Product not found in wishlist'}), 404
        
    try:
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Removed from wishlist'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to remove from wishlist: {str(e)}'}), 500
