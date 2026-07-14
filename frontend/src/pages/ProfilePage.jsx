import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Phone, MapPin, ShoppingBag, Edit3, Check, X, Package, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';

export const ProfilePage = () => {
  const { user, token, refreshProfile } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'success' });

  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState(user?.address || '');
  const [name, setName] = useState(user?.name || user?.email?.split('@')[0] || '');

  // OTP Verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpId, setOtpId] = useState(null);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab]);

  const phoneRegex = /^\+[0-9]{1,3}[0-9]{4,14}$/;

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await fetch(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error(e); }
    finally { setOrdersLoading(false); }
  };

  const initiateSave = async () => {
    if (!phoneRegex.test(phone)) {
      triggerAlert('Phone number must start with a country code (e.g. +91) followed by digits.', 'danger');
      return;
    }

    const emailChanged = email !== user.email;
    const phoneChanged = phone !== user.phone;

    if (emailChanged || phoneChanged) {
      // Need OTP
      try {
        setVerifying(true);
        const reqBody = {};
        if (emailChanged) reqBody.email = email;
        if (phoneChanged) reqBody.phone = phone;

        const res = await fetch(`${API_URL}/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        });
        const data = await res.json();
        setVerifying(false);
        if (res.ok) {
          setOtpId(data.otp_id);
          setShowOtpModal(true);
          triggerAlert('OTPs sent! Please check console in dev mode.', 'success');
        } else {
          triggerAlert(data.message || 'Failed to send OTP.', 'danger');
        }
      } catch (e) {
        setVerifying(false);
        triggerAlert('Connection failed.', 'danger');
      }
    } else {
      // Direct save
      handleFinalSave(null);
    }
  };

  const handleVerifyOtpAndSave = async () => {
    const emailChanged = email !== user.email;
    const phoneChanged = phone !== user.phone;
    
    if (emailChanged && !emailOtp) {
      triggerAlert('Email OTP is required', 'danger');
      return;
    }
    if (phoneChanged && !phoneOtp) {
      triggerAlert('Phone OTP is required', 'danger');
      return;
    }

    try {
      setVerifying(true);
      const reqBody = { otp_id: otpId };
      if (emailChanged) reqBody.email_otp = emailOtp;
      if (phoneChanged) reqBody.phone_otp = phoneOtp;

      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });
      const data = await res.json();
      if (res.ok) {
        await handleFinalSave(data.verification_token);
      } else {
        triggerAlert(data.message || 'OTP Verification failed', 'danger');
        setVerifying(false);
      }
    } catch (e) {
      setVerifying(false);
      triggerAlert('Connection failed', 'danger');
    }
  };

  const handleFinalSave = async (verificationToken) => {
    try {
      setVerifying(true);
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone, address, name, email, verification_token: verificationToken })
      });
      setVerifying(false);
      if (res.ok) {
        triggerAlert('Profile updated successfully!', 'success');
        setEditing(false);
        setShowOtpModal(false);
        setEmailOtp('');
        setPhoneOtp('');
        if (refreshProfile) refreshProfile();
      } else {
        const d = await res.json();
        triggerAlert(d.message || 'Update failed', 'danger');
      }
    } catch (e) {
      setVerifying(false);
      triggerAlert('Connection failed', 'danger');
    }
  };

  const triggerAlert = (msg, type) => {
    setAlert({ show: true, msg, type });
    setTimeout(() => setAlert({ show: false, msg: '', type: 'success' }), 3000);
  };

  if (!user) return (
    <div style={styles.centered}>
      <h2>Please <Link to="/auth" style={{ color: 'var(--primary)' }}>sign in</Link> to view your profile.</h2>
    </div>
  );

  const initials = (name || user.email || 'U').slice(0, 2).toUpperCase();
  const coins = user.coins || 0;

  const statusColors = {
    Placed: '#f59e0b', Confirmed: '#3b82f6', Shipped: '#8b5cf6',
    Delivered: '#10b981', Cancelled: '#ef4444', Returned: '#6b7280',
  };

  return (
    <div style={styles.container}>
      {alert.show && (
        <div style={{ ...styles.alert, background: alert.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {alert.msg}
        </div>
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Verify Contact Info</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>You're changing your email or phone number. Please verify with OTPs.</p>
            
            {email !== user.email && (
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.fieldLabel}>Email OTP</label>
                <input value={emailOtp} onChange={e => setEmailOtp(e.target.value)} className="cyber-input" style={styles.inlineInput} placeholder="Enter Email OTP" />
              </div>
            )}
            
            {phone !== user.phone && (
              <div style={{ marginBottom: '24px' }}>
                <label style={styles.fieldLabel}>Phone OTP</label>
                <input value={phoneOtp} onChange={e => setPhoneOtp(e.target.value)} className="cyber-input" style={styles.inlineInput} placeholder="Enter Phone OTP" />
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleVerifyOtpAndSave} className="btn-primary" style={{ flex: 1, padding: '10px' }} disabled={verifying}>
                {verifying ? 'Verifying...' : 'Verify & Save'}
              </button>
              <button onClick={() => setShowOtpModal(false)} style={{ ...styles.editBtn, flex: 1, background: 'var(--surface-elevated)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div style={styles.headerCard} className="glass-panel">
        <div style={styles.avatarRing}>
          <div style={styles.avatar}>{initials}</div>
        </div>
        <div style={styles.headerInfo}>
          <h1 style={styles.displayName}>{name || user.email.split('@')[0]}</h1>
          <p style={styles.emailText}>{user.email}</p>
          <div style={styles.roleBadge}>{user.role?.toUpperCase()}</div>
        </div>
        <div style={styles.coinsBanner}>
          <div style={styles.coinsIcon}>🪙</div>
          <div>
            <div style={styles.coinsValue}>{coins.toLocaleString()}</div>
            <div style={styles.coinsLabel}>StyleCoins</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { id: 'profile', label: '👤 Profile', icon: User },
          { id: 'orders', label: '📦 Orders', icon: Package },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={styles.card} className="glass-panel">
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Personal Information</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={styles.editBtn}>
                <Edit3 size={16} /> Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={initiateSave} style={{ ...styles.editBtn, background: 'var(--success)', color: '#fff' }} disabled={verifying}>
                  <Check size={16} /> Save
                </button>
                <button onClick={() => {
                  setEditing(false);
                  setEmail(user.email);
                  setPhone(user.phone);
                  setAddress(user.address);
                  setName(user.name);
                }} style={{ ...styles.editBtn, background: 'var(--danger)', color: '#fff' }}>
                  <X size={16} /> Cancel
                </button>
              </div>
            )}
          </div>

          <div style={styles.fieldGrid}>
            <div style={styles.fieldItem}>
              <Mail size={16} color="var(--primary)" />
              <div style={{ flex: 1 }}>
                <div style={styles.fieldLabel}>Email</div>
                {editing ? (
                  <input value={email} onChange={e => setEmail(e.target.value)} className="cyber-input" style={styles.inlineInput} placeholder="Your email address" type="email" />
                ) : <div style={styles.fieldValue}>{user.email}</div>}
              </div>
            </div>

            <div style={styles.fieldItem}>
              <User size={16} color="var(--primary)" />
              <div style={{ flex: 1 }}>
                <div style={styles.fieldLabel}>Display Name</div>
                {editing ? (
                  <input value={name} onChange={e => setName(e.target.value)} className="cyber-input" style={styles.inlineInput} placeholder="Your name" />
                ) : <div style={styles.fieldValue}>{name || '—'}</div>}
              </div>
            </div>

            <div style={styles.fieldItem}>
              <Phone size={16} color="var(--primary)" />
              <div style={{ flex: 1 }}>
                <div style={styles.fieldLabel}>Phone</div>
                {editing ? (
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="cyber-input" style={styles.inlineInput} placeholder="+91 XXXXX XXXXX" type="tel" />
                ) : <div style={styles.fieldValue}>{user.phone || '—'}</div>}
              </div>
            </div>

            <div style={styles.fieldItem}>
              <MapPin size={16} color="var(--primary)" />
              <div style={{ flex: 1 }}>
                <div style={styles.fieldLabel}>Delivery Address</div>
                {editing ? (
                  <textarea value={address} onChange={e => setAddress(e.target.value)} className="cyber-input" style={{ ...styles.inlineInput, height: '72px', resize: 'vertical' }} placeholder="Your full address" />
                ) : <div style={styles.fieldValue}>{address || '—'}</div>}
              </div>
            </div>
          </div>

          {/* Coins Section */}
          <div style={styles.coinsCard}>
            <div style={styles.coinsHeader}>
              <span style={{ fontSize: '1.5rem' }}>🪙</span>
              <h3 style={{ margin: 0 }}>StyleCoins Balance</h3>
            </div>
            <div style={styles.coinsAmount}>{coins.toLocaleString()} coins (= ₹{(coins / 100).toFixed(2)})</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '8px 0 0' }}>
              Earn coins on every purchase. Use them at checkout for instant discounts!
              <br />100 coins = ₹1 discount
            </p>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div style={styles.card} className="glass-panel">
          <h2 style={styles.cardTitle}>Order History</h2>
          {ordersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading orders...</div>
          ) : orders.length === 0 ? (
            <div style={styles.emptyOrders}>
              <ShoppingBag size={48} color="var(--border-color)" />
              <h3>No orders yet</h3>
              <p>Start shopping to see your orders here!</p>
              <Link to="/" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px', textDecoration: 'none', borderRadius: '8px' }}>
                Shop Now
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map(order => (
                <div key={order.id} style={styles.orderCard} className="glass-panel">
                  <div style={styles.orderHeader}>
                    <div>
                      <span style={styles.orderId}>Order #{order.id}</span>
                      <span style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <span style={{ ...styles.statusBadge, background: statusColors[order.status] || '#666' }}>
                      {order.status}
                    </span>
                  </div>
                  <div style={styles.orderItems}>
                    {order.items?.slice(0, 3).map((item, i) => (
                      <div key={i} style={styles.orderItem}>
                        <span style={styles.itemName}>
                          {item.product_name}
                          {(item.selected_color || item.selected_size) && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                              {item.selected_color ? `Color: ${item.selected_color}` : ''}
                              {item.selected_color && item.selected_size ? ' | ' : ''}
                              {item.selected_size ? `Size: ${item.selected_size}` : ''}
                            </span>
                          )}
                        </span>
                        <span style={styles.itemQty}>×{item.quantity}</span>
                        <span style={styles.itemPrice}>₹{item.subtotal?.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>+{order.items.length - 3} more items</div>
                    )}
                  </div>
                  <div style={styles.orderFooter}>
                    <span style={styles.orderTotal}>Total: ₹{order.total_amount?.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.payment_method} · {order.payment_status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '80px 20px 40px', display: 'flex', flexDirection: 'column', gap: '24px' },
  centered: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' },
  alert: { position: 'fixed', top: '80px', right: '20px', padding: '12px 20px', borderRadius: '12px', color: '#fff', fontWeight: 600, zIndex: 9999 },
  headerCard: { padding: '32px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' },
  avatarRing: { padding: '3px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', borderRadius: '50%' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' },
  headerInfo: { flex: 1 },
  displayName: { margin: '0 0 4px', fontSize: '1.8rem', fontWeight: 800 },
  emailText: { margin: '0 0 8px', color: 'var(--text-secondary)', fontSize: '0.9rem' },
  roleBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' },
  coinsBanner: { display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #f59e0b22, #f59e0b11)', border: '1px solid #f59e0b44', borderRadius: '16px', padding: '16px 24px' },
  coinsIcon: { fontSize: '2rem' },
  coinsValue: { fontSize: '2rem', fontWeight: 800, color: '#f59e0b' },
  coinsLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  tabs: { display: 'flex', gap: '4px', background: 'var(--surface)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)' },
  tab: { flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9rem', transition: 'all 0.2s' },
  tabActive: { background: 'var(--primary)', color: '#fff', fontWeight: 700 },
  card: { padding: '28px', borderRadius: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  cardTitle: { margin: 0, fontSize: '1.2rem', fontWeight: 700 },
  editBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-elevated)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 },
  fieldGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  fieldItem: { display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px', background: 'var(--surface-elevated)', borderRadius: '12px', border: '1px solid var(--border-color)' },
  fieldLabel: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '4px' },
  fieldValue: { fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 },
  inlineInput: { width: '100%', padding: '6px 10px', fontSize: '0.9rem', borderRadius: '8px', boxSizing: 'border-box' },
  coinsCard: { marginTop: '24px', padding: '20px', background: 'linear-gradient(135deg, #f59e0b11, #f59e0b05)', border: '1px solid #f59e0b33', borderRadius: '16px' },
  coinsHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  coinsAmount: { fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b' },
  emptyOrders: { textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  orderCard: { padding: '20px', borderRadius: '16px' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  orderId: { fontWeight: 700, marginRight: '12px' },
  orderDate: { fontSize: '0.8rem', color: 'var(--text-muted)' },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: '#fff' },
  orderItems: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' },
  orderItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' },
  itemName: { flex: 1, color: 'var(--text-primary)' },
  itemQty: { color: 'var(--text-muted)', fontSize: '0.8rem' },
  itemPrice: { fontWeight: 600, color: 'var(--primary)' },
  orderFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { width: '90%', maxWidth: '400px', padding: '24px', borderRadius: '16px' }
};
