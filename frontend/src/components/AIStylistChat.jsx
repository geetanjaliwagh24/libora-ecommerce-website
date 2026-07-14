import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

export const AIStylistChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hi there! I'm your AI Stylist. 🌟 Looking for an outfit for a specific occasion, or want me to recommend something based on your style?",
      products: []
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), sender: 'user', text: input, products: [] };
    setMessages(prev => [...prev, userMessage]);
    const query = input;
    setInput('');
    setIsTyping(true);

    setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/ai/recommend?q=${encodeURIComponent(query)}`);
        let recommendedProducts = [];
        let aiText = '';
        let poweredBy = 'mock';

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            recommendedProducts = data.slice(0, 3);
          } else {
            recommendedProducts = (data.products || []).slice(0, 3);
            poweredBy = data.powered_by || 'mock';
            if (data.intent) aiText = data.intent;
          }
        }

        if (!aiText) {
          aiText = recommendedProducts.length > 0
            ? "I found some amazing pieces that perfectly match what you're looking for! ✨"
            : "I couldn't find exact matches. Try describing the style, color, or occasion?";
        }

        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: aiText,
          products: recommendedProducts,
          poweredBy,
        }]);
      } catch (err) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: "Oops, my styling circuits are overloaded. Please try again!",
          products: []
        }]);
      } finally {
        setIsTyping(false);
      }
    }, 1200);
  };


  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={styles.fab}
          className="glow-effect ai-stylist-fab"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={styles.chatContainer} className="glass-panel ai-stylist-chat-container">
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <div style={styles.botIconWrapper}>
                <Sparkles size={16} color="white" />
              </div>
              <div>
                <h3 style={styles.title}>AI Stylist</h3>
                <span style={styles.status}>Online</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div style={styles.messagesArea}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                ...styles.messageWrapper,
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}>
                {msg.sender === 'ai' && (
                  <div style={styles.messageAvatarAi}>
                    <Bot size={14} />
                  </div>
                )}
                
                <div style={{
                  ...styles.messageBubble,
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(92, 77, 177, 0.08)',
                  color: msg.sender === 'user' ? 'var(--text-light)' : 'var(--text-primary)',
                  border: msg.sender === 'ai' ? '1px solid var(--border-color)' : 'none',
                  borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.sender === 'ai' ? '4px' : '16px',
                }}>
                  <p style={styles.messageText}>{msg.text}</p>
                  
                  {/* Recommended Products Carousel */}
                  {msg.products && msg.products.length > 0 && (
                    <div style={styles.productCarousel}>
                      {msg.products.map(prod => (
                        <Link to={`/product/${prod.id}`} key={prod.id} style={styles.productCard}>
                          <img src={prod.image_url || 'https://via.placeholder.com/80'} alt={prod.name} style={styles.productImg} />
                          <div style={styles.productInfo}>
                            <span style={styles.productName}>{prod.name}</span>
                            <span style={styles.productPrice}>₹{prod.price}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
                <div style={styles.messageAvatarAi}>
                  <Bot size={14} />
                </div>
                <div style={{ ...styles.messageBubble, background: 'rgba(92, 77, 177, 0.08)', border: '1px solid var(--border-color)' }}>
                  <div style={styles.typingIndicator}>
                    <div style={styles.typingDot}></div>
                    <div style={styles.typingDot}></div>
                    <div style={styles.typingDot}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} style={styles.inputArea}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for style advice..."
              style={styles.input}
              disabled={isTyping}
            />
            <button type="submit" style={styles.sendBtn} disabled={!input.trim() || isTyping}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

const styles = {
  fab: {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    color: 'white',
    border: 'none',
    boxShadow: '0 8px 24px rgba(255, 63, 108, 0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    zIndex: 9999,
    transition: 'transform 0.2s',
  },
  chatContainer: {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    width: '380px',
    height: '600px',
    maxHeight: '80vh',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
    boxShadow: 'var(--shadow-panel)',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-surface)',
    backdropFilter: 'var(--glass-blur)',
    overflow: 'hidden'
  },
  header: {
    padding: '16px 20px',
    background: 'rgba(92, 77, 177, 0.05)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  botIconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: '1.2'
  },
  status: {
    fontSize: '0.75rem',
    color: 'var(--success)',
    fontWeight: '600'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  messageWrapper: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  },
  messageAvatarAi: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'var(--primary)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'var(--text-light)',
    flexShrink: 0,
  },
  messageBubble: {
    padding: '12px 16px',
    borderRadius: '16px',
    maxWidth: '85%',
  },
  messageText: {
    fontSize: '0.9rem',
    lineHeight: '1.5',
    margin: 0,
  },
  productCarousel: {
    marginTop: '12px',
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  productCard: {
    minWidth: '140px',
    background: 'var(--surface-elevated)',
    borderRadius: '8px',
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  },
  productImg: {
    width: '100%',
    height: '100px',
    objectFit: 'cover',
  },
  productInfo: {
    padding: '8px',
  },
  productName: {
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '4px',
  },
  productPrice: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--secondary)',
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '4px 8px',
  },
  typingDot: {
    width: '6px',
    height: '6px',
    background: 'var(--text-secondary)',
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite',
  },
  inputArea: {
    padding: '16px',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    background: 'var(--bg-app)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  sendBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--primary)',
    border: 'none',
    color: 'var(--text-light)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  }
};
