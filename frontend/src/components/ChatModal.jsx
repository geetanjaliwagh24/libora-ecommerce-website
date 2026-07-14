import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { API_URL } from '../config';

export const ChatModal = ({ isOpen, onClose, receiverId, receiverName }) => {
  const { token, user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isOpen) {
      fetchMessages(true);
      interval = setInterval(() => fetchMessages(false), 3000);
      
      // Mark conversation as read
      if (receiverId) {
        fetch(`${API_URL}/messages/mark-conversation-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sender_id: receiverId })
        }).catch(console.error);
      }
    }
    return () => clearInterval(interval);
  }, [isOpen, receiverId, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/messages/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter messages to only show conversation with receiverId if provided
        // or if not provided, we show all (though usually this modal is for 1-1 chat)
        const chatHistory = receiverId 
            ? data.filter(m => m.sender_id === receiverId || m.receiver_id === receiverId)
            : data;
        setMessages(chatHistory.reverse());
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
    if (showLoading) setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || !receiverId) return;

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: receiverId,
          content: content.trim()
        })
      });
      if (res.ok) {
        setContent('');
        fetchMessages();
      } else {
        alert('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent} className="glass-panel">
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.avatar}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 style={styles.receiverName}>{receiverName || 'Chat'}</h3>
              <p style={styles.statusText}>Usually replies in a few hours</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div style={styles.messagesArea}>
          {loading ? (
            <div style={styles.centerContainer}>
              <Loader2 size={24} style={styles.loader} />
            </div>
          ) : messages.length === 0 ? (
            <div style={styles.emptyState}>
              <MessageSquare size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p>No messages yet.<br/>Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user.id;
              return (
                <div key={msg.id} style={{ ...styles.messageRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    ...styles.messageBubble,
                    ...(isMe ? styles.messageMe : styles.messageThem)
                  }}>
                    <p style={styles.messageText}>{msg.content}</p>
                    <p style={{
                      ...styles.messageTime,
                      color: isMe ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)'
                    }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} style={styles.inputArea}>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            style={styles.inputField}
          />
          <button 
            type="submit"
            disabled={!content.trim() || sending}
            style={{
              ...styles.sendBtn,
              opacity: (!content.trim() || sending) ? 0.6 : 1,
              cursor: (!content.trim() || sending) ? 'not-allowed' : 'pointer'
            }}
          >
            {sending ? <Loader2 size={18} style={styles.loaderSmall} /> : <Send size={18} style={{ marginLeft: '2px' }} />}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(31, 26, 38, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  },
  modalContent: {
    width: '100%',
    maxWidth: '450px',
    height: '600px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-glow)',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiverName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  statusText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: 'var(--bg-app)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  centerContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    textAlign: 'center',
    fontSize: '0.9rem',
    opacity: 0.8,
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  messageMe: {
    background: 'var(--grad-primary)',
    color: '#fff',
    borderTopLeftRadius: '16px',
    borderBottomLeftRadius: '16px',
    borderBottomRightRadius: '16px',
    borderTopRightRadius: '4px',
  },
  messageThem: {
    backgroundColor: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    borderTopRightRadius: '16px',
    borderBottomLeftRadius: '16px',
    borderBottomRightRadius: '16px',
    borderTopLeftRadius: '4px',
    border: '1px solid var(--border-color)',
  },
  messageText: {
    margin: 0,
    fontSize: '0.9rem',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.4',
  },
  messageTime: {
    margin: '4px 0 0 0',
    fontSize: '0.65rem',
    textAlign: 'right',
  },
  inputArea: {
    padding: '16px',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: 'var(--surface)',
    display: 'flex',
    gap: '12px',
  },
  inputField: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'var(--bg-app)',
    border: '1px solid var(--border-color)',
    borderRadius: '24px',
    outline: 'none',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'var(--grad-primary)',
    color: '#fff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    animation: 'spin 1s linear infinite',
    color: 'var(--primary)',
  },
  loaderSmall: {
    animation: 'spin 1s linear infinite',
    color: '#fff',
  }
};
