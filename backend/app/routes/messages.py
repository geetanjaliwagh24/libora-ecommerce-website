from flask import Blueprint, request, jsonify
from app.models import db, Message, User
from app.routes.auth_helper import token_required
from sqlalchemy import or_

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('/', methods=['GET'])
@token_required
def get_messages(current_user):
    """Get all messages involving the current user."""
    # To keep it simple, return all messages where user is sender or receiver.
    messages = Message.query.filter(
        or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id)
    ).order_by(Message.created_at.desc()).all()
    
    return jsonify([m.to_dict() for m in messages]), 200

@messages_bp.route('/send', methods=['POST'])
@token_required
def send_message(current_user):
    data = request.get_json()
    receiver_id = data.get('receiver_id')
    content = data.get('content', '').strip()
    
    if not receiver_id or not content:
        return jsonify({'message': 'Receiver ID and content are required'}), 400
        
    receiver = User.query.get(receiver_id)
    if not receiver:
        return jsonify({'message': 'Receiver not found'}), 404
        
    new_message = Message(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        content=content
    )
    
    db.session.add(new_message)
    db.session.commit()
    
    return jsonify({'message': 'Message sent successfully', 'message_data': new_message.to_dict()}), 201

@messages_bp.route('/<int:message_id>/read', methods=['POST'])
@token_required
def mark_read(current_user, message_id):
    message = Message.query.get_or_404(message_id)
    if message.receiver_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403
        
    message.is_read = True
    db.session.commit()
    
    return jsonify({'message': 'Message marked as read'}), 200

@messages_bp.route('/unread-count', methods=['GET'])
@token_required
def get_unread_count(current_user):
    unread_messages = Message.query.filter_by(receiver_id=current_user.id, is_read=False).all()
    count = len(unread_messages)
    
    # Get distinct senders who have unread messages
    senders = {}
    for m in unread_messages:
        if m.sender_id not in senders:
            senders[m.sender_id] = {
                'id': m.sender_id,
                'name': m.sender.email if m.sender else 'Unknown',
                'count': 1
            }
        else:
            senders[m.sender_id]['count'] += 1
            
    return jsonify({
        'total_unread': count,
        'senders': list(senders.values())
    }), 200

@messages_bp.route('/mark-conversation-read', methods=['POST'])
@token_required
def mark_conversation_read(current_user):
    data = request.get_json()
    sender_id = data.get('sender_id')
    
    if not sender_id:
        return jsonify({'message': 'Sender ID required'}), 400
        
    unread_messages = Message.query.filter_by(
        receiver_id=current_user.id, 
        sender_id=sender_id,
        is_read=False
    ).all()
    
    for m in unread_messages:
        m.is_read = True
        
    db.session.commit()
    
    return jsonify({'message': f'Marked {len(unread_messages)} messages as read'}), 200
