import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { Search, ShoppingBag, Heart, User as UserIcon, Store, LayoutDashboard, Trash2, Calendar, Mail, MapPin, Phone, X, LogOut, Package, Compass, Feather, Menu } from 'lucide-react';
import { API_URL } from '../config';

export const Navbar = () => {
  const { user, logout, deleteAccount } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [activeHoverCategory, setActiveHoverCategory] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/products/categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!confirmText) {
      setErrorMsg('Please enter your password to confirm.');
      return;
    }
    
    try {
      setIsDeleting(true);
      setErrorMsg('');
      const res = await deleteAccount(confirmText);
      if (res.success) {
        setIsDeleteConfirmOpen(false);
        setConfirmText('');
        setShowDeleteSuccessModal(true);
        setTimeout(() => {
            setShowDeleteSuccessModal(false);
            setIsProfileOpen(false);
            navigate('/');
        }, 3000);
      } else {
        setErrorMsg(res.message || 'Failed to delete account');
      }
    } catch (err) {
      setErrorMsg('An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
  };

  const closeModals = () => {
    setIsProfileOpen(false);
    setIsDeleteConfirmOpen(false);
    setConfirmText('');
    setErrorMsg('');
  };

  const getCartCount = () => {
    return cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  };

  return (
    <>
    <nav style={styles.nav} onMouseLeave={() => setActiveHoverCategory(null)}>
      <div style={styles.container}>
        {/* Mobile Hamburger Toggle (Left side on mobile) */}
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileMenuOpen(true)}
          style={styles.hamburgerBtn}
        >
          <Menu size={24} />
        </button>

        {/* Logo */}
        <div style={{ ...styles.logo, display: 'flex', alignItems: 'center' }} className="nav-logo">
          <span style={styles.logoText}>Libora</span>
        </div>
        
        {/* Categories (Fully Dynamic based on Database - Desktop Only) */}
        <div style={styles.categories} className="desktop-nav-categories">
          <div 
            style={styles.catLinkContainer}
            onMouseEnter={() => setActiveHoverCategory('HOME')}
          >
            <Link to="/" style={{
              ...styles.catLink, 
              borderBottom: activeHoverCategory === 'HOME' ? '4px solid #ff3f6c' : '4px solid transparent'
            }}
            onClick={() => setActiveHoverCategory('HOME')}>
              HOME
            </Link>
          </div>

          {categories.slice(0, 6).map((catData, idx) => {
            const catName = catData.name;
            return (
              <div 
                key={idx} 
                style={styles.catLinkContainer}
                onMouseEnter={() => setActiveHoverCategory(catName)}
              >
                <Link to={catData ? `/?category_id=${catData.id}` : "/"} style={{
                  ...styles.catLink, 
                  borderBottom: activeHoverCategory === catName ? '4px solid #ff3f6c' : '4px solid transparent'
                }}
                onClick={(e) => {
                  if (activeHoverCategory !== catName) {
                    e.preventDefault();
                    setActiveHoverCategory(catName);
                  }
                }}>
                  {catName}
                </Link>
                
                {/* Mega Menu Dropdown */}
                {activeHoverCategory === catName && catData && catData.subcategories && catData.subcategories.length > 0 && (
                  <div style={styles.megaMenuContainer}>
                    <div style={styles.megaMenuGrid}>
                      {catData.subcategories.map(group => (
                        <div key={group.id} style={styles.megaMenuGroup}>
                          <span style={styles.megaMenuHeading}>{group.name}</span>
                          {group.subcategories && group.subcategories.map(sub => (
                            <Link 
                              key={sub.id} 
                              to={`/?category_id=${sub.id}`} 
                              className="mega-menu-link"
                              onClick={() => setActiveHoverCategory(null)}
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Search Bar (Desktop Only) */}
        <form onSubmit={handleSearch} style={styles.searchContainer} className="desktop-search-form">
          <Search size={18} style={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search for products, brands and more" 
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        
        {/* Actions (Profile, Wishlist, Bag) */}
        <div style={styles.actionsContainer} className="nav-actions-container">
          <div 
            style={styles.actionItem} 
            onClick={user ? () => setIsProfileOpen(true) : () => navigate('/auth')}
            className="desktop-only-action"
          >
            <UserIcon size={20} />
            <span style={styles.actionText}>Profile</span>
          </div>

          <Link to="/feed" style={{...styles.actionItem, textDecoration: 'none'}} className="desktop-only-action">
            <div style={styles.feedIconWrapper}>
              <Compass size={22} color="var(--primary)" style={styles.feedIcon} />
              <div style={styles.feedIndicator}></div>
            </div>
            <span style={styles.actionText}>Discover</span>
          </Link>

          {(!user || user.role === 'buyer') && (
            <>
              <Link to="/wishlist" style={{...styles.actionItem, textDecoration: 'none'}}>
                <Heart size={20} />
                <span style={styles.actionText}>Wishlist</span>
              </Link>

              <Link to="/cart" style={{...styles.actionItem, textDecoration: 'none'}}>
                <div style={{position: 'relative'}}>
                  <ShoppingBag size={20} />
                  {getCartCount() > 0 && (
                    <span style={styles.cartBadge}>{getCartCount()}</span>
                  )}
                </div>
                <span style={styles.actionText}>Bag</span>
              </Link>
            </>
          )}
        </div>
      </div>
      
      {/* Mobile Search Bar below header - handy and quick */}
      <div className="mobile-search-bar">
        <form onSubmit={handleSearch} style={styles.mobileSearchForm}>
          <Search size={16} style={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search products..." 
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>
    </nav>

    {/* Mobile Drawer (Collapsible Menu Drawer) */}
    {isMobileMenuOpen && (
      <div style={styles.drawerOverlay} onClick={() => setIsMobileMenuOpen(false)}>
        <div style={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
          <div style={styles.drawerHeader}>
            <span style={styles.drawerLogoText}>Libora Menu</span>
            <button style={styles.drawerCloseBtn} onClick={() => setIsMobileMenuOpen(false)}>
              <X size={24} />
            </button>
          </div>

          {/* User Section in Drawer */}
          <div style={styles.drawerProfileSection} className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={styles.drawerAvatar}>
                <UserIcon size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ flex: 1 }}>
                {user ? (
                  <>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{user.email.split('@')[0]}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Role: {user.role}</span>
                  </>
                ) : (
                  <button 
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/auth'); }}
                    className="btn-primary" 
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    Login / Sign Up
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Categories List in Drawer */}
          <div style={styles.drawerNavSection}>
            <span style={styles.drawerHeading}>Categories</span>
            <div style={styles.drawerCategoriesList}>
              <Link to="/" style={styles.drawerLink} onClick={() => setIsMobileMenuOpen(false)}>
                🏠 Home
              </Link>
              {categories.map((cat, idx) => (
                <Link
                  key={idx}
                  to={`/?category_id=${cat.id}`}
                  style={styles.drawerLink}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ✨ {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick shortcuts */}
          <div style={styles.drawerNavSection}>
            <span style={styles.drawerHeading}>Quick Links</span>
            <div style={styles.drawerCategoriesList}>
              <Link to="/feed" style={styles.drawerLink} onClick={() => setIsMobileMenuOpen(false)}>
                🧭 Discover / Social Feed
              </Link>
              {user && (
                <>
                  <Link to="/profile" style={styles.drawerLink} onClick={() => setIsMobileMenuOpen(false)}>
                    👤 My Profile
                  </Link>
                  {user.role === 'buyer' && (
                    <Link to="/orders" style={styles.drawerLink} onClick={() => setIsMobileMenuOpen(false)}>
                      📦 My Orders
                    </Link>
                  )}
                  {user.role === 'seller' && (
                    <Link to="/seller-dashboard" style={styles.drawerLink} onClick={() => setIsMobileMenuOpen(false)}>
                      🏪 Seller Panel
                    </Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin-dashboard" style={styles.drawerLink} onClick={() => setIsMobileMenuOpen(false)}>
                      🛡️ Admin Dashboard
                    </Link>
                  )}
                  <button 
                    style={styles.drawerLogoutBtn} 
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                  >
                    <LogOut size={16} /> Log Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Profile & Settings Modal - outside nav so it's not clipped */}
    {isProfileOpen && (
      <div style={styles.modalOverlay} onClick={closeModals}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <button style={styles.closeBtn} onClick={closeModals}>
            <X size={20} />
          </button>

          {!isDeleteConfirmOpen ? (
            <>
              <div style={styles.modalHeader}>
                <div style={styles.avatarSection}>
                  <div style={styles.avatarGlow}>
                    <UserIcon size={36} style={{ color: '#ff3f6c' }} />
                  </div>
                  <h2 style={styles.modalTitle}>{user?.email?.split('@')[0]}</h2>
                  <span style={styles.modalRoleTag}>{user?.role}</span>
                </div>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.dashLinks}>
                  <Link to="/profile" style={styles.dashBtn} onClick={closeModals}>
                    <UserIcon size={16} /> My Profile
                  </Link>
                  {user?.role === 'buyer' && (
                    <Link to="/orders" style={styles.dashBtn} onClick={closeModals}>
                      <Package size={16} /> My Orders
                    </Link>
                  )}
                  {user?.role === 'seller' && (
                    <Link to="/seller-dashboard" style={styles.dashBtn} onClick={closeModals}>
                      <Store size={16} /> Seller Panel
                    </Link>
                  )}
                  {user?.role === 'admin' && (
                    <Link to="/admin-dashboard" style={styles.dashBtn} onClick={closeModals}>
                      <LayoutDashboard size={16} /> Admin Panel
                    </Link>
                  )}
                </div>

                <div style={styles.infoRow}>
                  <Mail size={16} style={styles.infoIcon} />
                  <div>
                    <div style={styles.infoLabel}>Email Address</div>
                    <div style={styles.infoValue}>{user?.email}</div>
                  </div>
                </div>

                {user?.phone && (
                  <div style={styles.infoRow}>
                    <Phone size={16} style={styles.infoIcon} />
                    <div>
                      <div style={styles.infoLabel}>Phone Number</div>
                      <div style={styles.infoValue}>{user?.phone}</div>
                    </div>
                  </div>
                )}

                {user?.address && (
                  <div style={styles.infoRow}>
                    <MapPin size={16} style={styles.infoIcon} />
                    <div>
                      <div style={styles.infoLabel}>Address</div>
                      <div style={styles.infoValue}>{user?.address}</div>
                    </div>
                  </div>
                )}

                <div style={styles.infoRow}>
                  <Calendar size={16} style={styles.infoIcon} />
                  <div>
                    <div style={styles.infoLabel}>Member Since</div>
                    <div style={styles.infoValue}>
                      {user?.created_at && new Date(user.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button onClick={handleLogout} style={styles.modalLogoutBtn}>
                  <LogOut size={16} /> Log Out
                </button>
                <button onClick={() => setIsDeleteConfirmOpen(true)} style={styles.modalDeleteBtn}>
                  <Trash2 size={16} /> Delete Account
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={styles.modalHeader}>
                <h2 style={{ ...styles.modalTitle, color: '#ef4444' }}>Confirm Deletion</h2>
                <p style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center', marginTop: '8px' }}>
                  Warning: This action is permanent. All your data will be deleted.
                </p>
              </div>
              <div style={styles.modalBody}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.9rem', color: '#333', display: 'block', marginBottom: '8px' }}>
                    Enter your <span style={{ color: '#ef4444', fontWeight: 'bold' }}>password</span> to confirm:
                  </label>
                  <input
                    type="password"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Enter password"
                    disabled={isDeleting}
                  />
                </div>
                {errorMsg && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errorMsg}</div>}
              </div>
              <div style={styles.modalFooter}>
                <button onClick={() => { setIsDeleteConfirmOpen(false); setConfirmText(''); setErrorMsg(''); }} style={styles.modalLogoutBtn} disabled={isDeleting}>
                  Cancel
                </button>
                <button onClick={handleDeleteAccount} style={{ ...styles.modalDeleteBtn, opacity: confirmText ? 1 : 0.5 }} disabled={!confirmText || isDeleting}>
                  <Trash2 size={16} /> {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </>
          )}

          {/* Delete Success Modal */}
          {showDeleteSuccessModal && (
            <div style={styles.modalOverlay}>
              <div style={{...styles.modalContent, textAlign: 'center'}} className="glass-panel">
                <h3 style={{ marginTop: 0, color: 'var(--primary)', marginBottom: '16px' }}>Account Deleted</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                  Your account has been successfully deleted. A confirmation email has been sent to your address. Sad to see you go!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
};

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    background: '#fff',
    boxShadow: '0 4px 12px 0 rgba(0,0,0,0.05)',
    zIndex: 99,
    padding: '0 20px',
    height: '80px',
    color: '#333'
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1300px',
    margin: '0 auto',
    height: '100%'
  },
  logo: {
    textDecoration: 'none',
    marginRight: '30px'
  },
  logoText: {
    fontSize: '32px',
    fontWeight: '900',
    color: 'var(--primary)',
    letterSpacing: '-1px',
    fontFamily: 'var(--font-sans)'
  },
  categories: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    height: '100%',
    flex: 1
  },
  catLinkContainer: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  catLink: {
    textDecoration: 'none',
    color: '#282c3f',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    transition: 'all 0.2s ease',
  },
  megaMenuContainer: {
    position: 'absolute',
    top: '80px',
    left: '0',
    width: '100vw',
    backgroundColor: '#fff',
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
    borderTop: '1px solid #eaeaea',
    padding: '30px',
    zIndex: 999,
    display: 'flex',
    justifyContent: 'center'
  },
  megaMenuGrid: {
    display: 'flex',
    gap: '40px',
    maxWidth: '1300px',
    width: '100%',
    flexWrap: 'wrap'
  },
  megaMenuGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '150px'
  },
  megaMenuHeading: {
    fontWeight: '800',
    fontSize: '14px',
    color: '#ff3f6c',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(92, 77, 177, 0.05)',
    borderRadius: '8px',
    padding: '8px 16px',
    width: '350px',
    marginRight: '30px',
    border: '1px solid rgba(92, 77, 177, 0.15)'
  },
  searchIcon: {
    color: '#696e79',
    marginRight: '12px'
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    width: '100%',
    fontSize: '14px',
    color: '#696e79'
  },
  actionsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px'
  },
  actionItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#282c3f',
    cursor: 'pointer',
    gap: '4px'
  },
  actionText: {
    fontSize: '12px',
    fontWeight: '700'
  },
  cartBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-10px',
    background: '#ff3f6c',
    color: 'white',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '10px',
    fontWeight: 'bold',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: '460px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '32px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
    color: '#282c3f',
    flexShrink: 0,
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    zIndex: 10,
  },
  modalHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  avatarGlow: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: '#fff',
    border: '2px solid #ff3f6c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(255, 63, 108, 0.2)',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#333',
    margin: 0,
  },
  modalRoleTag: {
    padding: '2px 8px',
    background: 'var(--primary-glow)',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  dashLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  dashBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    background: 'rgba(92, 77, 177, 0.05)',
    border: '1px solid rgba(92, 77, 177, 0.12)',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(92, 77, 177, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(92, 77, 177, 0.12)',
  },
  infoIcon: {
    color: '#ff3f6c',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  infoValue: {
    fontSize: '0.95rem',
    color: '#282c3f',
    fontWeight: '500',
    marginTop: '2px',
  },
  modalFooter: {
    display: 'flex',
    gap: '16px',
    borderTop: '1px solid #eee',
    paddingTop: '20px',
  },
  modalLogoutBtn: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '6px',
    padding: '10px',
    background: 'var(--primary-glow)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  modalDeleteBtn: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '6px',
    padding: '10px',
    background: '#ff3f6c',
    color: 'var(--text-light)',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  warningText: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginTop: '12px',
    lineHeight: '1.5',
  },
  inputLabel: {
    fontSize: '0.85rem',
    color: '#555',
  },
  errorText: {
    color: '#ff3f6c',
    fontSize: '0.85rem',
    fontWeight: '500',
    marginTop: '8px',
  },
  feedIconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    background: 'rgba(0, 240, 255, 0.1)',
    transition: 'all 0.3s ease',
  },
  feedIcon: {
    filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.4))',
  },
  feedIndicator: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#ff3f6c',
    border: '2px solid white',
  },
  hamburgerBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: '#333',
    cursor: 'pointer',
    padding: '4px',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(5px)',
    zIndex: 100000,
    display: 'flex',
  },
  drawerContent: {
    width: '280px',
    maxWidth: '85%',
    height: '100%',
    background: 'var(--bg-surface-elevated)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 20px',
    gap: '24px',
    overflowY: 'auto',
    animation: 'slideInLeft 0.3s ease-out',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerLogoText: {
    fontSize: '1.1rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #8a2be2 0%, #00f0ff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  drawerCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  drawerProfileSection: {
    padding: '16px',
    background: 'var(--primary-glow)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
  },
  drawerAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--bg-surface-elevated)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border-color)',
  },
  drawerNavSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  drawerHeading: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'var(--primary)',
    fontWeight: '600',
    letterSpacing: '1px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '6px',
  },
  drawerCategoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  drawerLink: {
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'color 0.2s',
    display: 'block',
    padding: '6px 0',
  },
  drawerLogoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'rgba(255, 63, 108, 0.1)',
    border: '1px solid rgba(255, 63, 108, 0.2)',
    color: '#ff3f6c',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '10px',
  },
  mobileSearchForm: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(92, 77, 177, 0.05)',
    borderRadius: '8px',
    padding: '6px 12px',
    width: '100%',
    border: '1px solid rgba(92, 77, 177, 0.15)',
  }
};
