import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';

export const CartPage = () => {
  const { cart, loading, addToCart, removeFromCart } = useContext(CartContext);
  const navigate = useNavigate();

  const handleQtyChange = async (item, delta) => {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      await removeFromCart(item.id);
    } else {
      await addToCart(item.product_id, newQty, item.selected_size);
    }
  };

  const getShippingFee = () => {
    return cart.total > 1000 ? 0.0 : 99.0;
  };

  const getTax = () => {
    return cart.total * 0.18; // 18% GST standard
  };

  const getGrandTotal = () => {
    return cart.total + getShippingFee() + getTax();
  };

  if (loading && cart.items.length === 0) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.loader}></div>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading your cart...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>
        Your Shopping Cart
        <span style={{ color: 'var(--secondary)', marginLeft: '6px' }}><ShoppingBag size={24} style={{ display: 'inline' }} /></span>
      </h1>

      {cart.items.length > 0 ? (
        <div style={styles.cartGrid} className="responsive-grid">
          {/* Items List */}
          <div style={styles.itemsPanel}>
            {cart.items.map((item) => (
              <div key={item.id} style={styles.itemCard} className="glass-panel">
                <img
                  src={item.image_url || 'https://via.placeholder.com/150'}
                  alt={item.product_name}
                  style={styles.itemImg}
                />
                
                <div style={styles.itemDetails}>
                  <h3 style={styles.itemName}>{item.product_name}</h3>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={styles.itemPrice}>₹{item.price.toLocaleString('en-IN')}</span>
                    {item.discount > 0 && item.original_price && (
                      <span style={{...styles.itemPrice, textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem'}}>
                        ₹{item.original_price.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  {(item.selected_color || item.selected_size) && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {item.selected_color && <span>Color: <b>{item.selected_color}</b></span>}
                      {item.selected_size && <span>Size: <b>{item.selected_size}</b></span>}
                    </div>
                  )}
                </div>

                <div style={styles.qtyControl}>
                  <button onClick={() => handleQtyChange(item, -1)} style={styles.qtyBtn}>
                    <Minus size={14} />
                  </button>
                  <span style={styles.qtyVal}>{item.quantity}</span>
                  <button onClick={() => handleQtyChange(item, 1)} style={styles.qtyBtn}>
                    <Plus size={14} />
                  </button>
                </div>

                <div style={styles.subtotalArea}>
                  <span style={styles.subtotal}>₹{item.subtotal.toLocaleString('en-IN')}</span>
                  <button onClick={() => removeFromCart(item.id)} style={styles.deleteBtn}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Order Summary */}
          <div style={styles.summaryPanel} className="glass-panel">
            <h3 style={styles.summaryTitle}>Order Summary</h3>
            
            <div style={styles.summaryRow}>
              <span>Subtotal ({cart.items.length} items)</span>
              <span>₹{cart.total.toLocaleString('en-IN')}</span>
            </div>

            <div style={styles.summaryRow}>
              <span>Shipping Fee</span>
              <span>
                {getShippingFee() === 0 ? (
                  <span style={{ color: 'var(--success)' }}>FREE</span>
                ) : (
                  `₹${getShippingFee().toFixed(2)}`
                )}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <span>GST (18% standard)</span>
              <span>₹{getTax().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div style={{ ...styles.summaryRow, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px' }}>
              <span style={styles.totalLabel}>Grand Total</span>
              <span style={styles.totalVal}>₹{getGrandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {getShippingFee() > 0 && (
              <p style={styles.shippingNotice}>
                💡 Add products worth <b>₹{((1000 - cart.total) > 0 ? (1000 - cart.total) : 0).toFixed(0)}</b> more to qualify for FREE Shipping!
              </p>
            )}

            <div style={{ padding: '12px', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: '8px', marginBottom: '16px', color: 'var(--warning)', fontSize: '0.9rem' }}>
              ⚡ You can apply your <b>Style Coins</b> at the next step for discounts!
            </div>

            <button
              onClick={() => {
                if (!user?.address || user.address.trim() === '') {
                  alert("Please add a delivery address to your profile before checking out.");
                  navigate('/profile');
                } else {
                  navigate('/checkout');
                }
              }}
              className="btn-primary"
              style={styles.checkoutBtn}
            >
              Proceed to Secure Checkout
              <ArrowRight size={18} style={{ marginLeft: '6px' }} />
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.emptyCart} className="glass-panel">
          <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>Your shopping cart is empty</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Browse our catalog to add items to your cart.
          </p>
          <Link to="/" className="btn-primary" style={{ marginTop: '20px' }}>
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '0 20px',
  },
  centerContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '30px',
  },
  cartGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: '30px',
  },
  itemsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  itemCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    gap: '20px',
  },
  itemImg: {
    width: '70px',
    height: '70px',
    objectFit: 'cover',
    borderRadius: '8px',
    background: 'var(--bg-app)',
  },
  itemDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  itemName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  itemPrice: {
    fontSize: '0.9rem',
    color: 'var(--secondary)',
    fontWeight: '500',
  },
  qtyControl: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(92, 77, 177, 0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '2px',
  },
  qtyBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
  },
  qtyVal: {
    padding: '0 12px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    minWidth: '24px',
    textAlign: 'center',
  },
  subtotalArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    minWidth: '150px',
    justifyContent: 'flex-end',
  },
  subtotal: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    transition: 'color 0.2s ease, background-color 0.2s ease',
  },
  summaryPanel: {
    padding: '30px',
    background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%)',
    height: 'fit-content',
  },
  summaryTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    marginBottom: '12px',
  },
  totalLabel: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  totalVal: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--secondary)',
  },
  shippingNotice: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    background: 'var(--primary-glow)',
    border: '1px solid var(--border-color)',
    padding: '10px 14px',
    borderRadius: '8px',
    marginTop: '20px',
    lineHeight: '1.4',
  },
  checkoutBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '14px',
    borderRadius: '8px',
    marginTop: '24px',
    fontWeight: '600',
  },
  emptyCart: {
    textAlign: 'center',
    padding: '50px 30px',
    maxWidth: '500px',
    margin: '40px auto',
  },
  loader: {
    border: '3px solid rgba(138, 43, 226, 0.1)',
    borderTop: '3px solid var(--secondary)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    animation: 'spin 1s linear infinite',
  }
};
