import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { Star, ShoppingCart, MessageSquare, ShieldCheck, Clock, User, Share2, Sparkles } from 'lucide-react';
import { API_URL } from '../config';

export const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [cameraMode, setCameraMode] = useState(null);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [capturedVideo, setCapturedVideo] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'success' });
  const [activeImage, setActiveImage] = useState(null);
  const [activeLightboxMedia, setActiveLightboxMedia] = useState(null);
  const [productImageLightbox, setProductImageLightbox] = useState({ isOpen: false, activeIdx: 0 });
  const [sellerCoupons, setSellerCoupons] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const updateRecentlyViewed = (prodId) => {
    try {
      const viewed = localStorage.getItem('recentlyViewed');
      let list = viewed ? viewed.split(',').map(Number).filter(Boolean) : [];
      list = list.filter(x => x !== Number(prodId));
      list.unshift(Number(prodId));
      list = list.slice(0, 8);
      localStorage.setItem('recentlyViewed', list.join(','));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const viewed = localStorage.getItem('recentlyViewed') || '';
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_URL}/products/${id}/recommendations?viewed_ids=${viewed}`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    }
  };
  
  const { addToCart } = useContext(CartContext);
  const { user, token, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  
  useEffect(() => {
    fetchProductDetails();
    fetchProductReviews();
    updateRecentlyViewed(id);
    fetchRecommendations();
  }, [id, token]);

  useEffect(() => {
    if (product) {
      setActiveImage(product.images && product.images.length > 0 ? product.images[0] : product.image_url);
      if (product.seller_id) {
        fetchSellerCoupons(product.seller_id);
      }
    }
  }, [product]);

  const fetchSellerCoupons = async (sellerId) => {
    try {
      const res = await fetch(`${API_URL}/products/public/coupons?seller_ids=${sellerId}`);
      if (res.ok) {
        const data = await res.json();
        setSellerCoupons(data);
      }
    } catch (err) {
      console.error('Error fetching seller coupons:', err);
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        if (data.sizes && Object.keys(data.sizes).length > 0) {
          setSelectedSize(Object.keys(data.sizes)[0]);
        } else {
          const catLower = data.category_name?.toLowerCase() || '';
          if (catLower.includes('shoe') || catLower.includes('sneaker') || catLower.includes('heels') || catLower.includes('flats') || catLower.includes('sandals') || catLower.includes('footwear')) {
            setSelectedSize('8');
          } else {
            setSelectedSize('M');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductReviews = async () => {
    try {
      const res = await fetch(`${API_URL}/reviews/product/${id}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      triggerAlert('Please sign in to buy products!', 'danger');
      return;
    }
    if (user.role !== 'buyer') {
      triggerAlert('Only buyers can purchase products!', 'warning');
      return;
    }
    const finalSize = window._freeSizeKey || selectedSize;
    const res = await addToCart(product.id, 1, window._showSizeSelector ? finalSize : null);
    if (res.success) {
      triggerAlert(`${product.name} added to cart!`, 'success');
    } else {
      triggerAlert(res.message || 'Failed to add item', 'danger');
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      triggerAlert('Please sign in to buy products!', 'danger');
      return;
    }
    if (user.role !== 'buyer') {
      triggerAlert('Only buyers can purchase products!', 'warning');
      return;
    }
    const finalSize = window._freeSizeKey || selectedSize;
    const res = await addToCart(product.id, 1, window._showSizeSelector ? finalSize : null);
    if (res.success) {
      navigate('/checkout');
    } else {
      triggerAlert(res.message || 'Failed to add item', 'danger');
    }
  };
  useEffect(() => {
    let interval;
    if (recording) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const startCamera = async (mode) => {
    const totalAttached = capturedPhotos.length + (capturedVideo ? 1 : 0);
    if (totalAttached >= 2) {
      triggerAlert("Limit reached: You cannot add more than 2 photos/videos total.", "warning");
      return;
    }
    try {
      setCameraMode(mode);
      const constraints = {
        video: { facingMode: 'user' },
        audio: mode === 'video'
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      setTimeout(() => {
        const videoEl = document.getElementById('camera-preview');
        if (videoEl) videoEl.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      console.error("Failed to access camera:", err);
      triggerAlert("Could not access camera/microphone. Please check permissions.", "danger");
      setCameraMode(null);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setCameraMode(null);
    setRecording(false);
    setMediaRecorder(null);
  };

  const capturePhoto = () => {
    const videoEl = document.getElementById('camera-preview');
    if (!videoEl) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhotos(prev => [...prev, dataUrl]);
    
    stopCamera();
    triggerAlert("Photo captured successfully!", "success");
  };

  const startRecording = () => {
    if (!stream) return;
    setRecordingTime(0);
    
    const chunks = [];
    let options = {};
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      options = { mimeType: 'video/mp4' };
    }
    
    const recorder = new MediaRecorder(stream, options);
    
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: chunks[0]?.type || 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedVideo(reader.result);
      };
      reader.readAsDataURL(blob);
      stopCamera();
      triggerAlert("Video recorded successfully!", "success");
    };
    
    recorder.start(100);
    setMediaRecorder(recorder);
    setRecording(true);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    let accepted = 0;
    files.forEach(file => {
      const totalAttached = capturedPhotos.length + (capturedVideo ? 1 : 0) + accepted;
      if (totalAttached >= 2) {
        triggerAlert("Limit reached: You cannot add more than 2 photos/videos total.", "warning");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (file.type.startsWith('image/')) {
          setCapturedPhotos(prev => [...prev, reader.result]);
        } else if (file.type.startsWith('video/')) {
          setCapturedVideo(reader.result);
        }
      };
      reader.readAsDataURL(file);
      accepted += 1;
    });
  };
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      triggerAlert('Please write a review comment.', 'warning');
      return;
    }

    try {
      setReviewLoading(true);
      const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: parseInt(id),
          rating,
          comment,
          images: capturedPhotos,
          video_url: capturedVideo
        })
      });

      const data = await res.json();

      if (res.ok) {
        triggerAlert(data.message || 'Review submitted successfully!', 'success');
        if (data.coins_earned > 0 && setUser) {
          setUser(prev => ({ ...prev, coins: data.new_balance }));
        }
        setComment('');
        setRating(5);
        setCapturedPhotos([]);
        setCapturedVideo('');
        fetchProductReviews();
        fetchProductDetails();
      } else {
        triggerAlert(data.message || 'Failed to submit review.', 'danger');
      }
    } catch (err) {
      triggerAlert('Connection error, try again.', 'danger');
    } finally {
      setReviewLoading(false);
    }
  };

  const triggerAlert = (msg, type = 'success') => {
    setAlert({ show: true, msg, type });
    setTimeout(() => setAlert({ show: false, msg: '', type: 'success' }), 3000);
  };

  const handleShareProduct = () => {
    navigator.clipboard.writeText(window.location.href);
    triggerAlert('Product link copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.loader}></div>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={styles.centerContainer}>
        <h3>Product not found.</h3>
        <Link to="/" className="btn-primary" style={{ marginTop: '16px' }}>Back to Shop</Link>
      </div>
    );
  }

  const hasSizes = product.sizes && Object.keys(product.sizes).length > 0;
  const totalStock = hasSizes ? Object.values(product.sizes).reduce((a, b) => a + b, 0) : (product.stock || 0);
  const isOutOfStock = totalStock <= 0;
  const isNewProduct = product.created_at && (Math.abs(new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24) <= 10);

  return (
    <div style={styles.container}>
      {alert.show && (
        <div style={{
          ...styles.alertPopup,
          backgroundColor: alert.type === 'success' ? 'var(--success)' : alert.type === 'danger' ? 'var(--danger)' : 'var(--warning)',
          boxShadow: alert.type === 'success' ? '0 0 15px rgba(0, 230, 118, 0.4)' : alert.type === 'danger' ? '0 0 15px rgba(255, 23, 68, 0.4)' : '0 0 15px rgba(255, 179, 0, 0.4)'
        }}>
          {alert.msg}
        </div>
      )}

      {/* Main Details Panel */}
      <div style={styles.mainGrid} className="responsive-grid">
        {/* Left: Product Image Carousel */}
        <div style={styles.imageContainer}>
          <div 
            style={{...styles.imagePanel, position: 'relative'}} 
            className="glass-panel"
            onClick={() => {
              const list = product.images && product.images.length > 0 ? product.images : [product.image_url];
              const idx = list.indexOf(activeImage);
              setProductImageLightbox({ isOpen: true, activeIdx: idx >= 0 ? idx : 0 });
            }}
          >
            <img
              src={activeImage || 'https://via.placeholder.com/600x400'}
              alt={product.name}
              style={{...styles.image, opacity: isOutOfStock ? 0.5 : 1}}
            />
            {isOutOfStock && (
              <div style={styles.outOfStockStrip}>
                OUT OF STOCK
              </div>
            )}
            {totalStock > 0 && totalStock <= 5 && (
              <span style={styles.lowStockBadgeMain}>Only {totalStock} left</span>
            )}
            {isNewProduct && (
              <span style={styles.newProductBadgeMain}>
                NEW PRODUCT
              </span>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div style={styles.thumbnailRow}>
              {product.images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  style={{
                    ...styles.thumbnailWrapper,
                    border: activeImage === img ? '2px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)'
                  }}
                  className="glass-panel"
                >
                  <img src={img} alt={`thumbnail-${idx}`} style={styles.thumbnail} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info Section */}
        <div style={styles.infoPanel} className="glass-panel">
          <span style={styles.category}>{product.category_name}</span>
          <h1 style={styles.title}>{product.name}</h1>

          <div style={styles.sellerBar}>
            <span style={styles.label}>Sold By:</span>
            <span style={styles.sellerName}>{product.seller_name}</span>
          </div>

          <div style={styles.ratingBar}>
            {product.rating > 0 ? (
              <>
                <div style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={18}
                      fill={s <= Math.round(product.rating) ? 'var(--warning)' : 'none'}
                      color="var(--warning)"
                    />
                  ))}
                  <span style={styles.ratingVal}>{product.rating.toFixed(1)}</span>
                </div>
                <span style={styles.reviewsLabel}>• {reviews.length} Customer Reviews</span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No ratings yet (Be the first to review!)
              </span>
            )}
          </div>

          <div style={styles.priceContainer}>
            <span style={styles.price}>₹{product.price.toLocaleString('en-IN')}</span>
            {product.discount > 0 && product.original_price && (
              <span style={styles.originalPrice}>₹{product.original_price.toLocaleString('en-IN')}</span>
            )}
            {product.discount > 0 && (
              <span style={styles.discountTag}>{product.discount}% OFF</span>
            )}
            {!(product.sizes && Object.keys(product.sizes).length > 0) && (
              <span style={product.stock > 0 ? styles.stockIn : styles.stockOut}>
                {product.stock > 0 ? `${product.stock} items left in stock` : 'Out of Stock'}
              </span>
            )}
          </div>

          {sellerCoupons.length > 0 && (
            <div style={styles.couponsContainer}>
              <h4 style={styles.couponsTitle}>✨ Available Offers</h4>
              <div style={styles.couponList}>
                {sellerCoupons.map(coupon => (
                  <div key={coupon.id} style={styles.couponCard}>
                    <div style={styles.couponCode}>{coupon.code}</div>
                    <div style={styles.couponDesc}>
                      Save {coupon.discount_percentage}% on this seller's items
                      {coupon.min_cart_value > 0 && <span> (Min spend: ₹{coupon.min_cart_value})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.variants && product.variants.length > 0 && (
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Color: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{product.color_name}</span>
              </h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* Include current product as a variant in the list */}
                {[{ id: product.id, color_name: product.color_name, image_url: product.image_url }, ...product.variants]
                  .sort((a, b) => a.id - b.id)
                  .map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => navigate(`/product/${variant.id}`)}
                    title={variant.color_name}
                    style={{
                      padding: 0,
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      border: product.id === variant.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      overflow: 'hidden'
                    }}
                  >
                    {variant.image_url ? (
                      <img 
                        src={variant.image_url} 
                        alt={variant.color_name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary)', color: 'var(--text-light)', fontSize: '0.7rem' }}>
                        {variant.color_name}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(() => {
            const categoryNameLower = product?.category_name?.toLowerCase() || '';
            const mainCategoryLower = product?.main_category_name?.toLowerCase() || '';

            const isDress = categoryNameLower === 'dresses' || mainCategoryLower === 'dresses' || categoryNameLower.includes('frock');

            const isMensShirt = mainCategoryLower === 'men' && 
              (categoryNameLower.includes('shirt') || categoryNameLower === 'tshirts');

            const isPants = (mainCategoryLower === 'men' || mainCategoryLower === 'women') && 
              (categoryNameLower.includes('jean') || 
               categoryNameLower.includes('trouser') || 
               categoryNameLower.includes('pant') || 
               categoryNameLower.includes('capri') || 
               categoryNameLower.includes('leggings') || 
               categoryNameLower.includes('salwar') ||
               categoryNameLower.includes('churidar') ||
               categoryNameLower.includes('short') ||
               categoryNameLower.includes('bottom') ||
               categoryNameLower.includes('skirt'));

            const isKurta = categoryNameLower.includes('kurta') || categoryNameLower.includes('kurti');

            const isShoes = categoryNameLower.includes('shoe') || 
              categoryNameLower.includes('sneaker') || 
              categoryNameLower.includes('heels') || 
              categoryNameLower.includes('flats') || 
              categoryNameLower.includes('sandals') || 
              categoryNameLower.includes('footwear');
              
            const isTops = categoryNameLower.includes('top') || 
              categoryNameLower.includes('tshirt') || 
              categoryNameLower.includes('t-shirt') || 
              categoryNameLower.includes('jacket');

            let showSizeSelector = false;
            let sizeOptions = [];

            showSizeSelector = isDress || isMensShirt || isPants || isKurta || isShoes || isTops;
            const defaultSizes = isShoes ? ['6', '7', '8', '9', '10', '11'] : ['XS', 'S', 'M', 'L', 'XL'];
            
            let hasFreeSize = false;
            let freeSizeKey = null;
            if (product.sizes && typeof product.sizes === 'object') {
               for (const k of Object.keys(product.sizes)) {
                  if (k.toLowerCase() === 'free size' || k.toLowerCase() === 'freesize' || k.toLowerCase() === 'free') {
                     hasFreeSize = true;
                     freeSizeKey = k;
                     break;
                  }
               }
            }

            if (hasFreeSize) {
               showSizeSelector = true;
               sizeOptions = [freeSizeKey];
            } else if (product.sizes && typeof product.sizes === 'object' && Object.keys(product.sizes).length > 0) {
               showSizeSelector = true;
               sizeOptions = Array.from(new Set([...defaultSizes, ...Object.keys(product.sizes)]));
            } else {
               sizeOptions = [...defaultSizes];
            }

            const isElectronics = mainCategoryLower.includes('electronic') || categoryNameLower.includes('electronic') || categoryNameLower.includes('smartphone');
            if (isElectronics) {
               showSizeSelector = false;
               sizeOptions = [];
            }

            // Expose showSizeSelector globally in this render scope for add to cart callbacks
            window._showSizeSelector = showSizeSelector;
            window._freeSizeKey = hasFreeSize ? freeSizeKey : null;

            return showSizeSelector && (
              <div style={{ marginTop: '20px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    Select Size: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{hasFreeSize ? freeSizeKey : selectedSize}</span>
                  </h4>
                  {!hasFreeSize && (
                    <button 
                      onClick={() => setShowSizeGuide(true)} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', padding: 0, fontWeight: '600' }}
                    >
                      Size Guide
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {sizeOptions.map((size) => {
                    let outOfStock = false;
                    const isSpecificStock = product.sizes && typeof product.sizes === 'object' && Object.keys(product.sizes).length > 0;
                    
                    if (isSpecificStock) {
                      if (product.sizes[size] === undefined || product.sizes[size] <= 0) {
                        outOfStock = true;
                      }
                    }
                    
                    const isSelected = hasFreeSize ? true : selectedSize === size;
                    
                    return (
                      <button
                        key={size}
                        onClick={() => !outOfStock && !hasFreeSize && setSelectedSize(size)}
                        disabled={outOfStock || hasFreeSize}
                        style={{
                          width: 'fit-content',
                          minWidth: '45px',
                          padding: '6px 12px',
                          minHeight: '45px',
                          borderRadius: '22px',
                          border: isSelected && !outOfStock ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSelected && !outOfStock ? 'rgba(92, 77, 177, 0.1)' : (outOfStock ? 'var(--bg-surface)' : 'transparent'),
                          color: isSelected && !outOfStock ? 'var(--primary)' : (outOfStock ? 'var(--text-muted)' : 'var(--text-primary)'),
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          cursor: hasFreeSize ? 'default' : (outOfStock ? 'not-allowed' : 'pointer'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          opacity: outOfStock ? 0.6 : 1
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                          <span style={{ textDecoration: outOfStock ? 'line-through' : 'none' }}>{size}</span>
                          {isSpecificStock && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 'normal', opacity: 0.8, marginTop: '2px', textDecoration: 'none' }}>
                              {(product.sizes[size] !== undefined && product.sizes[size] > 0) ? `${product.sizes[size]} left` : 'Out of stock'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Expose showSizeSelector helper to top-level callbacks in class component context */}
          {(() => {
            const categoryNameLower = product?.category_name?.toLowerCase() || '';
            const mainCategoryLower = product?.main_category_name?.toLowerCase() || '';
            const isDress = categoryNameLower === 'dresses' || mainCategoryLower === 'dresses';
            const isMensShirt = mainCategoryLower === 'men' && (categoryNameLower.includes('shirt') || categoryNameLower === 'tshirts');
            const isPants = (mainCategoryLower === 'men' || mainCategoryLower === 'women') && (categoryNameLower.includes('jean') || categoryNameLower.includes('trouser') || categoryNameLower.includes('pant') || categoryNameLower.includes('capri') || categoryNameLower.includes('leggings') || categoryNameLower.includes('salwar') || categoryNameLower.includes('churidar'));
            const isKurta = categoryNameLower.includes('kurta') || categoryNameLower.includes('kurti');
            const isShoes = categoryNameLower.includes('shoe') || categoryNameLower.includes('sneaker') || categoryNameLower.includes('heels') || categoryNameLower.includes('flats') || categoryNameLower.includes('sandals') || categoryNameLower.includes('footwear');
            const isTops = categoryNameLower.includes('top') || categoryNameLower.includes('tshirt') || categoryNameLower.includes('t-shirt') || categoryNameLower.includes('jacket');
            
            if (product?.sizes && Object.keys(product.sizes).length > 0) {
              window._showSizeSelector = true;
            } else {
              window._showSizeSelector = isDress || isMensShirt || isPants || isKurta || isShoes || isTops;
            }
            return null;
          })()}

          <p style={styles.description}>{product.description}</p>

          <div style={styles.actionRow}>
            {(!user || user.role === 'buyer') && (
              <>
                <button
                  onClick={handleAddToCart}
                  className="btn-secondary"
                  style={styles.addBtn}
                  disabled={product.stock <= 0}
                >
                  <ShoppingCart size={20} />
                  {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
                
                <button
                  onClick={handleBuyNow}
                  className="btn-primary"
                  style={{ ...styles.addBtn, flex: 1, backgroundColor: 'var(--primary)', color: 'white' }}
                  disabled={product.stock <= 0}
                >
                  Buy Now
                </button>
              </>
            )}
            <button
              onClick={handleShareProduct}
              className="btn-secondary"
              style={styles.shareBtn}
              title="Copy Product Link"
            >
              <Share2 size={20} />
              Share Product
            </button>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div style={styles.reviewsSection} className="glass-panel">
        <h2 style={styles.sectionTitle}>
          Customer Feedback
          <span style={{ color: 'var(--secondary)', marginLeft: '4px' }}><MessageSquare size={20} style={{ display: 'inline' }} /></span>
        </h2>

        <div style={styles.reviewsGrid}>
          {/* Write a Review */}
          <div style={styles.writeReviewPanel}>
            <h3 style={styles.writeReviewTitle}>Write a Review</h3>
            {user && user.role === 'buyer' ? (
              <form onSubmit={handleReviewSubmit} style={styles.reviewForm}>
                <div style={styles.ratingSelectGroup}>
                  <label style={styles.label}>Rating:</label>
                  <div style={styles.starSelector}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRating(val)}
                        style={styles.starSelectorBtn}
                      >
                        <Star
                          size={24}
                          fill={val <= rating ? 'var(--warning)' : 'none'}
                          color="var(--warning)"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  placeholder="Share your experience with this product... (Verified purchases will receive a checkmark badge)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="cyber-input"
                  style={styles.textarea}
                  rows={4}
                  required
                />

                {/* Live Camera Feed */}
                {cameraMode && (
                  <div style={styles.cameraPanel} className="glass-panel">
                    <video id="camera-preview" autoPlay playsInline muted style={styles.cameraVideo} />
                    <div style={styles.cameraControls}>
                      {cameraMode === 'photo' ? (
                        <button type="button" onClick={capturePhoto} className="btn-primary" style={styles.captureBtn}>
                          📸 Take Photo
                        </button>
                      ) : (
                        recording ? (
                          <button type="button" onClick={() => mediaRecorder.stop()} className="btn-danger" style={styles.captureBtn}>
                            ⏹️ Stop ({recordingTime}s)
                          </button>
                        ) : (
                          <button type="button" onClick={startRecording} className="btn-primary" style={styles.captureBtn}>
                            ⏺️ Start Recording
                          </button>
                        )
                      )}
                      <button type="button" onClick={stopCamera} className="btn-secondary" style={styles.closeCameraBtn}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Media Attachments Previews */}
                {(capturedPhotos.length > 0 || capturedVideo) && (
                  <div style={styles.mediaPreviewContainer}>
                    {capturedPhotos.map((img, idx) => (
                      <div key={idx} style={styles.previewThumbWrapper}>
                        <img src={img} alt="captured preview" style={styles.previewThumb} />
                        <button type="button" onClick={() => setCapturedPhotos(prev => prev.filter((_, i) => i !== idx))} style={styles.deleteMediaBtn}>×</button>
                      </div>
                    ))}
                    {capturedVideo && (
                      <div style={styles.previewThumbWrapper}>
                        <video src={capturedVideo} style={styles.previewThumb} muted />
                        <button type="button" onClick={() => setCapturedVideo('')} style={styles.deleteMediaBtn}>×</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Capture Trigger Buttons */}
                {!cameraMode && (
                  <div style={styles.mediaButtonsRow}>
                    {(capturedPhotos.length + (capturedVideo ? 1 : 0)) < 2 && (
                      <button type="button" onClick={() => startCamera('photo')} className="btn-secondary" style={styles.mediaBtn}>
                        📸 Capture Photo ({capturedPhotos.length}/2)
                      </button>
                    )}
                    {!capturedVideo && (capturedPhotos.length + (capturedVideo ? 1 : 0)) < 2 && (
                      <button type="button" onClick={() => startCamera('video')} className="btn-secondary" style={styles.mediaBtn}>
                        🎥 Record Video
                      </button>
                    )}
                    {(capturedPhotos.length + (capturedVideo ? 1 : 0)) < 2 && (
                      <label className="btn-secondary" style={{ ...styles.mediaBtn, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        📁 Upload File
                        <input type="file" accept="image/*,video/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', marginTop: '10px' }}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div style={styles.loginToReview}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Only logged-in buyers can submit reviews.
                </p>
                <Link to="/auth" className="btn-secondary" style={{ marginTop: '12px', fontSize: '0.85rem' }}>
                  Sign In / Register
                </Link>
              </div>
            )}
          </div>

          {/* List of Reviews */}
          <div style={styles.reviewsListPanel}>
            <h3 style={styles.reviewsListTitle}>Recent Reviews ({reviews.length})</h3>
            {reviews.length > 0 ? (
              <div style={styles.reviewsList}>
                {reviews.map((rev) => (
                  <div key={rev.id} style={styles.reviewCard} className="glass-panel">
                    <div style={styles.reviewHeader}>
                      <div style={styles.reviewerInfo}>
                        <div style={styles.avatar}>
                          <User size={16} />
                        </div>
                        <div>
                          <span style={styles.reviewerName}>{rev.author_email.split('@')[0]}</span>
                          <div style={styles.reviewDate}>
                            <Clock size={12} style={{ marginRight: '4px' }} />
                            {new Date(rev.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div style={styles.reviewRating}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            fill={s <= rev.rating ? 'var(--warning)' : 'none'}
                            color="var(--warning)"
                          />
                        ))}
                      </div>
                    </div>
                    
                    {rev.is_verified_purchase && (
                      <div style={styles.verifiedBadge}>
                        <ShieldCheck size={14} style={{ marginRight: '4px' }} />
                        Verified Purchase
                      </div>
                    )}

                    <p style={styles.reviewComment}>{rev.comment}</p>
                    
                    {rev.images && rev.images.length > 0 && (
                      <div style={styles.reviewImagesContainer}>
                        {rev.images.map((imgUrl, imgIdx) => (
                          <img 
                            key={imgIdx} 
                            src={imgUrl} 
                            alt="User review upload" 
                            style={{ ...styles.reviewImage, cursor: 'zoom-in' }} 
                            onClick={() => setActiveLightboxMedia({ type: 'image', url: imgUrl })} 
                          />
                        ))}
                      </div>
                    )}

                    {rev.video_url && (
                      <div style={{ ...styles.reviewVideoContainer, position: 'relative' }}>
                        <video 
                          src={rev.video_url} 
                          controls 
                          style={styles.reviewVideo} 
                        />
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          style={styles.zoomVideoBtn}
                          onClick={() => setActiveLightboxMedia({ type: 'video', url: rev.video_url })}
                        >
                          🔍 Zoom Video
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.noReviews}>
                <p style={{ color: 'var(--text-muted)' }}>No reviews yet for this product. Be the first to share your thoughts!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended/Suggested Products Section */}
      {recommendations.length > 0 && (
        <div style={styles.recommendationsSection} className="glass-panel">
          <h2 style={styles.sectionTitle}>
            Suggested for You
            <span style={{ color: 'var(--secondary)', marginLeft: '6px' }}>✨</span>
          </h2>
          <div style={styles.recommendationsGrid}>
            {recommendations.map((prod) => {
              const ratings = prod.reviews ? prod.reviews.map(r => r.rating) : [];
              const avgRating = ratings.length > 0 ? (ratings.reduce((sum, val) => sum + val, 0) / ratings.length) : 0;

              const hasSizes = prod.sizes && Object.keys(prod.sizes).length > 0;
              const totalStock = hasSizes ? Object.values(prod.sizes).reduce((a, b) => a + b, 0) : prod.stock;
              const isOutOfStock = totalStock <= 0;

              return (
                <div 
                  key={prod.id} 
                  style={styles.recCard} 
                  className="cyber-card"
                  onClick={() => navigate(`/product/${prod.id}`)}
                >
                  <div style={styles.recImageWrapper}>
                    <img 
                      src={prod.images && prod.images.length > 0 ? prod.images[0] : prod.image_url} 
                      alt={prod.name} 
                      style={{...styles.recImage, opacity: isOutOfStock ? 0.5 : 1}} 
                    />
                    {isOutOfStock && (
                      <div style={styles.outOfStockStrip}>
                        OUT OF STOCK
                      </div>
                    )}
                    {totalStock > 0 && totalStock <= 5 && (
                      <span style={styles.recLowStockBadge}>
                        Only {totalStock} left
                      </span>
                    )}
                    {prod.discount > 0 && !isOutOfStock && (
                      <span style={styles.recDiscountBadge}>
                        -{prod.discount}%
                      </span>
                    )}
                    {prod.created_at && (Math.abs(new Date() - new Date(prod.created_at)) / (1000 * 60 * 60 * 24) <= 10) && (
                      <span style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        background: '#ffe5ec',
                        color: '#000',
                        padding: '3px 8px',
                        borderTopLeftRadius: '6px',
                        borderLeft: '1px solid var(--border-color)',
                        borderTop: '1px solid var(--border-color)',
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        zIndex: 2,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        new product
                      </span>
                    )}
                  </div>
                  <div style={styles.recInfo}>
                    <h4 style={styles.recProductTitle} className="product-title-link">
                      {prod.name}
                    </h4>
                    
                    <div style={styles.recRatingRow}>
                      {avgRating > 0 ? (
                        <>
                          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={12}
                                fill={s <= Math.round(avgRating) ? 'var(--warning)' : 'none'}
                                color="var(--warning)"
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({ratings.length})
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No reviews
                        </span>
                      )}
                    </div>

                    <div style={styles.recPriceRow}>
                      <span style={styles.recPrice}>₹{prod.price.toLocaleString('en-IN')}</span>
                      {prod.discount > 0 && prod.original_price && (
                        <span style={styles.recOriginalPrice}>₹{prod.original_price.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Zooming Photos & Videos */}
      {activeLightboxMedia && (
        <div style={styles.lightboxOverlay} onClick={() => setActiveLightboxMedia(null)}>
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.lightboxCloseBtn} onClick={() => setActiveLightboxMedia(null)}>×</button>
            {activeLightboxMedia.type === 'image' ? (
              <img src={activeLightboxMedia.url} alt="Zoomed review attachment" style={styles.lightboxImage} />
            ) : (
              <video src={activeLightboxMedia.url} controls autoPlay style={styles.lightboxVideo} />
            )}
          </div>
        </div>
      )}

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div style={styles.lightboxOverlay} onClick={() => setShowSizeGuide(false)}>
          <div style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                {(() => {
                  const categoryNameLower = (product?.category_name || '').toLowerCase();
                  const mainCategoryNameLower = (product?.main_category_name || '').toLowerCase();
                  const combinedCategoryStr = `${categoryNameLower} ${mainCategoryNameLower}`;
                  const isShoes = combinedCategoryStr.includes('shoe') || combinedCategoryStr.includes('sneaker') || combinedCategoryStr.includes('heels') || combinedCategoryStr.includes('flats') || combinedCategoryStr.includes('sandals') || combinedCategoryStr.includes('footwear');
                  const isKids = combinedCategoryStr.includes('kid') || combinedCategoryStr.includes('child') || combinedCategoryStr.includes('boy') || combinedCategoryStr.includes('girl') || combinedCategoryStr.includes('toddler');
                  
                  if (isShoes) return isKids ? 'Kids Shoe Size Guide' : 'Adult Shoe Size Guide';
                  return isKids ? 'Kids Clothing Size Guide' : 'Clothing Size Guide';
                })()}
              </h3>
              <button onClick={() => setShowSizeGuide(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              {(() => {
                const categoryNameLower = (product?.category_name || '').toLowerCase();
                const mainCategoryNameLower = (product?.main_category_name || '').toLowerCase();
                const combinedCategoryStr = `${categoryNameLower} ${mainCategoryNameLower}`;
                const isShoes = combinedCategoryStr.includes('shoe') || combinedCategoryStr.includes('sneaker') || combinedCategoryStr.includes('heels') || combinedCategoryStr.includes('flats') || combinedCategoryStr.includes('sandals') || combinedCategoryStr.includes('footwear');
                const isKids = combinedCategoryStr.includes('kid') || combinedCategoryStr.includes('child') || combinedCategoryStr.includes('boy') || combinedCategoryStr.includes('girl') || combinedCategoryStr.includes('toddler');
                
                if (isShoes && isKids) {
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>UK / India (Kids)</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>US</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>EU</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>Age Group</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>10</td>
                          <td style={{ padding: '10px 5px' }}>11</td>
                          <td style={{ padding: '10px 5px' }}>28</td>
                          <td style={{ padding: '10px 5px' }}>4-5 Years</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>11</td>
                          <td style={{ padding: '10px 5px' }}>12</td>
                          <td style={{ padding: '10px 5px' }}>29</td>
                          <td style={{ padding: '10px 5px' }}>5-6 Years</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>12</td>
                          <td style={{ padding: '10px 5px' }}>13</td>
                          <td style={{ padding: '10px 5px' }}>31</td>
                          <td style={{ padding: '10px 5px' }}>6-7 Years</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>13</td>
                          <td style={{ padding: '10px 5px' }}>1</td>
                          <td style={{ padding: '10px 5px' }}>32</td>
                          <td style={{ padding: '10px 5px' }}>7-8 Years</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>1</td>
                          <td style={{ padding: '10px 5px' }}>2</td>
                          <td style={{ padding: '10px 5px' }}>33</td>
                          <td style={{ padding: '10px 5px' }}>8-9 Years</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>2</td>
                          <td style={{ padding: '10px 5px' }}>3</td>
                          <td style={{ padding: '10px 5px' }}>34</td>
                          <td style={{ padding: '10px 5px' }}>9-10 Years</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px 5px' }}>3</td>
                          <td style={{ padding: '10px 5px' }}>4</td>
                          <td style={{ padding: '10px 5px' }}>35</td>
                          <td style={{ padding: '10px 5px' }}>10-11 Years</td>
                        </tr>
                      </tbody>
                    </table>
                  );
                } else if (isShoes && !isKids) {
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>UK / India</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>US</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>EU</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>Foot Length (cm)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>6</td>
                          <td style={{ padding: '10px 5px' }}>7</td>
                          <td style={{ padding: '10px 5px' }}>40</td>
                          <td style={{ padding: '10px 5px' }}>24.6</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>7</td>
                          <td style={{ padding: '10px 5px' }}>8</td>
                          <td style={{ padding: '10px 5px' }}>41</td>
                          <td style={{ padding: '10px 5px' }}>25.4</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>8</td>
                          <td style={{ padding: '10px 5px' }}>9</td>
                          <td style={{ padding: '10px 5px' }}>42</td>
                          <td style={{ padding: '10px 5px' }}>26.2</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>9</td>
                          <td style={{ padding: '10px 5px' }}>10</td>
                          <td style={{ padding: '10px 5px' }}>43</td>
                          <td style={{ padding: '10px 5px' }}>27.1</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px' }}>10</td>
                          <td style={{ padding: '10px 5px' }}>11</td>
                          <td style={{ padding: '10px 5px' }}>44</td>
                          <td style={{ padding: '10px 5px' }}>27.9</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px 5px' }}>11</td>
                          <td style={{ padding: '10px 5px' }}>12</td>
                          <td style={{ padding: '10px 5px' }}>45</td>
                          <td style={{ padding: '10px 5px' }}>28.8</td>
                        </tr>
                      </tbody>
                    </table>
                  );
                } else if (!isShoes && isKids) {
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>Size</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>Age Group</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>Height (cm)</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>Chest (in)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>XS</td>
                          <td style={{ padding: '10px 5px' }}>3-4 Years</td>
                          <td style={{ padding: '10px 5px' }}>98-104</td>
                          <td style={{ padding: '10px 5px' }}>22-23</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>S</td>
                          <td style={{ padding: '10px 5px' }}>5-6 Years</td>
                          <td style={{ padding: '10px 5px' }}>110-116</td>
                          <td style={{ padding: '10px 5px' }}>24-25</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>M</td>
                          <td style={{ padding: '10px 5px' }}>7-8 Years</td>
                          <td style={{ padding: '10px 5px' }}>122-128</td>
                          <td style={{ padding: '10px 5px' }}>26-27</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>L</td>
                          <td style={{ padding: '10px 5px' }}>9-10 Years</td>
                          <td style={{ padding: '10px 5px' }}>134-140</td>
                          <td style={{ padding: '10px 5px' }}>28-29</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>XL</td>
                          <td style={{ padding: '10px 5px' }}>11-12 Years</td>
                          <td style={{ padding: '10px 5px' }}>146-152</td>
                          <td style={{ padding: '10px 5px' }}>30-31</td>
                        </tr>
                      </tbody>
                    </table>
                  );
                } else {
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>Size</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>Chest (in)</th>
                          <th style={{ padding: '10px 5px', color: 'var(--text-primary)' }}>Waist (in)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>XS</td>
                          <td style={{ padding: '10px 5px' }}>34 - 36</td>
                          <td style={{ padding: '10px 5px' }}>28 - 30</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>S</td>
                          <td style={{ padding: '10px 5px' }}>36 - 38</td>
                          <td style={{ padding: '10px 5px' }}>30 - 32</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>M</td>
                          <td style={{ padding: '10px 5px' }}>38 - 40</td>
                          <td style={{ padding: '10px 5px' }}>32 - 34</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>L</td>
                          <td style={{ padding: '10px 5px' }}>40 - 42</td>
                          <td style={{ padding: '10px 5px' }}>34 - 36</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px 5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>XL</td>
                          <td style={{ padding: '10px 5px' }}>42 - 44</td>
                          <td style={{ padding: '10px 5px' }}>36 - 38</td>
                        </tr>
                      </tbody>
                    </table>
                  );
                }
              })()}
              <p style={{ marginTop: '20px', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                * Measure accurately to ensure the best fit. Fits may vary slightly by brand.
              </p>
            </div>
            
            <button 
              onClick={() => setShowSizeGuide(false)} 
              style={{ ...styles.submitBtn, width: '100%', marginTop: '25px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
      {/* Product Image Gallery Lightbox */}
      {productImageLightbox.isOpen && (() => {
        const imagesList = product.images && product.images.length > 0 ? product.images : [product.image_url || 'https://via.placeholder.com/600x400'];
        const activeIdx = productImageLightbox.activeIdx;

        const handlePrev = (e) => {
          e.stopPropagation();
          setProductImageLightbox(prev => ({
            ...prev,
            activeIdx: (prev.activeIdx - 1 + imagesList.length) % imagesList.length
          }));
        };

        const handleNext = (e) => {
          e.stopPropagation();
          setProductImageLightbox(prev => ({
            ...prev,
            activeIdx: (prev.activeIdx + 1) % imagesList.length
          }));
        };

        return (
          <div 
            style={styles.lightboxOverlay} 
            onClick={() => setProductImageLightbox({ isOpen: false, activeIdx: 0 })}
          >
            <div style={styles.lightboxCloseButton} onClick={() => setProductImageLightbox({ isOpen: false, activeIdx: 0 })}>
              &times;
            </div>

            <div style={styles.lightboxSliderContent} onClick={(e) => e.stopPropagation()}>
              {imagesList.length > 1 && (
                <button style={styles.sliderArrowLeft} onClick={handlePrev}>
                  &#10094;
                </button>
              )}

              <div style={styles.sliderImageWrapper}>
                <img 
                  src={imagesList[activeIdx]} 
                  alt={`Zoomed product ${activeIdx}`} 
                  style={styles.sliderImage} 
                />
                {imagesList.length > 1 && (
                  <div style={styles.sliderCounter}>
                    {activeIdx + 1} / {imagesList.length}
                  </div>
                )}
              </div>

              {imagesList.length > 1 && (
                <button style={styles.sliderArrowRight} onClick={handleNext}>
                  &#10095;
                </button>
              )}
            </div>

            {imagesList.length > 1 && (
              <div style={styles.lightboxThumbnails} onClick={(e) => e.stopPropagation()}>
                {imagesList.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Thumb ${index}`}
                    style={{
                      ...styles.lightboxThumb,
                      border: index === activeIdx ? '2px solid var(--secondary)' : '2px solid transparent',
                      opacity: index === activeIdx ? 1 : 0.6
                    }}
                    onClick={() => setProductImageLightbox(prev => ({ ...prev, activeIdx: index }))}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}
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
  alertPopup: {
    position: 'fixed',
    top: '30px',
    right: '30px',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 'bold',
    zIndex: 9999,
    fontSize: '0.95rem',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '40px',
    marginBottom: '40px',
  },
  imagePanel: {
    width: '100%',
    height: '450px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    overflow: 'hidden',
    cursor: 'zoom-in',
    transition: 'all 0.3s ease',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    borderRadius: '10px',
  },
  infoPanel: {
    padding: '40px 30px',
    background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%)',
  },
  category: {
    color: 'var(--secondary)',
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: '0.8rem',
    letterSpacing: '1px',
    display: 'block',
    marginBottom: '10px',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: '800',
    marginBottom: '16px',
    lineHeight: '1.2',
  },
  sellerBar: {
    display: 'flex',
    gap: '6px',
    fontSize: '0.9rem',
    marginBottom: '16px',
  },
  label: {
    color: 'var(--text-muted)',
  },
  sellerName: {
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
  ratingBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  stars: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  ratingVal: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--warning)',
    marginLeft: '6px',
  },
  reviewsLabel: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px 0',
    borderTop: '1px solid var(--border-color)',
    borderBottom: '1px solid var(--border-color)',
  },
  price: {
    fontSize: '2.2rem',
    fontWeight: '900',
    color: 'var(--text-primary)',
  },
  originalPrice: {
    fontSize: '1.2rem',
    color: 'var(--text-muted)',
    textDecoration: 'line-through',
  },
  discountTag: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    color: 'var(--danger)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontWeight: '600',
    border: '1px solid rgba(255, 71, 87, 0.2)'
  },
  stockIn: {
    color: 'var(--success)',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  stockOut: {
    color: 'var(--danger)',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  description: {
    color: 'var(--text-secondary)',
    lineHeight: '1.7',
    fontSize: '1rem',
    marginBottom: '30px',
  },
  couponsContainer: {
    marginBottom: '24px',
    padding: '16px',
    background: 'var(--primary-glow)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
  },
  couponsTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--primary)',
    marginBottom: '12px',
  },
  couponList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  couponCard: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-surface-elevated)',
    border: '1px dashed var(--border-color)',
    padding: '10px 16px',
    borderRadius: '8px',
    gap: '12px',
  },
  couponCode: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: 'var(--primary)',
    background: 'var(--primary-glow)',
    border: '1px dashed var(--primary)',
    padding: '4px 10px',
    borderRadius: '4px',
    letterSpacing: '1px',
  },
  couponDesc: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  addBtn: {
    flex: 2,
    justifyContent: 'center',
    padding: '16px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '1.05rem',
  },
  reviewsSection: {
    padding: '40px 30px',
    background: 'var(--bg-surface)',
  },
  sectionTitle: {
    fontSize: '1.6rem',
    fontWeight: '800',
    marginBottom: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  reviewsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '40px',
  },
  writeReviewPanel: {
    display: 'flex',
    flexDirection: 'column',
  },
  writeReviewTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    marginBottom: '16px',
  },
  reviewForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  ratingSelectGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  starSelector: {
    display: 'flex',
    gap: '4px',
  },
  starSelectorBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  textarea: {
    width: '100%',
    borderRadius: '10px',
    padding: '12px 16px',
    resize: 'vertical',
  },
  loginToReview: {
    background: 'rgba(9, 7, 15, 0.4)',
    border: '1px solid var(--border-color)',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  reviewsListPanel: {
    display: 'flex',
    flexDirection: 'column',
  },
  reviewsListTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    marginBottom: '16px',
  },
  reviewsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: '500px',
    overflowY: 'auto',
    paddingRight: '8px',
  },
  reviewCard: {
    padding: '16px',
    background: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  reviewerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(138, 43, 226, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--secondary)',
  },
  reviewerName: {
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    marginTop: '2px',
  },
  reviewRating: {
    display: 'flex',
    gap: '2px',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(0, 230, 118, 0.08)',
    border: '1px solid rgba(0, 230, 118, 0.2)',
    color: 'var(--success)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  reviewComment: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
  reviewImagesContainer: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  reviewImage: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  reviewVideoContainer: {
    marginTop: '12px',
    maxWidth: '320px',
  },
  reviewVideo: {
    width: '100%',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  noReviews: {
    padding: '30px',
    textAlign: 'center',
    background: 'rgba(9, 7, 15, 0.2)',
    borderRadius: '12px',
    border: '1px dashed rgba(138, 43, 226, 0.15)',
  },
  loader: {
    border: '3px solid rgba(138, 43, 226, 0.1)',
    borderTop: '3px solid var(--secondary)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    animation: 'spin 1s linear infinite',
  },
  imageContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  thumbnailRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  thumbnailWrapper: {
    width: '64px',
    height: '64px',
    padding: '4px',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    background: 'var(--bg-surface-elevated)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '4px',
  },
  actionRow: {
    display: 'flex',
    gap: '16px',
    marginTop: '10px',
  },
  shareBtn: {
    flex: 1,
    justifyContent: 'center',
    padding: '16px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '1.05rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  cameraPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(9, 7, 15, 0.6)',
    border: '1px solid rgba(138, 43, 226, 0.3)',
    alignItems: 'center',
  },
  cameraVideo: {
    width: '100%',
    maxWidth: '400px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    transform: 'scaleX(-1)',
  },
  cameraControls: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    justifyContent: 'center',
  },
  captureBtn: {
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontWeight: '700',
  },
  closeCameraBtn: {
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontWeight: '700',
  },
  mediaPreviewContainer: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '10px',
    marginBottom: '10px',
  },
  previewThumbWrapper: {
    position: 'relative',
    width: '70px',
    height: '70px',
  },
  previewThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  deleteMediaBtn: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    background: 'var(--danger)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '11px',
    fontWeight: '900',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  mediaButtonsRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '10px',
    marginBottom: '10px',
  },
  mediaBtn: {
    padding: '8px 12px',
    fontSize: '0.85rem',
    fontWeight: '600',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  zoomVideoBtn: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    padding: '4px 8px',
    fontSize: '0.75rem',
    fontWeight: '700',
    backgroundColor: 'rgba(92, 77, 177, 0.7)',
    color: 'var(--text-light)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    zIndex: 2,
  },
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(31, 26, 38, 0.9)',
    backdropFilter: 'blur(8px)',
    zIndex: 10000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'zoom-out',
  },
  lightboxContent: {
    position: 'relative',
    maxWidth: '90%',
    maxHeight: '90%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'default',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: '-40px',
    right: '-10px',
    background: 'none',
    border: 'none',
    color: 'var(--text-light)',
    fontSize: '36px',
    fontWeight: '300',
    cursor: 'pointer',
  },
  lightboxImage: {
    maxWidth: '100vw',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '8px',
    boxShadow: '0 0 30px rgba(0,0,0,0.6)',
  },
  lightboxVideo: {
    maxWidth: '100vw',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '8px',
    boxShadow: '0 0 30px rgba(0,0,0,0.6)',
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: '30px',
    right: '40px',
    color: 'var(--text-light)',
    fontSize: '50px',
    fontWeight: '200',
    cursor: 'pointer',
    zIndex: 10100,
    transition: 'color 0.2s',
  },
  lightboxSliderContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '30px',
    width: '90%',
    maxWidth: '900px',
    position: 'relative',
  },
  sliderArrowLeft: {
    background: 'rgba(248, 246, 252, 0.08)',
    border: '1px solid rgba(248, 246, 252, 0.15)',
    color: 'var(--text-light)',
    fontSize: '28px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  sliderArrowRight: {
    background: 'rgba(248, 246, 252, 0.08)',
    border: '1px solid rgba(248, 246, 252, 0.15)',
    color: 'var(--text-light)',
    fontSize: '28px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  sliderImageWrapper: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    boxShadow: '0 0 40px rgba(0,0,0,0.8)',
    backgroundColor: 'var(--bg-app)',
    borderRadius: '12px',
    padding: '20px',
  },
  sliderImage: {
    maxWidth: '90vw',
    maxHeight: '80vh',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  sliderCounter: {
    position: 'absolute',
    bottom: '-35px',
    color: 'var(--text-light)',
    fontSize: '0.95rem',
    fontWeight: '600',
    backgroundColor: 'rgba(92, 77, 177, 0.7)',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  lightboxThumbnails: {
    position: 'absolute',
    bottom: '40px',
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    width: '100%',
  },
  lightboxThumb: {
    width: '60px',
    height: '60px',
    borderRadius: '8px',
    objectFit: 'cover',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  recommendationsSection: {
    padding: '40px 30px',
    background: 'var(--bg-surface)',
    marginTop: '40px',
  },
  recommendationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '24px',
    marginTop: '20px',
  },
  recCard: {
    background: 'var(--bg-surface-elevated)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
  },
  recImageWrapper: {
    position: 'relative',
    width: '100%',
    height: '180px',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-app)',
  },
  recImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  outOfStockStrip: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    transform: 'translateY(-50%)',
    background: 'rgba(0, 0, 0, 0.75)',
    color: '#fff',
    textAlign: 'center',
    padding: '8px 0',
    fontWeight: 800,
    letterSpacing: '2px',
    fontSize: '0.85rem',
    zIndex: 3,
    backdropFilter: 'blur(4px)',
  },
  recLowStockBadge: {
    position: 'absolute',
    bottom: '8px',
    left: '8px',
    background: 'var(--warning)',
    color: '#000',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 700,
    zIndex: 2,
  },
  lowStockBadgeMain: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    background: 'var(--warning)',
    color: '#000',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: 700,
    zIndex: 2,
  },
  newProductBadgeMain: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    background: '#ffe5ec',
    color: '#000',
    padding: '6px 16px',
    borderTopLeftRadius: '12px',
    borderLeft: '1px solid var(--border-color)',
    borderTop: '1px solid var(--border-color)',
    fontSize: '0.8rem',
    fontWeight: 800,
    zIndex: 2,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  recDiscountBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    backgroundColor: 'var(--danger)',
    color: 'var(--text-light)',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  recInfo: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  recProductTitle: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  recRatingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  recPriceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginTop: '4px',
  },
  recPrice: {
    fontSize: '1rem',
    fontWeight: '800',
    color: 'var(--secondary)',
  },
  recOriginalPrice: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textDecoration: 'line-through',
  }
};
