import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Store, UploadCloud, AlertCircle, ShieldCheck, CheckCircle2, Pencil, X, Package, MessageSquare } from 'lucide-react';
import { LineChart, BarChart } from '../components/CustomCharts';
import { API_URL } from '../config';
import { ChatModal } from '../components/ChatModal';
export const SellerDashboard = () => {
  const { token, user, submitKyc } = useContext(AuthContext);
  
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // KYC form
  const [businessName, setBusinessName] = useState(user?.seller_details?.business_name || '');
  const [gstin, setGstin] = useState(user?.seller_details?.gstin || '');
  const [bankDetails, setBankDetails] = useState(user?.seller_details?.bank_details || '');
  const [kycSuccess, setKycSuccess] = useState(false);
  const [kycError, setKycError] = useState('');

  // Product form
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pDiscount, setPDiscount] = useState('');
  const [pStock, setPStock] = useState('');
  const [pMainCatId, setPMainCatId] = useState('');
  const [pCatId, setPCatId] = useState('');
  const [pImg, setPImg] = useState('');
  const [pColorName, setPColorName] = useState('');
  const [pGroupId, setPGroupId] = useState('');
  const [pSizes, setPSizes] = useState({});
  const [pIsFreeSize, setPIsFreeSize] = useState(false);
  const [prodSuccess, setProdSuccess] = useState(false);
  const [prodError, setProdError] = useState('');

  // Product edit states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editMainCatId, setEditMainCatId] = useState('');
  const [editCatId, setEditCatId] = useState('');
  const [editImg, setEditImg] = useState('');
  const [editColorName, setEditColorName] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [editSizes, setEditSizes] = useState({});
  const [editIsFreeSize, setEditIsFreeSize] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState('');
  const [showSellerSizeGuide, setShowSellerSizeGuide] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  const [bannerImg, setBannerImg] = useState('');
  const [bannerTagline, setBannerTagline] = useState('');
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState({ text: '', type: '' });
  const [bannerDuration, setBannerDuration] = useState('1');
  const [myBanners, setMyBanners] = useState([]);

  // Buy Coins State
  const [coinLoading, setCoinLoading] = useState(false);
  const [coinMessage, setCoinMessage] = useState({ text: '', type: '' });
  
  // Coupons State
  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [minCartValue, setMinCartValue] = useState('');
  const [couponDaysValid, setCouponDaysValid] = useState('30');
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });

  // Chat State
  const [chatModal, setChatModal] = useState({ isOpen: false, receiverId: null, receiverName: '' });
  const handleOpenEditModal = (product) => {
    setEditProductId(product.id);
    setEditName(product.name);
    setEditDesc(product.description || '');
    setEditPrice(product.price);
    setEditDiscount(product.discount || '');
    setEditStock(product.stock);
    setEditCatId(product.category_id);
    
    let parentId = '';
    categories.forEach(cat => {
      if (cat.id == product.category_id) {
        parentId = cat.id;
      } else if (cat.subcategories) {
        cat.subcategories.forEach(sub => {
          if (sub.id == product.category_id) {
            parentId = cat.id;
          }
        });
      }
    });
    setEditMainCatId(parentId);

    setEditImg(product.images ? product.images.join(', ') : (product.image_url ? [product.image_url].join(', ') : ''));
    setEditColorName(product.color_name || '');
    setEditGroupId(product.group_id || '');
    
    const productSizes = product.sizes || {};
    setEditSizes(productSizes);
    setEditIsFreeSize(Object.keys(productSizes).some(k => k.toLowerCase() === 'free size'));
    
    setEditSuccess(false);
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess(false);

    if (!editName || editPrice === '' || editDiscount === '' || (Object.keys(editSizes).length === 0 && editStock === '' && !editIsFreeSize) || !editCatId) {
      setEditError('Name, price, discount, stock, and category are required.');
      return;
    }

    const imagesList = editImg.replace(/\r?\n/g, ',').split(/,\s*(?=https?:\/\/)/i).map(url => url.trim()).filter(url => url !== '');
    if (imagesList.length < 1 || imagesList.length > 8) {
      setEditError('Please provide between 1 and 8 product image URLs, separated by commas.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/products/${editProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          price: parseFloat(editPrice),
          discount: parseInt(editDiscount),
          stock: (Object.keys(editSizes).length > 0 || editIsFreeSize) ? 
            (editIsFreeSize ? parseInt(editSizes['Free Size'] || 0) : Object.values(editSizes).reduce((acc, curr) => acc + (parseInt(curr) || 0), 0)) 
            : parseInt(editStock),
          category_id: parseInt(editCatId),
          images: imagesList,
          color_name: editColorName.trim() ? editColorName : null,
          group_id: editGroupId.trim() ? editGroupId : null,
          sizes: editIsFreeSize ? { 'Free Size': parseInt(editSizes['Free Size'] || 0) } : getStandardSizesForCategory(editCatId).reduce((acc, size) => {
            if (editSizes[size]) acc[size] = parseInt(editSizes[size]);
            return acc;
          }, {})
        })
      });

      const data = await res.json();
      if (res.ok) {
        setEditSuccess(true);
        fetchSellerData();
        setTimeout(() => setIsEditModalOpen(false), 2000);
      } else {
        setEditError(data.message || 'Failed to update product.');
      }
    } catch (err) {
      setEditError('Connection failed.');
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${API_URL}/products/${editProductId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEditSuccess(true);
        fetchSellerData();
        setTimeout(() => setIsEditModalOpen(false), 1500);
      } else {
        const data = await res.json();
        setEditError(data.message || 'Failed to delete product.');
      }
    } catch (err) {
      setEditError('Connection failed.');
    }
  };

  const getCategoryDetails = (catId) => {
    const id = parseInt(catId);
    for (const mainCat of categories) {
      if (mainCat.id === id) return { catName: mainCat.name, mainCatName: mainCat.name, path: [mainCat.name] };
      if (mainCat.subcategories) {
        for (const group of mainCat.subcategories) {
          if (group.id === id) return { catName: group.name, mainCatName: mainCat.name, path: [mainCat.name, group.name] };
          if (group.subcategories) {
            for (const sub of group.subcategories) {
              if (sub.id === id) return { catName: sub.name, mainCatName: mainCat.name, path: [mainCat.name, group.name, sub.name] };
            }
          }
        }
      }
    }
    return { catName: '', mainCatName: '', path: [] };
  };

  const getStandardSizesForCategory = (catId) => {
    if (!catId) return [];
    const details = getCategoryDetails(catId);
    const combined = (details.path || []).join(' ').toLowerCase();
    
    // Non-apparel categories should not have sizes
    if (combined.includes('electronic') || combined.includes('home') || combined.includes('beauty') || combined.includes('jewellery')) {
      return [];
    }

    const isShoes = combined.includes('shoe') || combined.includes('sneaker') || combined.includes('heels') || combined.includes('flats') || combined.includes('sandals') || combined.includes('footwear');
    const isKids = combined.includes('kid') || combined.includes('child') || combined.includes('boy') || combined.includes('girl') || combined.includes('toddler');
    
    if (isShoes) {
       if (isKids) return ['10', '11', '12', '13', '1', '2', '3'];
       return ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
    }
    
    if (isKids) {
       return ['0-1 Yrs', '1-2 Yrs', '2-3 Yrs', '3-4 Yrs', '4-5 Yrs', '5-6 Yrs', '6-7 Yrs', '7-8 Yrs', '8-9 Yrs', '9-10 Yrs', '11-12 Yrs', '13-14 Yrs'];
    }
    
    return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
  };

  useEffect(() => {
    fetchCategories();
    if (token) {
      fetchSellerData();
    }
  }, [token]);

  const fetchSellerData = async () => {
    try {
      setLoading(true);
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/seller/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch products
      const prodRes = await fetch(`${API_URL}/seller/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // Fetch orders
      const orderRes = await fetch(`${API_URL}/seller/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrders(orderData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/products/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`${API_URL}/seller/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAnalytics(await res.json());
    } catch (e) { console.error(e); }
    finally { setAnalyticsLoading(false); }
  };

  const fetchMyBanners = async () => {
    try {
      const res = await fetch(`${API_URL}/seller/my-banners`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMyBanners(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    if (!bannerImg) {
      setBannerMessage({ text: 'Image URL is required', type: 'error' });
      return;
    }
    setBannerLoading(true);
    setBannerMessage({ text: '', type: '' });
    try {
      const res = await fetch(`${API_URL}/seller/banner-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          image_url: bannerImg,
          tagline: bannerTagline,
          duration: parseInt(bannerDuration)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBannerMessage({ text: data.message, type: 'success' });
        setBannerImg('');
        setBannerTagline('');
        fetchMyBanners();
        fetchCoupons();
      } else {
        setBannerMessage({ text: data.message, type: 'error' });
      }
    } catch (e) {
      setBannerMessage({ text: 'Connection failed', type: 'error' });
    } finally {
      setBannerLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await fetch(`${API_URL}/seller/coupons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCoupons(await res.json());
      }
    } catch (e) {}
  };

  const handleBuyCoins = async (amount) => {
    setCoinLoading(true);
    setCoinMessage({ text: '', type: '' });
    try {
      const res = await fetch(`${API_URL}/seller/buy-coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (res.ok) {
        setCoinMessage({ text: data.message, type: 'success' });
        fetchSellerData(); // update local coins state
      } else {
        setCoinMessage({ text: data.message, type: 'error' });
      }
    } catch (e) {
      setCoinMessage({ text: 'Connection failed', type: 'error' });
    } finally {
      setCoinLoading(false);
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    setCouponMessage({ text: '', type: '' });
    try {
      const res = await fetch(`${API_URL}/seller/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: couponCode,
          discount_percentage: parseInt(couponDiscount),
          days_valid: parseInt(couponDaysValid) || 30,
          min_cart_value: minCartValue ? parseInt(minCartValue) : 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCouponMessage({ text: data.message, type: 'success' });
        setCouponCode('');
        setCouponDiscount('');
        setMinCartValue('');
        setCouponDaysValid('30');
        fetchCoupons();
      } else {
        setCouponMessage({ text: data.message, type: 'error' });
      }
    } catch (e) {
      setCouponMessage({ text: 'Connection failed', type: 'error' });
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setKycError('');
    setKycSuccess(false);

    if (!businessName || !gstin || !bankDetails) {
      setKycError('All fields are required.');
      return;
    }

    const res = await submitKyc({
      business_name: businessName,
      gstin,
      bank_details: bankDetails
    });

    if (res.success) {
      setKycSuccess(true);
      fetchSellerData();
    } else {
      setKycError(res.message || 'Failed to submit KYC.');
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setProdError('');
    setProdSuccess(false);

    if (!pName || pPrice === '' || pDiscount === '' || (Object.keys(pSizes).length === 0 && pStock === '' && !pIsFreeSize) || !pCatId) {
      setProdError('Name, price, discount, stock, and category are required.');
      return;
    }

    const imagesList = pImg.replace(/\r?\n/g, ',').split(/,\s*(?=https?:\/\/)/i).map(url => url.trim()).filter(url => url !== '');
    if (imagesList.length < 1 || imagesList.length > 8) {
      setProdError('Please provide between 1 and 8 product image URLs, separated by commas.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: pName,
          description: pDesc,
          price: parseFloat(pPrice),
          discount: parseInt(pDiscount),
          stock: (Object.keys(pSizes).length > 0 || pIsFreeSize) ? 
            (pIsFreeSize ? parseInt(pSizes['Free Size'] || 0) : Object.values(pSizes).reduce((acc, curr) => acc + (parseInt(curr) || 0), 0)) 
            : parseInt(pStock),
          category_id: parseInt(pCatId),
          images: imagesList,
          color_name: pColorName.trim() ? pColorName : null,
          group_id: pGroupId.trim() ? pGroupId : null,
          sizes: pIsFreeSize ? { 'Free Size': parseInt(pSizes['Free Size'] || 0) } : getStandardSizesForCategory(pCatId).reduce((acc, size) => {
            if (pSizes[size]) acc[size] = parseInt(pSizes[size]);
            return acc;
          }, {})
        })
      });

      const data = await res.json();

      if (res.ok) {
        setProdSuccess(true);
        // Reset form
        setPName('');
        setPDesc('');
        setPPrice('');
        setPDiscount('');
        setPStock('');
        setPMainCatId('');
        setPCatId('');
        setPImg('');
        setPColorName('');
        setPGroupId('');
        setPSizes([]);
        
        // Refresh products list
        fetchSellerData();
      } else {
        setProdError(data.message || 'Failed to list product.');
      }
    } catch (err) {
      setProdError('Connection failed.');
    }
  };

  const handleOrderStatusUpdate = async (orderId, currentStatus, nextStatus) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        fetchSellerData();
      } else {
        alert('Failed to update status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !stats) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.loader}></div>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading seller dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>
        Seller Vendor Panel
        <span style={{ color: 'var(--secondary)', marginLeft: '6px' }}><Store size={24} style={{ display: 'inline' }} /></span>
      </h1>

      {/* Tab Nav */}
      <div style={styles.tabNav}>
        <button onClick={() => setActiveTab('dashboard')} style={{ ...styles.tabBtn, ...(activeTab === 'dashboard' ? styles.tabBtnActive : {}) }}>📊 Dashboard</button>
        <button onClick={() => { setActiveTab('analytics'); fetchAnalytics(); }} style={{ ...styles.tabBtn, ...(activeTab === 'analytics' ? styles.tabBtnActive : {}) }}>📈 Analytics</button>
        <button onClick={() => { setActiveTab('sponsored'); fetchMyBanners(); }} style={{ ...styles.tabBtn, ...(activeTab === 'sponsored' ? styles.tabBtnActive : {}) }}>⭐ Sponsored</button>
        <button onClick={() => { setActiveTab('coupons'); fetchCoupons(); }} style={{ ...styles.tabBtn, ...(activeTab === 'coupons' ? styles.tabBtnActive : {}) }}>🎫 Coupons</button>
        <button onClick={() => { setActiveTab('coins'); }} style={{ ...styles.tabBtn, ...(activeTab === 'coins' ? styles.tabBtnActive : {}) }}>🪙 Style Coins</button>
      </div>

      {activeTab === 'analytics' && (
        <div style={{ marginBottom: '40px' }}>
          {analyticsLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading analytics...</div>
          ) : !analytics ? (
            <div style={{ textAlign: 'center', padding: '60px' }} className="glass-panel">
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
              <h3>Could not load analytics</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Click the button below to try again.</p>
              <button className="btn-primary" onClick={fetchAnalytics} style={{ padding: '10px 24px' }}>🔄 Reload Analytics</button>
            </div>
          ) : analytics.total_orders === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px' }} className="glass-panel">
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📈</div>
              <h3>No sales data yet</h3>
              <p style={{ color: 'var(--text-muted)' }}>Analytics will appear here once you receive orders.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* KPI Cards */}
              <div style={styles.statsGrid}>
                <div style={styles.statsCard} className="glass-panel">
                  <span style={styles.statsLabel}>Total Revenue</span>
                  <h3 style={styles.statsVal}>₹{analytics.total_revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div style={styles.statsCard} className="glass-panel">
                  <span style={styles.statsLabel}>Orders Fulfilled</span>
                  <h3 style={styles.statsVal}>{analytics.total_orders}</h3>
                </div>
              </div>

              {/* Charts Container */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
                {/* Revenue Over Time */}
                <div style={styles.chartCard} className="glass-panel">
                  <h3 style={styles.chartTitle}>📅 Revenue Over Time</h3>
                  <div style={{ marginTop: '16px' }}>
                    <LineChart 
                      labels={analytics.revenue_timeline?.labels || []} 
                      values={analytics.revenue_timeline?.values || []} 
                    />
                  </div>
                </div>

                {/* Category Breakdown */}
                <div style={styles.chartCard} className="glass-panel">
                  <h3 style={styles.chartTitle}>🗂️ Revenue by Category</h3>
                  <div style={{ marginTop: '16px' }}>
                    <BarChart 
                      data={analytics.category_breakdown?.map(cat => ({ label: cat.name, value: cat.revenue })) || []} 
                    />
                  </div>
                </div>

                {/* Top Products */}
                <div style={{ ...styles.chartCard, gridColumn: '1 / -1' }} className="glass-panel">
                  <h3 style={styles.chartTitle}>🏆 Top Products by Revenue</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analytics.top_products?.map((prod, i) => {
                      const max = analytics.top_products[0]?.revenue || 1;
                      const pct = (prod.revenue / max) * 100;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ width: '160px', fontSize: '0.85rem', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</span>
                          <div style={{ flex: 1, height: '10px', background: 'var(--surface-elevated)', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, var(--primary), var(--secondary))`, borderRadius: '5px', transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', width: '80px', textAlign: 'right' }}>₹{prod.revenue.toLocaleString('en-IN')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sponsored' && (
        <div style={{ marginBottom: '40px' }}>
          <div style={styles.dashboardGrid}>
            {/* Purchase Form */}
            <div style={styles.creatorPanel} className="glass-panel">
              <h2 style={styles.panelTitle}>Purchase Sponsored Banner</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Showcase your brand at the top of the homepage. Cost: <strong>100 Style Coins per day</strong>.
                <br/>Your current balance: <span style={{ color: 'gold', fontWeight: 'bold' }}>{user?.coins || 0}</span> Coins
              </p>

              {bannerMessage.text && (
                <div style={bannerMessage.type === 'success' ? styles.successAlert : styles.errorAlert}>
                  {bannerMessage.text}
                </div>
              )}

              <form onSubmit={handleBannerSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Banner Image URL *</label>
                  <input
                    type="url"
                    placeholder="https://example.com/my-banner.jpg"
                    value={bannerImg}
                    onChange={(e) => setBannerImg(e.target.value)}
                    className="cyber-input"
                    required
                  />
                  <small style={{ color: 'var(--text-muted)' }}>Provide a high-quality wide image.</small>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tagline *</label>
                  <input
                    type="text"
                    placeholder="e.g. Summer Collection 50% Off"
                    value={bannerTagline}
                    onChange={(e) => setBannerTagline(e.target.value)}
                    className="cyber-input"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Duration</label>
                  <select
                    value={bannerDuration}
                    onChange={(e) => setBannerDuration(e.target.value)}
                    className="cyber-input"
                    style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  >
                    <option value="1">1 Day (100 Coins)</option>
                    <option value="2">2 Days (200 Coins)</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={bannerLoading}>
                  {bannerLoading ? 'Processing...' : `Pay ${parseInt(bannerDuration) * 100} Style Coins`}
                </button>
              </form>
            </div>

            {/* Current Banners */}
            <div style={styles.ordersPanel} className="glass-panel">
              <h2 style={styles.panelTitle}>Your Banners</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myBanners.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No banners purchased yet.</p>
                ) : (
                  myBanners.map((b) => {
                    const isActive = new Date(b.expires_at) > new Date();
                    return (
                      <div key={b.id} style={{ display: 'flex', gap: '12px', background: 'var(--surface)', padding: '12px', borderRadius: '8px', borderLeft: isActive ? '4px solid var(--success)' : '4px solid var(--text-muted)' }}>
                        <img src={b.image_url} alt="Banner" style={{ width: '120px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px 0' }}>{b.tagline || 'Sponsored Ad'}</h4>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Status: <span style={{ color: isActive ? 'var(--success)' : 'var(--text-muted)', fontWeight: 'bold' }}>{isActive ? 'Active' : 'Expired'}</span>
                            <br/>Expires: {new Date(b.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COINS TAB */}
      {activeTab === 'coins' && (
        <div style={styles.dashboardGrid}>
          {/* Buy Coins Store */}
          <div style={styles.creatorPanel} className="glass-panel">
            <h2 style={styles.panelTitle}>Buy Style Coins</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Purchase Style Coins to run Sponsored Banners and promote your brand.
            </p>

            {coinMessage.text && (
              <div style={coinMessage.type === 'success' ? styles.successAlert : styles.errorAlert}>
                {coinMessage.text}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'gold' }}>⭐ 500 Style Coins</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>₹500 (Base Package)</span>
                </div>
                <button 
                  onClick={() => handleBuyCoins(500)} 
                  className="btn-primary" 
                  disabled={coinLoading}
                  style={{ minWidth: '100px' }}
                >
                  Buy
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'gold' }}>⭐ 1,200 Style Coins</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>₹1,000 (20% Bonus)</span>
                </div>
                <button 
                  onClick={() => handleBuyCoins(1200)} 
                  className="btn-primary" 
                  disabled={coinLoading}
                  style={{ minWidth: '100px' }}
                >
                  Buy
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'gold' }}>⭐ 3,000 Style Coins</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>₹2,000 (50% Bonus)</span>
                </div>
                <button 
                  onClick={() => handleBuyCoins(3000)} 
                  className="btn-primary" 
                  disabled={coinLoading}
                  style={{ minWidth: '100px' }}
                >
                  Buy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COUPONS TAB */}
      {activeTab === 'coupons' && (
        <div style={styles.dashboardGrid}>
          <div style={styles.creatorPanel} className="glass-panel">
            <h2 style={styles.panelTitle}>Create Promo Code</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Generate discount codes to share with your customers. The discount will only apply to your brand's products in their cart.
            </p>

            {couponMessage.text && (
              <div style={couponMessage.type === 'success' ? styles.successAlert : styles.errorAlert}>
                {couponMessage.text}
              </div>
            )}

            <form onSubmit={handleCouponSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Promo Code *</label>
                <input
                  type="text"
                  placeholder="e.g. SUMMER50"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="cyber-input"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Discount Percentage *</label>
                <input
                  type="number"
                  placeholder="e.g. 20 for 20%"
                  min="1"
                  max="99"
                  value={couponDiscount}
                  onChange={(e) => setCouponDiscount(e.target.value)}
                  className="cyber-input"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Minimum Cart Value (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  min="0"
                  value={minCartValue}
                  onChange={(e) => setMinCartValue(e.target.value)}
                  className="cyber-input"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Valid for (Days) *</label>
                <input
                  type="number"
                  placeholder="e.g. 30"
                  min="1"
                  value={couponDaysValid}
                  onChange={(e) => setCouponDaysValid(e.target.value)}
                  className="cyber-input"
                  required
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                Create Coupon
              </button>
            </form>
          </div>

          <div style={styles.ordersPanel} className="glass-panel">
            <h2 style={styles.panelTitle}>Your Active Promo Codes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {coupons.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No coupons created yet.</p>
              ) : (
                coupons.map((c) => {
                  const isActive = new Date(c.expires_at) > new Date() && c.is_active;
                  return (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '12px 16px', borderRadius: '8px', borderLeft: isActive ? '4px solid var(--success)' : '4px solid var(--text-muted)' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--primary)', fontWeight: '800', letterSpacing: '0.5px' }}>{c.code}</h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {c.discount_percentage}% OFF
                          {c.min_cart_value > 0 && <span style={{marginLeft: '8px', opacity: 0.8}}>(Min spend: ₹{c.min_cart_value})</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Status: <span style={{ color: isActive ? 'var(--success)' : 'var(--text-muted)', fontWeight: 'bold' }}>{isActive ? 'Active' : 'Expired'}</span>
                        <br/>Expires: {new Date(c.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
      <div>
        {stats && (
          <div style={styles.statsRow}>
            <div style={{ ...styles.statsCard, position: 'relative' }} className="glass-panel">
              <span style={styles.statsLabel}>Total Earnings</span>
              <h3 style={styles.statsVal}>₹{stats.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                * Standard ₹20 flat fee applies per bank withdrawal.
              </div>
            </div>
            <div style={styles.statsCard} className="glass-panel">
              <span style={styles.statsLabel}>Style Coins</span>
              <h3 style={{...styles.statsVal, color: 'gold'}}>{user?.coins || 0}</h3>
            </div>
            <div style={styles.statsCard} className="glass-panel">
              <span style={styles.statsLabel}>Orders Processed</span>
              <h3 style={styles.statsVal}>{stats.order_count}</h3>
            </div>
            <div style={styles.statsCard} className="glass-panel">
              <span style={styles.statsLabel}>Return Rate</span>
              <h3 style={{ ...styles.statsVal, color: stats.return_rate > 20 ? 'var(--danger)' : 'var(--success)' }}>
                {stats.return_rate.toFixed(1)}%
              </h3>
            </div>
            <div style={styles.statsCard} className="glass-panel">
              <span style={styles.statsLabel}>Complaint Rate</span>
              <h3 style={{ ...styles.statsVal, color: stats.complaint_rate > 10 ? 'var(--danger)' : 'var(--success)' }}>
                {stats.complaint_rate.toFixed(1)}%
              </h3>
            </div>
          </div>
        )}

        {stats && !stats.is_kyc_verified && (
          <div style={styles.kycAlertBox} className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <AlertCircle size={24} color={stats.kyc_rejection_reason ? "var(--danger)" : "var(--warning)"} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: stats.kyc_rejection_reason ? "var(--danger)" : "inherit" }}>
                {stats.kyc_rejection_reason ? 'KYC Verification Rejected' : 'KYC Verification Pending'}
              </h3>
            </div>
            
            {stats.kyc_rejection_reason && (
              <div style={{ padding: '12px', background: 'rgba(255, 0, 0, 0.1)', borderLeft: '4px solid var(--danger)', marginBottom: '16px', borderRadius: '4px' }}>
                <strong>Reason for Rejection:</strong> {stats.kyc_rejection_reason}
                <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.8 }}>Please update your details below and resubmit for approval.</div>
              </div>
            )}
            <p style={styles.kycText}>
              Your seller profile is unverified. Customers will see a "Scam Risk" flag on listing items, and checkout limits are capped at ₹10,000. Submit/Update your business records below to request admin approval.
            </p>
            
            {kycSuccess && <div style={styles.successAlert}>KYC submitted successfully! Pending admin approval.</div>}
            {kycError && <div style={styles.errorAlert}>{kycError}</div>}

            <form onSubmit={handleKycSubmit} style={styles.kycForm}>
              <input
                type="text"
                placeholder="Business / Shop Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="cyber-input"
                style={styles.kycInput}
                required
              />
              <input
                type="text"
                placeholder="GSTIN Number (15-digit)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="cyber-input"
                style={styles.kycInput}
                required
              />
              <input
                type="text"
                placeholder="Bank details (Acct Name, Bank, Account Number, IFSC)"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                className="cyber-input"
                style={{ ...styles.kycInput, flex: 2 }}
                required
              />
              <button type="submit" className="btn-primary" style={styles.kycBtn}>
                Submit Documents
              </button>
            </form>
          </div>
        )}

      {stats && stats.is_kyc_verified && (
        <div style={styles.kycVerifiedBox} className="glass-panel">
          <ShieldCheck size={20} color="var(--success)" style={{ marginRight: '6px' }} />
          Verified Merchant Profile: <b>{stats.business_name}</b> (No listing caps or flags)
        </div>
      )}

      {/* Main Grid: Upload Product & Orders Queue */}
      <div style={styles.dashboardGrid}>
        {/* Left: Product Creator */}
        <div style={styles.creatorPanel} className="glass-panel">
          <h2 style={styles.panelTitle}>List New Product</h2>
          
          {prodSuccess && <div style={styles.successAlert}>Product listed successfully!</div>}
          {prodError && <div style={styles.errorAlert}>{prodError}</div>}

          <form onSubmit={handleProductSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Product Title *</label>
              <input
                type="text"
                placeholder="e.g. Silk Sarees, Analog Watch..."
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                className="cyber-input"
                required
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Main Category *</label>
                <select
                  value={pMainCatId}
                  onChange={(e) => {
                    setPMainCatId(e.target.value);
                    setPCatId('');
                  }}
                  className="cyber-input"
                  style={styles.select}
                  required
                >
                  <option value="">Select Main Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} style={{ fontWeight: 'bold' }}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {pMainCatId && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Subcategory *</label>
                  <select
                    value={pCatId}
                    onChange={(e) => setPCatId(e.target.value)}
                    className="cyber-input"
                    style={styles.select}
                    required
                  >
                    <option value="">Select Subcategory</option>
                    {categories.find(c => c.id.toString() === pMainCatId.toString())?.subcategories.map(group => (
                      group.subcategories && group.subcategories.length > 0 ? (
                        <optgroup key={group.id} label={group.name}>
                          {group.subcategories.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </optgroup>
                      ) : (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      )
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Price (₹) *</label>
                <input
                  type="number"
                  placeholder="999"
                  value={pPrice}
                  onChange={(e) => setPPrice(e.target.value)}
                  className="cyber-input"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Discount (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="e.g. 15 for 15% off (0 for no discount)"
                  value={pDiscount}
                  onChange={(e) => setPDiscount(e.target.value)}
                  className="cyber-input"
                  required
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Initial Stock Quantity *</label>
                <input
                  type="number"
                  placeholder="25"
                  value={(Object.keys(pSizes).length > 0 || pIsFreeSize) ? (pIsFreeSize ? parseInt(pSizes['Free Size'] || 0) : Object.values(pSizes).reduce((acc, curr) => acc + (parseInt(curr) || 0), 0)) : pStock}
                  onChange={(e) => setPStock(e.target.value)}
                  className="cyber-input"
                  required
                  disabled={Object.keys(pSizes).length > 0 || pIsFreeSize}
                  style={(Object.keys(pSizes).length > 0 || pIsFreeSize) ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                />
                {(Object.keys(pSizes).length > 0 || pIsFreeSize) && <small style={{ color: 'var(--text-muted)' }}>Auto-calculated from sizes</small>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Product Image URLs (2 to 8 URLs, comma-separated) *</label>
                <input
                  type="text"
                  placeholder="e.g. https://image1.png, https://image2.png"
                  value={pImg}
                  onChange={(e) => setPImg(e.target.value)}
                  className="cyber-input"
                  style={{ textOverflow: 'ellipsis' }}
                  required
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Variation Group ID (Optional, matches with other colors)</label>
              <input
                type="text"
                placeholder="e.g. iphone-15-group"
                value={pGroupId}
                onChange={(e) => setPGroupId(e.target.value)}
                className="cyber-input"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Color Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Matte Black"
                value={pColorName}
                onChange={(e) => setPColorName(e.target.value)}
                className="cyber-input"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Available Sizes & Stock (Optional)</label>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={pIsFreeSize}
                    onChange={(e) => setPIsFreeSize(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  This product is "Free Size" (One Size Fits All)
                </label>
              </div>

              {!pIsFreeSize && pCatId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                  {getStandardSizesForCategory(pCatId).map(size => (
                    <div key={size} style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'center' }}>{size}</span>
                      <input
                        type="number"
                        placeholder="Stock"
                        min="0"
                        value={pSizes[size] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPSizes(prev => ({ ...prev, [size]: val }));
                        }}
                        className="cyber-input"
                        style={{ padding: '5px', textAlign: 'center', height: '30px' }}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {pIsFreeSize && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', maxWidth: '150px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'center' }}>Free Size</span>
                  <input
                    type="number"
                    placeholder="Stock"
                    min="0"
                    value={pSizes['Free Size'] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPSizes(prev => ({ ...prev, ['Free Size']: val }));
                    }}
                    className="cyber-input"
                    style={{ padding: '5px', textAlign: 'center', height: '30px' }}
                  />
                </div>
              )}
              
              {!pCatId && !pIsFreeSize && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>Please select a category first to view standard sizes.</p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description & Attributes</label>
              <textarea
                placeholder="Details about quality, dimensions, materials, and variants..."
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
                className="cyber-input"
                rows={3}
              />
            </div>

            <button type="submit" className="btn-primary" style={styles.submitBtn}>
              <UploadCloud size={18} />
              Publish Product Listing
            </button>
          </form>
        </div>

        {/* Right: Orders Fulfillment Queue */}
        <div style={styles.ordersQueuePanel} className="glass-panel">
          <h2 style={styles.panelTitle}>Fulfillment Queue</h2>
          {orders.length > 0 ? (
            <div style={styles.ordersQueueList}>
              {orders.map((ord) => (
                <div key={ord.id} style={styles.queueCard} className="glass-panel">
                  <div style={styles.queueHeader}>
                    <div>
                      <h4 style={styles.queueOrderId}>Order #{ord.seller_order_sequence || ord.id}</h4>
                      <span style={styles.queueBuyer}>
                        {ord.buyer_email}
                        <button 
                          onClick={() => setChatModal({ isOpen: true, receiverId: ord.user_id, receiverName: ord.buyer_email })}
                          style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center' }}
                        >
                          <MessageSquare size={14} style={{ marginRight: '4px' }} /> Message Buyer
                        </button>
                      </span>
                    </div>
                    <span style={styles.queueStatus}>{ord.status.replace('_', ' ')}</span>
                  </div>

                  <div style={styles.queueItems}>
                    {ord.seller_items.map((item, idx) => (
                      <div key={idx} style={styles.queueItemRow}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} style={styles.queueItemImg} />
                          ) : (
                            <div style={styles.queueItemImgPlaceholder}>
                              <Package size={16} style={{ color: 'var(--text-muted)' }} />
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{item.product_name} <b>x{item.quantity}</b></span>
                            {(item.selected_color || item.selected_size) && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {item.selected_color ? `Color: ${item.selected_color}` : ''}
                                {item.selected_color && item.selected_size ? ' | ' : ''}
                                {item.selected_size ? `Size: ${item.selected_size}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <span>₹{item.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  <p style={styles.queueAddress}>📍 <b>Ship to:</b> {ord.delivery_address}</p>

                  {ord.status === 'Return_Requested' && (
                    <div style={{ padding: '10px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '6px', margin: '10px 0', borderLeft: '4px solid var(--danger)' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--danger)' }}><b>Return Reason:</b> {ord.return_reason}</p>
                    </div>
                  )}

                  <div style={styles.queueActions}>
                    {ord.status === 'Placed' && (
                      <button
                        onClick={() => handleOrderStatusUpdate(ord.id, ord.status, 'Confirmed')}
                        className="btn-primary"
                        style={styles.actionBtn}
                      >
                        Accept & Confirm
                      </button>
                    )}
                    {ord.status === 'Confirmed' && (
                      <button
                        onClick={() => handleOrderStatusUpdate(ord.id, ord.status, 'Shipped')}
                        className="btn-primary"
                        style={styles.actionBtn}
                      >
                        Dispatch / Ship Order
                      </button>
                    )}
                    {ord.status === 'Shipped' && (
                      <button
                        onClick={() => handleOrderStatusUpdate(ord.id, ord.status, 'Delivered')}
                        className="btn-primary"
                        style={styles.actionBtn}
                      >
                        Mark as Delivered
                      </button>
                    )}
                    {ord.status === 'Return_Requested' && (
                      <button
                        onClick={() => handleOrderStatusUpdate(ord.id, ord.status, 'Returned')}
                        className="btn-danger"
                        style={styles.actionBtn}
                      >
                        Accept Return / Refund
                      </button>
                    )}
                    {['Delivered', 'Returned', 'Refunded'].includes(ord.status) && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <CheckCircle2 size={14} style={{ color: 'var(--success)', marginRight: '4px' }} />
                        Lifecycle Completed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.noOrders}>
              <p style={{ color: 'var(--text-muted)' }}>No customer orders assigned to you yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Listings Inventory Section */}
      <div style={{ ...styles.creatorPanel, marginTop: '30px' }} className="glass-panel">
        <h2 style={styles.panelTitle}>Active Catalog Inventory ({products.length})</h2>
        {products.length > 0 ? (
          <div style={styles.catalogTableContainer} className="table-responsive">
            <table style={styles.table}>
              <thead>
                <tr style={styles.tr}>
                  <th style={styles.th}>Image</th>
                  <th style={styles.th}>Product Title</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Price</th>
                  <th style={styles.th}>Stock</th>
                  <th style={styles.th}>Rating</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}>
                      <img src={p.image_url || 'https://via.placeholder.com/50'} alt={p.name} style={styles.tableImg} />
                    </td>
                    <td style={styles.td}><b>{p.name}</b></td>
                    <td style={styles.td}>{p.category_name}</td>
                    <td style={styles.td}>₹{p.price.toLocaleString('en-IN')}</td>
                    <td style={styles.td}>
                      <span style={{ color: p.stock < 5 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                        {p.stock}
                      </span>
                    </td>
                    <td style={styles.td}>★ {p.rating.toFixed(1)}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="btn-secondary"
                        style={styles.editBtn}
                        title="Edit Product"
                      >
                        <Pencil size={12} style={{ marginRight: '4px' }} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.noOrders}>
            <p style={{ color: 'var(--text-muted)' }}>You haven't listed any products yet.</p>
          </div>
        )}
      </div>
      </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Edit Product Listing</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            
            {editSuccess && <div style={styles.successAlert}>Product updated successfully!</div>}
            {editError && <div style={styles.errorAlert}>{editError}</div>}

            <form onSubmit={handleEditProductSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Product Title *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="cyber-input"
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Main Category *</label>
                  <select
                    value={editMainCatId}
                    onChange={(e) => {
                      setEditMainCatId(e.target.value);
                      setEditCatId('');
                    }}
                    className="cyber-input"
                    style={styles.select}
                    required
                  >
                    <option value="">Select Main Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} style={{ fontWeight: 'bold' }}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {editMainCatId && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Subcategory *</label>
                    <select
                      value={editCatId}
                      onChange={(e) => setEditCatId(e.target.value)}
                      className="cyber-input"
                      style={styles.select}
                      required
                    >
                      <option value="">Select Subcategory</option>
                      {categories.find(c => c.id.toString() === editMainCatId.toString())?.subcategories.map(group => (
                        group.subcategories && group.subcategories.length > 0 ? (
                          <optgroup key={group.id} label={group.name}>
                            {group.subcategories.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </optgroup>
                        ) : (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        )
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Price (₹) *</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="cyber-input"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Discount (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    className="cyber-input"
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Stock Quantity *</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={(Object.keys(editSizes).length > 0 || editIsFreeSize) ? (editIsFreeSize ? parseInt(editSizes['Free Size'] || 0) : Object.values(editSizes).reduce((acc, curr) => acc + (parseInt(curr) || 0), 0)) : editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="cyber-input"
                    required
                    disabled={Object.keys(editSizes).length > 0 || editIsFreeSize}
                    style={(Object.keys(editSizes).length > 0 || editIsFreeSize) ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                  />
                  {(Object.keys(editSizes).length > 0 || editIsFreeSize) && <small style={{ color: 'var(--text-muted)' }}>Auto-calculated from sizes</small>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Product Image URLs (2 to 8, comma-separated) *</label>
                  <input
                    type="text"
                    value={editImg}
                    onChange={(e) => setEditImg(e.target.value)}
                    className="cyber-input"
                    style={{ textOverflow: 'ellipsis' }}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Variation Group ID (Optional)</label>
                <input
                  type="text"
                  value={editGroupId}
                  onChange={(e) => setEditGroupId(e.target.value)}
                  className="cyber-input"
                  placeholder="e.g. iphone-15-group"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Color Name (Optional)</label>
                <input
                  type="text"
                  value={editColorName}
                  onChange={(e) => setEditColorName(e.target.value)}
                  className="cyber-input"
                  placeholder="e.g. Matte Black"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Available Sizes & Stock (Optional)</label>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={editIsFreeSize}
                      onChange={(e) => setEditIsFreeSize(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    This product is "Free Size" (One Size Fits All)
                  </label>
                </div>

                {!editIsFreeSize && editCatId && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                    {getStandardSizesForCategory(editCatId).map(size => (
                      <div key={size} style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'center' }}>{size}</span>
                        <input
                          type="number"
                          placeholder="Stock"
                          min="0"
                          value={editSizes[size] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditSizes(prev => ({ ...prev, [size]: val }));
                          }}
                          className="cyber-input"
                          style={{ padding: '5px', textAlign: 'center', height: '30px' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {editIsFreeSize && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', maxWidth: '150px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'center' }}>Free Size</span>
                    <input
                      type="number"
                      placeholder="Stock"
                      min="0"
                      value={editSizes['Free Size'] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditSizes(prev => ({ ...prev, ['Free Size']: val }));
                      }}
                      className="cyber-input"
                      style={{ padding: '5px', textAlign: 'center', height: '30px' }}
                    />
                  </div>
                )}
                
                {!editCatId && !editIsFreeSize && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>Please select a category first to view standard sizes.</p>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description & Attributes</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="cyber-input"
                  rows={3}
                />
              </div>

              <div style={{ ...styles.modalActions, justifyContent: 'space-between' }}>
                <button type="button" onClick={handleDeleteProduct} style={{ ...styles.cancelBtn, background: '#ff4d4d', color: '#fff', border: 'none' }}>
                  Delete Product
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary" style={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={styles.saveBtn}>
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ChatModal 
        isOpen={chatModal.isOpen} 
        onClose={() => setChatModal({ isOpen: false, receiverId: null, receiverName: '' })}
        receiverId={chatModal.receiverId}
        receiverName={chatModal.receiverName}
      />
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
    fontSize: '1.8rem',
    fontWeight: 800,
    marginBottom: '24px',
  },
  tabNav: {
    display: 'flex',
    gap: '4px',
    background: 'var(--surface)',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid var(--border-color)',
    marginBottom: '28px',
    width: 'fit-content',
  },
  tabBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: '0.9rem',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: 'var(--primary)',
    color: '#fff',
    fontWeight: 700,
  },
  chartCard: {
    padding: '24px',
    borderRadius: '16px',
  },
  chartTitle: {
    margin: '0 0 20px',
    fontSize: '1rem',
    fontWeight: 700,
  },
  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    height: '160px',
    paddingBottom: '4px',
  },
  barGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: '4px 4px 0 0',
    minHeight: '4px',
    transition: 'height 0.5s ease',
    cursor: 'pointer',
  },
  barLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
    textAlign: 'center',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statsCard: {
    padding: '20px 24px',
    background: 'rgba(92, 77, 177, 0.05)',
    border: '1px solid rgba(92, 77, 177, 0.12)',
    borderRadius: '12px',
  },
  statsLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '6px',
  },
  statsVal: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  kycAlertBox: {
    padding: '24px 30px',
    background: 'var(--warning-bg)',
    border: '1px solid var(--warning)',
    marginBottom: '30px',
  },
  kycText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  kycForm: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  kycInput: {
    flex: 1,
    minWidth: '200px',
    fontSize: '0.85rem',
    padding: '10px 14px',
  },
  kycBtn: {
    fontSize: '0.85rem',
    padding: '0 20px',
  },
  kycVerifiedBox: {
    padding: '12px 20px',
    background: 'var(--success-bg)',
    border: '1px solid var(--success)',
    color: 'var(--success)',
    borderRadius: '10px',
    marginBottom: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.9rem',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
  },
  creatorPanel: {
    padding: '30px',
  },
  panelTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    marginBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '10px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
  },
  formGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  select: {
    width: '100%',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  submitBtn: {
    justifyContent: 'center',
    padding: '12px',
    marginTop: '8px',
  },
  ordersQueuePanel: {
    padding: '30px',
  },
  ordersQueueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '520px',
    overflowY: 'auto',
  },
  queueCard: {
    padding: '16px',
    background: 'var(--bg-surface)',
    border: '1px solid rgba(92, 77, 177, 0.12)',
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  queueOrderId: {
    fontSize: '0.95rem',
    fontWeight: '700',
  },
  queueBuyer: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  queueStatus: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    background: 'rgba(92, 77, 177, 0.08)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  queueItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px 0',
    borderTop: '1px dashed var(--border-color)',
    borderBottom: '1px dashed var(--border-color)',
    marginBottom: '10px',
  },
  queueItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  queueAddress: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '12px',
  },
  queueActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    fontSize: '0.8rem',
    padding: '6px 14px',
    borderRadius: '6px',
  },
  catalogTableContainer: {
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  th: {
    padding: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  td: {
    padding: '12px',
  },
  tableImg: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
    background: 'var(--bg-app)',
  },
  noOrders: {
    textAlign: 'center',
    padding: '30px',
  },
  errorAlert: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: '1px solid rgba(255, 23, 68, 0.2)',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    textAlign: 'center',
  },
  successAlert: {
},
  statsVal: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  kycAlertBox: {
    padding: '24px 30px',
    background: 'var(--warning-bg)',
    border: '1px solid var(--warning)',
    marginBottom: '30px',
  },
  kycText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '16px',
  },
  kycForm: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  kycInput: {
    flex: 1,
    minWidth: '200px',
    fontSize: '0.85rem',
    padding: '10px 14px',
  },
  kycBtn: {
    fontSize: '0.85rem',
    padding: '0 20px',
  },
  kycVerifiedBox: {
    padding: '12px 20px',
    background: 'var(--success-bg)',
    border: '1px solid var(--success)',
    color: 'var(--success)',
    borderRadius: '10px',
    marginBottom: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.9rem',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
  },
  creatorPanel: {
    padding: '30px',
  },
  panelTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    marginBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '10px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
  },
  formGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  select: {
    width: '100%',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  submitBtn: {
    justifyContent: 'center',
    padding: '12px',
    marginTop: '8px',
  },
  ordersQueuePanel: {
    padding: '30px',
  },
  ordersQueueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '520px',
    overflowY: 'auto',
  },
  queueCard: {
    padding: '16px',
    background: 'var(--bg-surface)',
    border: '1px solid rgba(92, 77, 177, 0.12)',
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  queueOrderId: {
    fontSize: '0.95rem',
    fontWeight: '700',
  },
  queueBuyer: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  queueStatus: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    background: 'rgba(92, 77, 177, 0.08)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  queueItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px 0',
    borderTop: '1px dashed var(--border-color)',
    borderBottom: '1px dashed var(--border-color)',
    marginBottom: '10px',
  },
  queueItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  queueAddress: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '12px',
  },
  queueActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    fontSize: '0.8rem',
    padding: '6px 14px',
    borderRadius: '6px',
  },
  catalogTableContainer: {
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  th: {
    padding: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  td: {
    padding: '12px',
  },
  tableImg: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
    background: 'var(--bg-app)',
  },
  noOrders: {
    textAlign: 'center',
    padding: '30px',
  },
  errorAlert: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: '1px solid rgba(255, 23, 68, 0.2)',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    textAlign: 'center',
  },
  successAlert: {
    background: 'var(--success-bg)',
    color: 'var(--success)',
    border: '1px solid rgba(0, 230, 118, 0.2)',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    textAlign: 'center',
  },
  loader: {
    border: '3px solid rgba(138, 43, 226, 0.1)',
    borderTop: '3px solid var(--secondary)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    animation: 'spin 1s linear infinite',
  },
  editBtn: {
    padding: '4px 10px',
    fontSize: '0.8rem',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    background: 'var(--primary-glow)',
    color: 'var(--primary)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(31, 26, 38, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    padding: '20px',
  },
  modalContent: {
    maxWidth: '800px',
    width: '100%',
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '30px 40px',
    background: 'var(--surface-elevated)',
    borderRadius: '24px',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-panel)',
    boxSizing: 'border-box',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid var(--border-color)',
  },
  cancelBtn: {
    padding: '8px 20px',
    fontSize: '0.9rem',
    borderRadius: '8px',
  },
  saveBtn: {
    padding: '8px 20px',
    fontSize: '0.9rem',
    borderRadius: '8px',
  },
  queueItemImg: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid rgba(92, 77, 177, 0.12)',
    background: 'var(--bg-app)',
  },
  queueItemImgPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    border: '1px solid rgba(92, 77, 177, 0.12)',
    background: 'rgba(92, 77, 177, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
};

export default SellerDashboard;
