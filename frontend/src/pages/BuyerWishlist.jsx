import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { WishlistContext } from '../context/WishlistContext';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { Heart, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';

export const BuyerWishlist = () => {
  const { wishlist, removeFromWishlist } = useContext(WishlistContext);
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const handleAddToCart = async (item) => {
    if (!user) {
      alert('Please sign in to buy products!');
      return;
    }
    const res = await addToCart(item.product_id, 1);
    if (res.success) {
      // Optional: remove from wishlist after adding to cart, or keep it. We'll keep it.
      alert(`${item.product_name} added to cart!`);
    } else {
      alert(res.message || 'Failed to add item to cart');
    }
  };

  const handleRemove = async (productId) => {
    await removeFromWishlist(productId);
  };

  if (!user || user.role !== 'buyer') {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <Heart size={48} style={{ color: 'var(--border-color)', marginBottom: '16px' }} />
          <h3>Sign in to view your wishlist</h3>
          <Link to="/auth" className="btn-primary" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 20px', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/" style={styles.backLink}>
          <ArrowLeft size={20} /> Back to Shopping
        </Link>
        <h1 style={styles.title}>My Wishlist <span style={styles.countTag}>{wishlist.length} items</span></h1>
      </div>

      {wishlist.length === 0 ? (
        <div style={styles.emptyState}>
          <Heart size={64} style={{ color: 'var(--border-color)', marginBottom: '20px' }} />
          <h2>Your wishlist is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Save items you love to review them later.</p>
          <Link to="/" className="btn-primary" style={{ padding: '12px 30px', textDecoration: 'none', borderRadius: '8px' }}>
            Discover Products
          </Link>
        </div>
      ) : (
        <div style={styles.grid}>
          {wishlist.map(item => {
            const hasSizes = item.sizes && Object.keys(item.sizes).length > 0;
            const totalStock = hasSizes ? Object.values(item.sizes).reduce((a, b) => a + b, 0) : (item.stock || 0);
            const isOutOfStock = totalStock <= 0;
            return (
            <div key={item.id} className="cyber-card" style={styles.card}>
              <Link to={`/product/${item.product_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={styles.imageWrapper}>
                  <img
                    src={item.image_url || 'https://via.placeholder.com/200x200'}
                    alt={item.product_name}
                    style={{...styles.productImg, opacity: isOutOfStock ? 0.5 : 1}}
                  />
                  {isOutOfStock && (
                    <div style={styles.outOfStockStrip}>
                      OUT OF STOCK
                    </div>
                  )}
                  {totalStock > 0 && totalStock <= 5 && (
                    <span style={styles.lowStockBadge}>
                      Only {totalStock} left
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); handleRemove(item.product_id); }}
                    style={styles.removeBtn}
                    title="Remove from wishlist"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={styles.cardBody}>
                  <h3 style={styles.productTitle} title={item.product_name}>{item.product_name}</h3>
                  <div style={styles.priceRow}>
                    <span style={styles.price}>₹{item.price.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </Link>
              <div style={styles.cardFooter}>
                <button
                  onClick={(e) => { e.preventDefault(); handleAddToCart(item); }}
                  className="btn-primary"
                  style={styles.addCartBtn}
                >
                  <ShoppingCart size={16} /> Add to Cart
                </button>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '30px',
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    marginBottom: '20px',
    fontWeight: '500',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  countTag: {
    fontSize: '1rem',
    fontWeight: '500',
    backgroundColor: 'var(--primary-glow)',
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '24px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-surface-elevated)',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'transform 0.2s',
    border: '1px solid var(--border-color)',
    position: 'relative',
  },
  imageWrapper: {
    position: 'relative',
    height: '240px',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImg: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' },
  outOfStockStrip: { position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', background: 'rgba(0, 0, 0, 0.75)', color: '#fff', textAlign: 'center', padding: '8px 0', fontWeight: 800, letterSpacing: '2px', fontSize: '0.85rem', zIndex: 3, backdropFilter: 'blur(4px)' },
  lowStockBadge: { position: 'absolute', bottom: '8px', left: '8px', background: 'var(--warning)', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, zIndex: 2 },
  removeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--danger)',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  cardBody: {
    padding: '16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  productTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '10px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: 'var(--text-primary)',
  },
  priceRow: {
    marginTop: 'auto',
  },
  price: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  cardFooter: {
    padding: '0 16px 16px 16px',
  },
  addCartBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '100px 20px',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '16px',
    border: '1px dashed var(--border-color)',
  }
};
