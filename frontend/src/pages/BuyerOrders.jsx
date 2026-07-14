import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Clock, ShieldAlert, ChevronRight, ChevronDown, ChevronUp, CornerUpLeft, CreditCard, Loader2 } from 'lucide-react';
import { API_URL } from '../config';

export const BuyerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useContext(AuthContext);

  // Review State
  const [reviewModal, setReviewModal] = useState({ isOpen: false, productId: null, productName: '' });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Camera & Media States for Reviews
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [capturedVideo, setCapturedVideo] = useState('');
  const [cameraMode, setCameraMode] = useState(null);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

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
  
  const [expandedOrders, setExpandedOrders] = useState({});
  const [paymentLoading, setPaymentLoading] = useState({});

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
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

  const handlePayOnline = async (order) => {
    setPaymentLoading(prev => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`${API_URL}/orders/${order.id}/pay-online`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to initialize payment.');
        setPaymentLoading(prev => ({ ...prev, [order.id]: false }));
        return;
      }

      if (data.requires_payment) {
        if (!data.sandbox_mode) {
          const scriptLoaded = await loadRazorpayScript();
          if (!scriptLoaded) {
            alert('Failed to load Razorpay SDK. Please check your internet connection.');
            setPaymentLoading(prev => ({ ...prev, [order.id]: false }));
            return;
          }

          const options = {
            key: data.razorpay_key_id,
            amount: data.amount,
            currency: data.currency,
            name: "AI Marketplace",
            description: `Order #${order.buyer_order_sequence || order.id} Payout`,
            order_id: data.razorpay_order_id,
            prefill: {
              email: user?.email || '',
              contact: user?.phone || ''
            },
            theme: {
              color: "#6366f1"
            },
            handler: async function (response) {
              try {
                const verifyRes = await fetch(`${API_URL}/orders/verify-payment`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    order_id: order.id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                  })
                });

                const verifyData = await verifyRes.json();
                setPaymentLoading(prev => ({ ...prev, [order.id]: false }));

                if (verifyRes.ok) {
                  alert('Payment completed successfully!');
                  fetchOrders();
                } else {
                  alert(verifyData.message || 'Payment verification failed.');
                }
              } catch (vErr) {
                console.error(vErr);
                setPaymentLoading(prev => ({ ...prev, [order.id]: false }));
                alert('Connection error during payment verification.');
              }
            },
            modal: {
              ondismiss: function () {
                setPaymentLoading(prev => ({ ...prev, [order.id]: false }));
                alert('Payment window closed.');
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          // Sandbox Mode
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
                  order_id: order.id,
                  is_sandbox: true
                })
              });

              const verifyData = await verifyRes.json();
              setPaymentLoading(prev => ({ ...prev, [order.id]: false }));

              if (verifyRes.ok) {
                alert('Sandbox payment completed successfully!');
                fetchOrders();
              } else {
                alert(verifyData.message || 'Payment simulation failed.');
              }
            } catch (vErr) {
              console.error(vErr);
              setPaymentLoading(prev => ({ ...prev, [order.id]: false }));
              alert('Connection error during payment simulation.');
            }
          }, 1500);
        }
      }
    } catch (err) {
      console.error(err);
      setPaymentLoading(prev => ({ ...prev, [order.id]: false }));
      alert('Failed to process payment request.');
    }
  };
  
  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnRequest = async (orderId) => {
    if (!window.confirm('Are you sure you want to request a return for this order?')) return;
    
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Return_Requested' })
      });
      
      if (res.ok) {
        fetchOrders();
      } else {
        alert('Failed to request return.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openReviewModal = (productId, productName) => {
    setReviewModal({ isOpen: true, productId, productName });
    setReviewRating(5);
    setReviewComment('');
    setCapturedPhotos([]);
    setCapturedVideo('');
    setCameraMode(null);
  };

  const closeReviewModal = () => {
    stopCamera();
    setReviewModal({ isOpen: false, productId: null, productName: '' });
  };

  const startCamera = async (mode) => {
    const totalAttached = capturedPhotos.length + (capturedVideo ? 1 : 0);
    if (totalAttached >= 2) {
      alert("Limit reached: You cannot add more than 2 photos/videos total.");
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
      alert("Could not access camera/microphone. Please check permissions.");
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
    alert("Photo captured successfully!");
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
      alert("Video recorded successfully!");
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
        alert("Limit reached: You cannot add more than 2 photos/videos total.");
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
    if (!reviewComment.trim()) {
      alert('Please write a review comment.');
      return;
    }
    setReviewLoading(true);
    try {
      const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: parseInt(reviewModal.productId),
          rating: reviewRating,
          comment: reviewComment,
          images: capturedPhotos,
          video_url: capturedVideo
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Review submitted successfully!');
        setReviewModal({ isOpen: false, productId: null, productName: '' });
        setCapturedPhotos([]);
        setCapturedVideo('');
      } else {
        alert(data.message || 'Failed to submit review');
      }
    } catch (err) {
      alert('Connection failed');
    } finally {
      setReviewLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Placed': return 'badge-info';
      case 'Confirmed': return 'badge-warning';
      case 'Shipped': return 'badge-warning';
      case 'Delivered': return 'badge-success';
      case 'Return_Requested': return 'badge-danger';
      case 'Returned': return 'badge-danger';
      case 'Refunded': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  const renderProgressBar = (status) => {
    const steps = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];
    const currentIdx = steps.indexOf(status);
    
    // For returned/refunded, show a different bar or skip
    if (currentIdx === -1) {
      return (
        <div style={styles.returnedStatus}>
          Status lifecycle cancelled: <b>{status.replace('_', ' ')}</b>
        </div>
      );
    }

    return (
      <div style={styles.progressContainer}>
        {steps.map((step, idx) => (
          <div key={idx} style={styles.stepWrapper}>
            <div style={{
              ...styles.stepDot,
              backgroundColor: idx <= currentIdx ? 'var(--secondary)' : 'var(--bg-app)',
              color: idx <= currentIdx ? 'var(--text-light)' : 'var(--text-muted)',
              border: idx <= currentIdx ? 'none' : '1px solid var(--border-color)',
              boxShadow: idx <= currentIdx ? '0 0 10px var(--secondary-glow)' : 'none'
            }}>
              {idx + 1}
            </div>
            <span style={{
              ...styles.stepLabel,
              color: idx <= currentIdx ? 'var(--primary)' : 'var(--text-muted)'
            }}>
              {step}
            </span>
            {idx < steps.length - 1 && (
              <div style={{
                ...styles.stepLine,
                backgroundColor: idx < currentIdx ? 'var(--secondary)' : 'var(--border-color)'
              }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.loader}></div>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading order history...</p>
      </div>
    );
  }

  const totalPurchased = orders.reduce((sum, ord) => sum + ord.items.reduce((s, item) => s + item.quantity, 0), 0);

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Your Order History</h1>

      {orders.length > 0 ? (
        <div style={styles.ordersList}>
          <div style={styles.summaryBar} className="glass-panel">
            <span>🛒 <b>Lifetime Products Purchased:</b> {totalPurchased} item(s)</span>
            <span>📦 <b>Total Orders Checked Out:</b> {orders.length}</span>
          </div>

          {orders.map((order) => {
            const isExpanded = !!expandedOrders[order.id];
            const isCODPending = order.payment_method === 'COD' && order.payment_status === 'Pending' && !['Delivered', 'Returned', 'Refunded'].includes(order.status);
            
            return (
              <div 
                key={order.id} 
                style={{ ...styles.orderCard, cursor: 'pointer' }} 
                className="glass-panel"
                onClick={() => toggleOrderExpansion(order.id)}
              >
                {/* Card Header */}
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.orderId}>Order #{order.buyer_order_sequence || order.id}</h3>
                    <div style={styles.orderDate}>
                      <Clock size={14} style={{ marginRight: '5px' }} />
                      {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={styles.badgeRow}>
                      {order.is_flagged && (
                        <span style={styles.flaggedBadge} className="badge badge-warning">
                          <ShieldAlert size={14} style={{ marginRight: '4px' }} />
                          Security Audit Pending
                        </span>
                      )}
                      <span className={`badge ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={20} style={{ color: 'var(--secondary)' }} /> : <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>

                {/* Collapsed Summary */}
                {!isExpanded && (
                  <div style={styles.collapsedSummary}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        🛒 <b>{order.items.reduce((s, i) => s + i.quantity, 0)} product(s) ordered</b>: {order.items.map(i => i.product_name).join(', ')}
                      </span>
                      <span style={{ fontWeight: '800', color: 'var(--success)', fontSize: '1.1rem' }}>
                        ₹{order.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
                      Click order to view details & tracking
                    </div>
                  </div>
                )}

                {/* Expanded Content */}
                {isExpanded && (
                  <>
                    {/* Lifecycle Progress Bar */}
                    <div style={styles.progressSection}>
                      {renderProgressBar(order.status)}
                    </div>

                    {/* Order Items */}
                    <div style={styles.itemsSection}>
                      <h4 style={styles.sectionTitle}>Items Ordered</h4>
                      <div style={styles.itemsList}>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{...styles.itemRow, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <Link
                              to={`/product/${item.product_id}`}
                              style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', flex: 1 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.product_name}
                                  style={styles.itemImg}
                                />
                              ) : (
                                <div style={styles.itemImgPlaceholder}>📦</div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="product-title-link">{item.product_name}</span>
                                {(item.selected_color || item.selected_size) && (
                                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {item.selected_color && <span>Color: {item.selected_color}</span>}
                                    {item.selected_size && <span>Size: {item.selected_size}</span>}
                                  </div>
                                )}
                              </div>
                              <span style={{ ...styles.itemQty, marginLeft: '12px' }}>x{item.quantity}</span>
                            </Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={styles.itemSubtotal}>₹{item.subtotal.toLocaleString('en-IN')}</span>
                              {order.status === 'Delivered' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openReviewModal(item.product_id, item.product_name);
                                  }} 
                                  className="btn-outline" 
                                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                >
                                  Leave Review
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer row */}
                    <div style={styles.cardFooter}>
                      <div style={styles.addressBox}>
                        <span>📍 <b>Shipped to:</b> {order.delivery_address}</span>
                        <span style={{ marginLeft: '12px', display: 'block', marginTop: '6px' }}>
                          💳 <b>Payment:</b> {order.payment_method} ({order.payment_status})
                        </span>
                      </div>
                      
                      <div style={styles.footerActions}>
                        <div style={styles.totalBox}>
                          <span style={styles.totalLabel}>Total amount:</span>
                          <span style={styles.totalVal}>₹{order.total_amount.toLocaleString('en-IN')}</span>
                        </div>

                        {isCODPending && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePayOnline(order);
                            }}
                            className="btn-primary"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              fontSize: '0.85rem',
                              background: 'var(--secondary)',
                              boxShadow: '0 0 10px var(--secondary-glow)',
                              border: 'none',
                              color: 'var(--text-light)',
                              cursor: 'pointer'
                            }}
                            disabled={paymentLoading[order.id]}
                          >
                            {paymentLoading[order.id] ? (
                              <Loader2 size={16} className="cyber-spinner" />
                            ) : (
                              <CreditCard size={16} />
                            )}
                            Pay Online Now
                          </button>
                        )}

                        {order.status === 'Delivered' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReturnRequest(order.id);
                            }}
                            className="btn-danger"
                            style={styles.returnBtn}
                          >
                            <CornerUpLeft size={16} />
                            Request Return
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.noOrders} className="glass-panel">
          <Clock size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No orders placed yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            When you purchase items, your order history and fraud check outcomes will appear here.
          </p>
        </div>
      )}

      {reviewModal.isOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Review {reviewModal.productName}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>Your review helps others make better decisions.</p>
            
            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Rating (1-5)</label>
                <input 
                  type="number" 
                  min="1" max="5" 
                  value={reviewRating} 
                  onChange={(e) => setReviewRating(parseInt(e.target.value))}
                  className="cyber-input"
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Comment</label>
                <textarea 
                  rows="4"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="cyber-input"
                  style={{ width: '100%', resize: 'none' }}
                  placeholder="What did you like or dislike?"
                  required
                ></textarea>
              </div>

              {/* Live Camera Feed */}
              {cameraMode && (
                <div style={styles.cameraPanel}>
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

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button 
                  type="button" 
                  onClick={closeReviewModal} 
                  className="btn-outline"
                  disabled={reviewLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={reviewLoading}>
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
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
  collapsedSummary: {
    padding: '16px 20px',
    backgroundColor: 'var(--primary-glow)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    transition: 'all 0.3s ease',
  },
  itemImg: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    objectFit: 'cover',
    marginRight: '12px',
    border: '1px solid var(--border-color)',
  },
  itemImgPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-app)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    fontSize: '1rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(31, 26, 38, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)',
  },
  modalContent: {
    background: 'var(--surface)',
    padding: '30px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: 'var(--shadow-panel)',
    border: '1px solid var(--border-color)',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '30px',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  orderCard: {
    padding: '24px 30px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
  },
  orderId: {
    margin: '0 0 6px 0',
    fontSize: '1.2rem',
  },
  orderDate: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
  },
  badgeRow: {
    display: 'flex',
    gap: '10px',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  flaggedBadge: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
  },
  progressSection: {
    marginBottom: '24px',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    maxWidth: '600px',
    margin: '0 auto',
  },
  stepWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  stepDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#000',
    zIndex: 2,
    marginBottom: '8px',
  },
  stepLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: '11px',
    left: '50%',
    width: '100%',
    height: '2px',
    zIndex: 1,
  },
  returnedStatus: {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    color: 'var(--danger)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 71, 87, 0.2)',
  },
  itemsSection: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemRow: {
    padding: '12px 16px',
    backgroundColor: 'var(--bg-app)',
    borderRadius: '8px',
  },
  itemMain: {
    display: 'flex',
    alignItems: 'center',
  },
  itemName: {
    fontWeight: '500',
    marginRight: '8px',
  },
  itemQty: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  itemSubtotal: {
    fontWeight: '600',
    color: 'var(--primary)',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid var(--border-color)',
    flexWrap: 'wrap',
    gap: '20px',
  },
  addressBox: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    flex: 1,
  },
  footerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  totalBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  totalVal: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--success)',
  },
  returnBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  summaryBar: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '16px',
    marginBottom: '10px',
    fontSize: '1.1rem',
    background: 'linear-gradient(45deg, rgba(92, 77, 177, 0.08), rgba(16, 185, 129, 0.08))',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
  },
  loader: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--primary-glow)',
    borderRadius: '50%',
    borderTopColor: 'var(--secondary)',
    animation: 'spin 1s ease-in-out infinite',
  },
  noOrders: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  cameraPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(9, 7, 15, 0.6)',
    border: '1px solid var(--border-color)',
    alignItems: 'center',
    marginTop: '12px'
  },
  cameraVideo: {
    width: '100%',
    maxWidth: '400px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
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
    border: '1px solid var(--border-color)',
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-app)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  }
};
