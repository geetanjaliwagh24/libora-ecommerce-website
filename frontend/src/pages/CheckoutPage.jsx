import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, CreditCard, CheckCircle, AlertTriangle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { API_URL } from '../config';

export const CheckoutPage = () => {
  const { cart, clearCartState } = useContext(CartContext);
  const { token, user } = useContext(AuthContext);
  
  const [billingAddress, setBillingAddress] = useState(user?.address || '');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  
  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  // UPI details
  const [upiId, setUpiId] = useState('');

  const [useCoins, setUseCoins] = useState(false);
  
  // Coupon state
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState({ text: '', type: '' });
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [cartCoupons, setCartCoupons] = useState([]);

  const [loading, setLoading] = useState(false);
  
  // Custom Alert / Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'success', // success or flagged
    title: '',
    message: '',
    riskScore: 0,
    flags: []
  });

  const navigate = useNavigate();
  
  useEffect(() => {
    if (!token) {
      navigate('/auth');
    }
  }, [token, navigate]);

  useEffect(() => {
    if (cart && cart.items.length > 0) {
      const sellerIds = [...new Set(cart.items.map(item => item.seller_id))].filter(Boolean);
      if (sellerIds.length > 0) {
        fetchCartCoupons(sellerIds);
      }
    }
  }, [cart]);

  const fetchCartCoupons = async (sellerIds) => {
    try {
      const res = await fetch(`${API_URL}/products/public/coupons?seller_ids=${sellerIds.join(',')}`);
      if (res.ok) {
        const data = await res.json();
        setCartCoupons(data);
      }
    } catch (e) {
      console.error("Failed to fetch cart coupons", e);
    }
  };

  const getGrandTotal = () => {
    let subtotal = cart.total;
    if (couponDiscount > 0) {
      subtotal -= couponDiscount;
    }
    const shipping = subtotal > 1000 ? 0.0 : 99.0;
    const tax = subtotal * 0.18;
    let total = subtotal + shipping + tax;
    
    if (useCoins && user?.coins >= 100) {
      total = Math.max(0, total - (user.coins / 100));
    }
    return total;
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    setPromoMessage({ text: '', type: '' });
    
    try {
      const res = await fetch(`${API_URL}/orders/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ coupon_code: promoCode })
      });
      const data = await res.json();
      if (res.ok) {
        setCouponDiscount(data.discount_amount);
        setAppliedPromo(promoCode);
        setPromoMessage({ text: data.message, type: 'success' });
      } else {
        setPromoMessage({ text: data.message, type: 'error' });
      }
    } catch (e) {
      setPromoMessage({ text: 'Failed to validate promo code', type: 'error' });
    } finally {
      setValidatingPromo(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const showSuccessOrFlagged = (fraudChecked, orderId) => {
    if (fraudChecked && fraudChecked.is_flagged) {
      setModalState({
        isOpen: true,
        type: 'flagged',
        title: 'Transaction Flagged & Held for Review',
        message: 'Our real-time transaction screening engine detected suspicious indicators. Your order is registered but held in the Security Review Queue.',
        riskScore: fraudChecked.risk_score,
        flags: fraudChecked.flags
      });
    } else {
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Order Placed Successfully!',
        message: `Your payment was authorized. Order ID #${orderId} has been registered and is being processed.`,
        riskScore: 5.0,
        flags: []
      });
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!billingAddress || !deliveryAddress) {
      alert('Billing and Delivery addresses are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        billing_address: billingAddress,
        delivery_address: deliveryAddress,
        payment_method: paymentMethod,
        use_coins: useCoins,
        coupon_code: appliedPromo,
        device_fingerprint: `browser_client_sig_${navigator.userAgent.length}`
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        alert(data.message || 'Failed to complete checkout.');
        return;
      }

      if (data.requires_payment) {
        if (!data.sandbox_mode) {
          // Load Razorpay Script and open checkout
          const scriptLoaded = await loadRazorpayScript();
          if (!scriptLoaded) {
            setLoading(false);
            alert('Failed to load Razorpay SDK. Please check your internet connection.');
            return;
          }

          const options = {
            key: data.razorpay_key_id,
            amount: data.amount,
            currency: data.currency,
            name: "AI Marketplace",
            description: `Order #${data.order.id} Payment`,
            order_id: data.razorpay_order_id,
            prefill: {
              email: user?.email || '',
              contact: user?.phone || ''
            },
            theme: {
              color: "#6366f1"
            },
            handler: async function (response) {
              setLoading(true);
              try {
                const verifyRes = await fetch(`${API_URL}/orders/verify-payment`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    order_id: data.order.id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                  })
                });

                const verifyData = await verifyRes.json();
                setLoading(false);

                if (verifyRes.ok) {
                  clearCartState();
                  showSuccessOrFlagged(data.fraud_checked, data.order.id);
                } else {
                  alert(verifyData.message || 'Payment verification failed.');
                }
              } catch (vErr) {
                console.error(vErr);
                setLoading(false);
                alert('Connection error during payment verification.');
              }
            },
            modal: {
              ondismiss: function () {
                setLoading(false);
                alert('Payment window closed.');
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          // Sandbox Mode (simulation fallback)
          alert('🔑 Razorpay API keys not configured. Simulating payment authorization in Sandbox Mode...');
          
          setTimeout(async () => {
            try {
              const verifyRes = await fetch(`${API_URL}/orders/verify-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  order_id: data.order.id,
                  is_sandbox: true
                })
              });

              const verifyData = await verifyRes.json();
              setLoading(false);

              if (verifyRes.ok) {
                clearCartState();
                showSuccessOrFlagged(data.fraud_checked, data.order.id);
              } else {
                alert(verifyData.message || 'Payment simulation failed.');
              }
            } catch (vErr) {
              console.error(vErr);
              setLoading(false);
              alert('Connection error during payment simulation.');
            }
          }, 1500);
        }
      } else {
        // COD or Zero Total Order
        setLoading(false);
        clearCartState();
        showSuccessOrFlagged(data.fraud_checked, data.order.id);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert('Connection failed. Please verify that the backend is running.');
    }
  };

  const closeModalAndRedirect = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    navigate('/orders');
  };

  if (cart.items.length === 0 && !modalState.isOpen) {
    return (
      <div style={styles.centerContainer}>
        <h3>Your cart is empty</h3>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: '16px' }}>
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/cart')} style={styles.backBtn}>
        <ArrowLeft size={16} /> Back to Cart
      </button>

      <h1 style={styles.pageTitle}>Secure Checkout</h1>

      <div style={styles.checkoutGrid} className="responsive-grid">
        {/* Left: Checkout Form */}
        <form onSubmit={handleCheckoutSubmit} style={styles.formPanel} className="glass-panel">
          <h2 style={styles.secTitle}>Fulfillment Information</h2>
          
          <div style={styles.addressGroup}>
            <div style={styles.inputBox}>
              <label style={styles.label}>Billing Address *</label>
              <input
                type="text"
                placeholder="Street Address, City, State, Pincode"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                className="cyber-input"
                style={styles.addressInput}
                required
              />
            </div>

            <div style={styles.inputBox}>
              <label style={styles.label}>Delivery Address *</label>
              <input
                type="text"
                placeholder="Street Address, City, State, Pincode"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="cyber-input"
                style={styles.addressInput}
                required
              />
              <button
                type="button"
                onClick={() => setDeliveryAddress(billingAddress)}
                style={styles.copyAddrBtn}
              >
                Same as Billing Address
              </button>
            </div>
          </div>

          <h2 style={{ ...styles.secTitle, marginTop: '30px' }}>Payment Method</h2>
          
          <div style={styles.paymentSelector}>
            <button
              type="button"
              onClick={() => setPaymentMethod('Card')}
              style={{
                ...styles.payTypeBtn,
                ...(paymentMethod === 'Card' ? styles.payTypeBtnActive : {})
              }}
            >
              <CreditCard size={18} />
              Credit/Debit Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              style={{
                ...styles.payTypeBtn,
                ...(paymentMethod === 'UPI' ? styles.payTypeBtnActive : {})
              }}
            >
              UPI / QR
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('COD')}
              style={{
                ...styles.payTypeBtn,
                ...(paymentMethod === 'COD' ? styles.payTypeBtnActive : {})
              }}
            >
              Cash on Delivery (COD)
            </button>
          </div>

          {/* Payment Detail Forms */}
          {paymentMethod === 'Card' && (
            <div style={styles.paymentDetailsBox} className="glass-panel">
              <h3 style={styles.paymentSubTitle}>Card Information</h3>
              <div style={styles.inputBox}>
                <input
                  type="text"
                  placeholder="Cardholder Full Name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="cyber-input"
                  style={{ width: '100%', marginBottom: '12px' }}
                  required={paymentMethod === 'Card'}
                />
              </div>
              <div style={styles.inputBox}>
                <input
                  type="text"
                  placeholder="Card Number (16-digit)"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, ''))}
                  className="cyber-input"
                  maxLength="16"
                  style={{ width: '100%', marginBottom: '12px' }}
                  required={paymentMethod === 'Card'}
                />
              </div>
              <div style={styles.cardRow}>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="cyber-input"
                  maxLength="5"
                  style={{ flex: 1 }}
                  required={paymentMethod === 'Card'}
                />
                <input
                  type="password"
                  placeholder="CVV"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  className="cyber-input"
                  maxLength="3"
                  style={{ width: '100px' }}
                  required={paymentMethod === 'Card'}
                />
              </div>
            </div>
          )}

          {paymentMethod === 'UPI' && (
            <div style={styles.paymentDetailsBox} className="glass-panel">
              <h3 style={styles.paymentSubTitle}>UPI VPA Address</h3>
              <input
                type="text"
                placeholder="username@bank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="cyber-input"
                style={{ width: '100%' }}
                required={paymentMethod === 'UPI'}
              />
            </div>
          )}

          {paymentMethod === 'COD' && (
            <div style={styles.paymentDetailsBox} className="glass-panel">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                📦 Your order total will be paid in cash to the delivery agent. Please note that Cash on Delivery orders are still subject to velocity safety checks.
              </p>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="cyber-spinner" style={{ marginRight: '8px' }} />
                Processing Transaction...
              </>
            ) : (
              <>
                {paymentMethod === 'COD' ? 'Confirm' : 'Confirm and Pay'} ₹{getGrandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </>
            )}
          </button>
        </form>

        {/* Right: Checkout Sidebar Guides */}
        <div style={styles.sidebar}>
          
          <div style={styles.summaryCard} className="glass-panel">
            {cartCoupons.length > 0 && (
              <div style={styles.cartCouponsContainer}>
                <h4 style={styles.couponsTitle}>🎟️ Available Coupons for your cart</h4>
                <div style={styles.couponChips}>
                  {cartCoupons.map(coupon => (
                    <div 
                      key={coupon.id} 
                      style={styles.couponChip}
                      onClick={() => setPromoCode(coupon.code)}
                      title="Click to apply"
                    >
                      <span style={{fontWeight: '700'}}>{coupon.code}</span>
                      <span style={{fontSize: '0.8rem', opacity: 0.8}}>({coupon.discount_percentage}% OFF)</span>
                      {coupon.min_cart_value > 0 && <span style={{fontSize: '0.75rem', opacity: 0.7}}> (Min spend: ₹{coupon.min_cart_value})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h2 style={styles.summaryTitle}>Apply Promo Code</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Enter Code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="cyber-input"
                style={{ flex: 1, backgroundColor: 'var(--bg-app)' }}
              />
              <button 
                type="button" 
                onClick={handleApplyPromo} 
                className="btn-outline"
                disabled={validatingPromo}
              >
                {validatingPromo ? '...' : 'Apply'}
              </button>
            </div>
            {promoMessage.text && (
              <p style={{ fontSize: '0.85rem', color: promoMessage.type === 'success' ? 'var(--success)' : 'var(--danger)', margin: '4px 0 0 0' }}>
                {promoMessage.text}
              </p>
            )}
          </div>

          <div style={styles.orderSummaryBox} className="glass-panel">
            <h3 style={styles.summaryTitle}>Review Order Items</h3>
            <div style={styles.summaryItems}>
              {cart.items.map((item) => (
                <div key={item.id} style={{ ...styles.summaryItem, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <Link 
                    to={`/product/${item.product_id}`}
                    style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', flex: 1 }}
                  >
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.product_name} 
                        style={styles.summaryItemImg} 
                      />
                    ) : (
                      <div style={styles.summaryItemImgPlaceholder}>📦</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="product-title-link">{item.product_name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty: {item.quantity}</span>
                      {(item.selected_color || item.selected_size) && (
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {item.selected_color && <span>Color: {item.selected_color}</span>}
                          {item.selected_size && <span>Size: {item.selected_size}</span>}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{ fontWeight: '600' }}>₹{item.subtotal.toLocaleString('en-IN')}</span>
                    {item.discount > 0 && item.original_price && (
                      <span style={{textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem'}}>
                        ₹{(item.original_price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={styles.summaryDivider}></div>
            <div style={styles.summarySubRow}>
              <span>Subtotal</span>
              <span>₹{cart.total.toLocaleString('en-IN')}</span>
            </div>
            {couponDiscount > 0 && (
              <div style={styles.summarySubRow}>
                <span style={{ color: 'var(--success)' }}>Promo Discount ({appliedPromo})</span>
                <span style={{ color: 'var(--success)' }}>-₹{couponDiscount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div style={styles.summarySubRow}>
              <span>Shipping Fee</span>
              <span>{(cart.total - couponDiscount) > 1000 ? 'FREE' : '₹99.00'}</span>
            </div>
            <div style={styles.summarySubRow}>
              <span>Estimated Tax (18% standard)</span>
              <span>₹{((cart.total - couponDiscount) * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <div style={styles.summaryDivider}></div>
            
            {user?.coins >= 100 && (
              <div style={styles.coinSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🪙 Style Coins Available: {user.coins}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={useCoins} 
                      onChange={(e) => setUseCoins(e.target.checked)} 
                    />
                    Use for discount
                  </label>
                </div>
                {useCoins && (
                  <div style={{ ...styles.summarySubRow, color: 'var(--success)', marginTop: '8px' }}>
                    <span>Coins Discount</span>
                    <span>-₹{Math.min(user.coins / 100, cart.total + (cart.total > 1000 ? 0 : 99) + cart.total * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            )}
            
            <div style={styles.summaryTotalRow}>
              <span>Total amount</span>
              <span>₹{getGrandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {getGrandTotal() > 0 && (
              <p style={{fontSize: '0.8rem', color: 'var(--success)', textAlign: 'right', marginTop: '4px'}}>
                You will earn ~{Math.floor(getGrandTotal() / 100)} coins from this order!
              </p>
            )}
          </div>


        </div>
      </div>

      {/* High-Fidelity Custom Alert Modal */}
      {modalState.isOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            {modalState.type === 'flagged' ? (
              <div style={styles.modalIconBoxDanger}>
                <ShieldAlert size={36} color="var(--danger)" />
              </div>
            ) : (
              <div style={styles.modalIconBoxSuccess}>
                <CheckCircle size={36} color="var(--success)" />
              </div>
            )}

            <h2 style={styles.modalTitle}>{modalState.title}</h2>
            
            {modalState.type === 'flagged' && (
              <div style={styles.riskBadgeContainer}>
                <span style={styles.riskLabel}>Calculated Risk Score:</span>
                <span style={{
                  ...styles.riskVal,
                  color: modalState.riskScore > 75 ? 'var(--danger)' : 'var(--warning)'
                }}>
                  {modalState.riskScore.toFixed(0)} / 100
                </span>
              </div>
            )}

            <p style={styles.modalText}>{modalState.message}</p>

            {modalState.type === 'flagged' && modalState.flags.length > 0 && (
              <div style={styles.flagsList}>
                <h4 style={styles.flagsListTitle}>Risk Indicators Triggered:</h4>
                {modalState.flags.map((flag, idx) => (
                  <div key={idx} style={styles.flagItem}>
                    <div style={styles.flagHeader}>
                      <AlertTriangle size={14} color="var(--warning)" style={{ marginRight: '6px' }} />
                      <span style={styles.flagName}>{flag.rule}</span>
                      <span style={styles.flagScore}>Severity: {flag.score.toFixed(0)}</span>
                    </div>
                    <p style={styles.flagDetails}>{flag.details}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={closeModalAndRedirect} className="btn-primary" style={styles.modalBtn}>
              Go to My Orders Dashboard
            </button>
          </div>
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
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.9rem',
    marginBottom: '20px',
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '30px',
  },
  checkoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '30px',
  },
  formPanel: {
    padding: '40px 30px',
  },
  secTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
  },
  addressGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  addressInput: {
    width: '100%',
  },
  copyAddrBtn: {
    alignSelf: 'flex-start',
    background: 'none',
    border: 'none',
    color: 'var(--secondary)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '2px',
  },
  paymentSelector: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  payTypeBtn: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 10px',
    background: 'rgba(92, 77, 177, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  payTypeBtnActive: {
    borderColor: 'var(--secondary)',
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--secondary)',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)',
  },
  paymentDetailsBox: {
    padding: '20px',
    background: 'rgba(92, 77, 177, 0.05)',
    border: '1px solid rgba(92, 77, 177, 0.15)',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  paymentSubTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '12px',
  },
  cardRow: {
    display: 'flex',
    gap: '12px',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '1.05rem',
    justifyContent: 'center',
    marginTop: '10px',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  orderSummaryBox: {
    padding: '24px 30px',
  },
  summaryTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '16px',
  },
  summaryItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  summaryItemImg: {
    width: '45px',
    height: '45px',
    borderRadius: '6px',
    objectFit: 'cover',
    marginRight: '12px',
    border: '1px solid var(--border-color)',
  },
  summaryItemImgPlaceholder: {
    width: '45px',
    height: '45px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-app)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    fontSize: '1rem',
  },
  summaryDivider: {
    height: '1px',
    background: 'var(--border-color)',
    margin: '16px 0',
  },
  summarySubRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
  summaryTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: '700',
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
  },
  coinSection: {
    background: 'var(--primary-glow)',
    border: '1px solid var(--border-color)',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '12px',
  },

  /* Modal Styles */
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(5, 3, 8, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    padding: '20px',
  },
  modalContent: {
    maxWidth: '520px',
    width: '100%',
    padding: '40px',
    background: 'var(--bg-surface-elevated)',
    borderRadius: '24px',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-panel)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  modalIconBoxDanger: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: 'rgba(255, 23, 68, 0.1)',
    border: '2px solid rgba(255, 23, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: '0 0 15px rgba(255, 23, 68, 0.2)',
  },
  modalIconBoxSuccess: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: 'rgba(0, 230, 118, 0.1)',
    border: '2px solid rgba(0, 230, 118, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: '0 0 15px rgba(0, 230, 118, 0.2)',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginBottom: '12px',
  },
  riskBadgeContainer: {
    background: 'var(--primary-glow)',
    border: '1px solid var(--border-color)',
    padding: '8px 16px',
    borderRadius: '20px',
    display: 'flex',
    gap: '8px',
    fontSize: '0.85rem',
    marginBottom: '16px',
  },
  riskLabel: {
    color: 'var(--text-secondary)',
  },
  riskVal: {
    fontWeight: '800',
  },
  modalText: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '24px',
  },
  flagsList: {
    width: '100%',
    textAlign: 'left',
    background: 'var(--bg-surface)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid var(--border-color)',
    marginBottom: '24px',
  },
  flagsListTitle: {
    fontSize: '0.85rem',
    color: 'var(--secondary)',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: '12px',
    letterSpacing: '0.5px',
  },
  flagItem: {
    paddingBottom: '10px',
    marginBottom: '10px',
    borderBottom: '1px solid var(--border-color)',
  },
  flagHeader: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  flagName: {
    flex: 1,
  },
  flagScore: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
  },
  flagDetails: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    paddingLeft: '20px',
    lineHeight: '1.4',
  },
  modalBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
  },
  cartCouponsContainer: {
    marginBottom: '16px',
    padding: '12px',
    background: 'var(--primary-glow)',
    borderRadius: '12px',
    border: '1px dashed var(--primary)',
  },
  couponsTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--primary)',
    marginBottom: '10px',
  },
  couponChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  couponChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(92, 77, 177, 0.05)',
    border: '1px solid rgba(92, 77, 177, 0.15)',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: 'var(--text-primary)',
  }
};
