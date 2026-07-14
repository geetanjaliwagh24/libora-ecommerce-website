import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, ShoppingBag } from 'lucide-react';
import { API_URL } from '../config';

export const SocialFeed = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch all products to create a randomized feed
        const res = await fetch(`${API_URL}/products`);
        if (res.ok) {
          const data = await res.json();
          // Shuffle products for a more organic feed experience
          const shuffled = data.sort(() => 0.5 - Math.random());
          setProducts(shuffled);
        }
      } catch (err) {
        console.error("Failed to fetch feed products", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.loader}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Feed...</p>
      </div>
    );
  }

  return (
    <div style={styles.feedContainer}>
      <h2 style={styles.feedTitle}>Discover</h2>
      
      <div style={styles.feedScroll}>
        {products.map(product => (
          <div key={product.id} style={styles.postCard}>
            <div style={styles.postHeader}>
              <div style={styles.avatar}>
                {product.seller_name ? product.seller_name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <span style={styles.sellerName}>{product.seller_name || 'Marketplace Seller'}</span>
                <span style={styles.sponsoredTag}>Sponsored</span>
              </div>
            </div>

            <div style={styles.imageContainer}>
              <img 
                src={product.image_url || 'https://via.placeholder.com/400x500'} 
                alt={product.name} 
                style={styles.postImage} 
              />
              <Link to={`/product/${product.id}`} style={styles.shopOverlay}>
                <ShoppingBag size={20} />
                Shop this look
              </Link>
            </div>

            <div style={styles.postActions}>
              <div style={styles.actionGroup}>
                <button style={styles.actionBtn}><Heart size={24} /></button>
                <button style={styles.actionBtn}><MessageCircle size={24} /></button>
                <button style={styles.actionBtn}><Share2 size={24} /></button>
              </div>
            </div>

            <div style={styles.postCaption}>
              <span style={styles.captionName}>{product.name}</span> - 
              <span style={styles.captionPrice}> ₹{product.price}</span>
              <p style={styles.captionText}>{product.description?.substring(0, 100)}...</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  feedContainer: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '100vh',
  },
  feedTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: '30px',
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  feedScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  },
  postCard: {
    background: 'var(--bg-surface-elevated)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-panel)',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
  },
  postHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.2rem',
  },
  sellerName: {
    display: 'block',
    fontWeight: '700',
    fontSize: '1rem',
    color: 'var(--text-primary)',
  },
  sponsoredTag: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4/5',
    backgroundColor: 'var(--bg-app)',
  },
  postImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  shopOverlay: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    padding: '12px 24px',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    color: 'var(--text-primary)',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s',
  },
  postActions: {
    padding: '16px 16px 8px 16px',
  },
  actionGroup: {
    display: 'flex',
    gap: '16px',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    padding: 0,
    transition: 'color 0.2s',
  },
  postCaption: {
    padding: '0 16px 20px 16px',
    color: 'var(--text-primary)',
  },
  captionName: {
    fontWeight: '700',
  },
  captionPrice: {
    fontWeight: '800',
    color: 'var(--primary)',
  },
  captionText: {
    marginTop: '4px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    color: 'var(--text-secondary)'
  },
  loader: {
    border: '4px solid var(--primary-glow)',
    borderTop: '4px solid var(--primary)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  }
};
