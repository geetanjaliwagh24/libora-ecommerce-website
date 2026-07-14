import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { WishlistContext } from '../context/WishlistContext';
import { ShoppingCart, Star, ChevronRight, TrendingUp, Percent, Award, Heart, SlidersHorizontal, X, Snowflake, Sun, Sparkles, Tag } from 'lucide-react';
import { API_URL } from '../config';
import { BannerCarousel } from '../components/BannerCarousel';

const SORT_OPTIONS = [
  { value: 'newest', label: '🆕 Newest First' },
  { value: 'price_asc', label: '💰 Price: Low to High' },
  { value: 'price_desc', label: '💎 Price: High to Low' },
  { value: 'rating', label: '⭐ Top Rated' },
];

const CATEGORIES = ['MEN', 'WOMEN', 'KIDS', 'LIVING', 'COSMETICS', 'ELECTRONICS'];

export const BuyerHome = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'success' });
  const [sellerId, setSellerId] = useState('');
  
  // Filter and Pagination state
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, has_next: false, has_prev: false, total: 0 });
  const [categoriesData, setCategoriesData] = useState([]);

  const { user } = useContext(AuthContext);
  const { isInWishlist, addToWishlist, removeFromWishlist } = useContext(WishlistContext);
  const location = useLocation();

  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/products/categories`);
        if (res.ok) setCategoriesData(await res.json());
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catId = params.get('category_id');
    const query = params.get('q');
    const sortBy = params.get('sort');
    const minPr = params.get('min_price');
    const maxPr = params.get('max_price');
    const sellerIdParam = params.get('seller_id');

    const fetchParams = { page: 1 };
    if (catId) { setSelectedCategory(catId); fetchParams.category_id = catId; }
    else setSelectedCategory('');
    
    if (query) { setSearch(query); fetchParams.q = query; }
    else setSearch('');
    
    if (sortBy) { setSort(sortBy); fetchParams.sort = sortBy; }
    else setSort('newest');
    
    if (minPr) { setMinPrice(minPr); fetchParams.min_price = minPr; }
    else setMinPrice('');
    
    if (maxPr) { setMaxPrice(maxPr); fetchParams.max_price = maxPr; }
    else setMaxPrice('');
    
    if (sellerIdParam) { setSellerId(sellerIdParam); fetchParams.seller_id = sellerIdParam; }
    else setSellerId('');

    fetchProducts(fetchParams);
  }, [location.search]);

  const fetchProducts = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const qp = new URLSearchParams();
      if (params.q) qp.append('q', params.q);
      if (params.category_id) qp.append('category_id', params.category_id);
      if (params.min_price) qp.append('min_price', params.min_price);
      if (params.max_price) qp.append('max_price', params.max_price);
      if (params.sort) qp.append('sort', params.sort);
      if (params.seller_id) qp.append('seller_id', params.seller_id);
      
      const isSearching = params.q || params.category_id || params.min_price || params.max_price || params.seller_id || (params.sort && params.sort !== 'newest');
      if (isSearching) {
        qp.append('page', params.page || 1);
        qp.append('per_page', 12);
      }

      const url = `${API_URL}/products${qp.toString() ? '?' + qp.toString() : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (isSearching && data.products !== undefined) {
          setProducts(data.products);
          setPagination({
            page: data.page,
            total_pages: data.pages,
            has_next: data.has_next,
            has_prev: data.has_prev,
            total: data.total
          });
        } else {
          setProducts(data);
          setPagination({ page: 1, total_pages: 1, has_next: false, has_prev: false, total: data.length });
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePageChange = (newPage) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchProducts({
      q: search,
      category_id: selectedCategory,
      min_price: minPrice,
      max_price: maxPrice,
      sort: sort,
      page: newPage
    });
  };

  const applyFilters = () => {
    const params = { page: 1 };
    if (search) params.q = search;
    if (selectedCategory) params.category_id = selectedCategory;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    params.sort = sort;
    fetchProducts(params);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setMinPrice(''); setMaxPrice(''); setSort('newest');
    setSelectedCategory('');
    fetchProducts({ page: 1 });
  };

  const handleToggleWishlist = async (e, product) => {
    e.preventDefault();
    if (!user) { triggerAlert('Please sign in to add to wishlist!', 'warning'); return; }
    const inWish = isInWishlist(product.id);
    const res = inWish ? await removeFromWishlist(product.id) : await addToWishlist(product.id);
    triggerAlert(res.success ? (inWish ? `Removed from wishlist` : `Added to wishlist!`) : res.message, res.success ? 'success' : 'danger');
  };

  const triggerAlert = (msg, type = 'success') => {
    setAlert({ show: true, msg, type });
    setTimeout(() => setAlert({ show: false, msg: '', type: 'success' }), 3000);
  };

  const getCategoryIdByName = (name) => {
    const found = categoriesData.find(c => c.name.toUpperCase() === name.toUpperCase());
    return found ? found.id : '';
  };

  const isSearchActive = search || selectedCategory || minPrice || maxPrice || sellerId || sort !== 'newest';
  const topPicks = [...products].sort((a, b) => b.rating - a.rating).slice(0, 10);
  const mostSold = [...products].sort((a, b) => b.review_count - a.review_count).slice(0, 20);
  const stealDeals = products.filter(p => p.discount > 0);

  const winterPicks = products.filter(p => 
    (p.category_name || '').toLowerCase().match(/jacket|sweater|coat|sweatshirt|boots|blanket/i) || 
    (p.name || '').toLowerCase().match(/jacket|sweater|coat|sweatshirt|boots|blanket/i) || 
    (p.description || '').toLowerCase().match(/winter|cozy|wool/i)
  ).slice(0, 10);

  const summerPicks = products.filter(p => 
    (p.category_name || '').toLowerCase().match(/t-shirt|shorts|dress|sunglasses|sunscreen|sandal|flip/i) || 
    (p.name || '').toLowerCase().match(/t-shirt|shorts|dress|sunglasses|sunscreen|sandal|flip/i) || 
    (p.description || '').toLowerCase().match(/summer|sun|breezy|cool/i)
  ).slice(0, 10);

  const festivePicks = products.filter(p => 
    (p.category_name || '').toLowerCase().match(/saree|ethnic|kurta|jewellery|perfume|candle|decor|wall art/i) || 
    (p.name || '').toLowerCase().match(/saree|ethnic|kurta|jewellery|perfume|candle|decor|wall art/i) || 
    (p.description || '').toLowerCase().match(/wedding|celebration|festive|luxury|gold|diwali/i)
  ).slice(0, 10);

  const newLaunchPicks = products.filter(p => {
    if (!p.created_at) return false;
    const createdDate = new Date(p.created_at);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - createdDate);
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 10;
  });

  const activeFiltersCount = [minPrice, maxPrice, sort !== 'newest' ? sort : ''].filter(Boolean).length;

  const renderProductCard = (prod, isDiscounted = false) => {
    const hasSizes = prod.sizes && Object.keys(prod.sizes).length > 0;
    const totalStock = hasSizes ? Object.values(prod.sizes).reduce((a, b) => a + b, 0) : prod.stock;
    const isOutOfStock = totalStock <= 0;

    return (
    <div key={prod.id} className="cyber-card" style={styles.card}>
      <Link to={`/product/${prod.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={styles.imageWrapper}>
          <img src={prod.image_url || 'https://via.placeholder.com/200x200'} alt={prod.name} style={{...styles.productImg, opacity: isOutOfStock ? 0.5 : 1}} />
          {isOutOfStock && (
            <div style={styles.outOfStockStrip}>
              OUT OF STOCK
            </div>
          )}
          {totalStock > 0 && totalStock <= 5 && (
            <span style={styles.lowStockBadge}>Only {totalStock} left</span>
          )}
          {prod.discount > 0 && !isOutOfStock && <span style={styles.discountBadge}>{prod.discount}% OFF</span>}

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
          {(!user || user.role === 'buyer') && (
            <button onClick={(e) => handleToggleWishlist(e, prod)} style={styles.wishlistBtn} className="icon-btn">
              <Heart size={20} fill={isInWishlist(prod.id) ? "var(--danger)" : "transparent"} color={isInWishlist(prod.id) ? "var(--danger)" : "var(--text-secondary)"} />
            </button>
          )}
        </div>
        <div style={styles.cardBody}>
          <h3 style={styles.productTitle} title={prod.name}>{prod.name}</h3>
          <div style={styles.ratingRow}>
            {prod.rating > 0 ? (
              <>
                <Star size={14} fill="var(--warning)" color="var(--warning)" />
                <span style={styles.ratingNum}>{prod.rating.toFixed(1)}</span>
                <span style={styles.reviewsCount}>({prod.review_count})</span>
              </>
            ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No ratings yet</span>}
          </div>
          <div style={styles.priceRow}>
            <span style={styles.price}>₹{prod.price.toLocaleString('en-IN')}</span>
            {prod.discount > 0 && prod.original_price && (
              <span style={styles.originalPrice}>₹{prod.original_price.toLocaleString('en-IN')}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
    );
  };

  const renderSkeletonCard = (key) => (
    <div key={key} className="cyber-card" style={styles.card}>
      <div style={styles.skeletonImage} className="shimmer-elem"></div>
      <div style={styles.cardBody}>
        <div style={styles.skeletonTitle} className="shimmer-elem"></div>
        <div style={styles.skeletonRating} className="shimmer-elem"></div>
        <div style={styles.skeletonPrice} className="shimmer-elem"></div>
      </div>
    </div>
  );

  const renderCarousel = (title, icon, items, seeAllUrl = "/", isDiscounted = false) => (
    items.length === 0 ? null :
    <div style={styles.sectionContainer}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{icon} {title}</h2>
        <Link to={seeAllUrl} style={styles.seeAllLink}>See all <ChevronRight size={16} /></Link>
      </div>
      <div style={styles.carouselContainer} className="hide-scrollbar">
        {items.map(prod => renderProductCard(prod, isDiscounted))}
      </div>
    </div>
  );

  return (
    <div style={styles.pageWrapper}>
      {/* Alert popup */}
      {alert.show && (
        <div style={{
          ...styles.alertPopup,
          backgroundColor: alert.type === 'success' ? 'var(--success)' : alert.type === 'danger' ? 'var(--danger)' : 'var(--warning)',
        }}>{alert.msg}</div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-elem {
          background: linear-gradient(90deg, rgba(30, 24, 46, 0.85) 25%, rgba(60, 48, 92, 0.85) 50%, rgba(30, 24, 46, 0.85) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>

      {/* Filter Sidebar */}
      <div style={{ ...styles.filterSidebar, transform: showFilters ? 'translateX(0)' : 'translateX(-110%)' }}>
        <div style={styles.filterHeader}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🎛️ Filters</h3>
          <button onClick={() => setShowFilters(false)} style={styles.closeBtn}><X size={18} /></button>
        </div>

        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>Sort By</label>
          {SORT_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setSort(opt.value)}
              style={{ ...styles.sortChip, background: sort === opt.value ? 'var(--primary)' : 'var(--surface-elevated)' }}>
              {opt.label}
            </button>
          ))}
        </div>

        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>Category</label>
          {CATEGORIES.map(cat => {
            const catId = getCategoryIdByName(cat);
            const isActive = selectedCategory && catId && selectedCategory.toString() === catId.toString();
            return (
              <button key={cat} onClick={() => setSelectedCategory(isActive ? '' : catId)}
                style={{ ...styles.sortChip, background: isActive ? 'var(--primary)' : 'var(--surface-elevated)' }}>
                {cat}
              </button>
            );
          })}
        </div>

        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>Price Range (₹)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input type="number" placeholder="Min Price" value={minPrice} onChange={e => setMinPrice(e.target.value)}
              className="cyber-input" style={{ ...styles.priceInput, width: '100%' }} />
            <input type="number" placeholder="Max Price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              className="cyber-input" style={{ ...styles.priceInput, width: '100%' }} />
          </div>
        </div>

        <button onClick={applyFilters} className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
          Apply Filters
        </button>
        <button onClick={clearFilters} style={{ ...styles.clearBtn }}>
          Clear All
        </button>
      </div>
      {showFilters && <div onClick={() => setShowFilters(false)} style={styles.overlay} />}

      <div style={styles.container}>
        {/* Filter toggle bar */}
        <div style={styles.filterBar}>
          <button onClick={() => setShowFilters(true)} className="btn-secondary" style={styles.filterToggle}>
            <SlidersHorizontal size={16} />
            Filters {activeFiltersCount > 0 && <span style={styles.filterBadge}>{activeFiltersCount}</span>}
          </button>
          <div style={styles.sortQuickBar}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { setSort(opt.value); fetchProducts({ sort: opt.value, q: search, category_id: selectedCategory, min_price: minPrice, max_price: maxPrice, page: 1 }); }}
                style={{ ...styles.quickSortChip, background: sort === opt.value ? 'var(--primary)' : 'transparent', color: sort === opt.value ? 'var(--text-light)' : 'var(--text-secondary)' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isSearchActive ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Search Results <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '1rem' }}>({loading ? '...' : pagination.total} items)</span></h2>
              <button onClick={clearFilters} style={styles.clearBtn}>Clear ×</button>
            </div>
            
            {loading ? (
              <div style={styles.productGrid}>
                {Array.from({ length: 8 }).map((_, idx) => renderSkeletonCard(idx))}
              </div>
            ) : products.length > 0 ? (
              <div style={styles.productGrid}>{products.map(p => renderProductCard(p, false))}</div>
            ) : (
              <div style={styles.emptyState}>
                <ShoppingCart size={48} style={{ color: 'var(--border-color)', marginBottom: '16px' }} />
                <h3>No products found</h3>
                <p>Try adjusting your search or filters.</p>
              </div>
            )}

            {/* Premium Pagination Controls */}
            {!loading && pagination.total_pages > 1 && (
              <div style={styles.paginationRow}>
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)} 
                  disabled={!pagination.has_prev} 
                  className="btn-secondary"
                  style={{ ...styles.pageBtn, opacity: pagination.has_prev ? 1 : 0.4, cursor: pagination.has_prev ? 'pointer' : 'not-allowed' }}
                >
                  ◀ Prev
                </button>
                
                {Array.from({ length: pagination.total_pages }, (_, idx) => idx + 1).map(pageNum => (
                  <button 
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className="btn-primary"
                    style={{
                      ...styles.pageNumberBtn,
                      background: pagination.page === pageNum ? 'var(--grad-primary)' : 'transparent',
                      border: pagination.page === pageNum ? 'none' : '1px solid var(--border-color)',
                      color: pagination.page === pageNum ? 'var(--text-light)' : 'var(--text-secondary)',
                      boxShadow: pagination.page === pageNum ? 'var(--shadow-glow)' : 'none',
                    }}
                  >
                    {pageNum}
                  </button>
                ))}
                
                <button 
                  onClick={() => handlePageChange(pagination.page + 1)} 
                  disabled={!pagination.has_next} 
                  className="btn-secondary"
                  style={{ ...styles.pageBtn, opacity: pagination.has_next ? 1 : 0.4, cursor: pagination.has_next ? 'pointer' : 'not-allowed' }}
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>
        ) : (
          loading ? (
            <div style={styles.amazonHome}>
              {/* Shimmer skeleton lines for premium look */}
              <div style={styles.sectionContainer}>
                <div style={{ ...styles.sectionHeader, borderBottom: 'none', marginBottom: '12px' }}>
                  <div className="shimmer-elem" style={{ height: '24px', width: '220px', borderRadius: '4px' }}></div>
                </div>
                <div style={styles.carouselContainer} className="hide-scrollbar">
                  {Array.from({ length: 5 }).map((_, idx) => renderSkeletonCard(idx))}
                </div>
              </div>
              <div style={styles.sectionContainer}>
                <div style={{ ...styles.sectionHeader, borderBottom: 'none', marginBottom: '12px' }}>
                  <div className="shimmer-elem" style={{ height: '24px', width: '260px', borderRadius: '4px' }}></div>
                </div>
                <div style={styles.carouselContainer} className="hide-scrollbar">
                  {Array.from({ length: 5 }).map((_, idx) => renderSkeletonCard(idx))}
                </div>
              </div>
              <div style={styles.sectionContainer}>
                <div style={{ ...styles.sectionHeader, borderBottom: 'none', marginBottom: '12px' }}>
                  <div className="shimmer-elem" style={{ height: '24px', width: '240px', borderRadius: '4px' }}></div>
                </div>
                <div style={styles.carouselContainer} className="hide-scrollbar">
                  {Array.from({ length: 5 }).map((_, idx) => renderSkeletonCard(idx))}
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.amazonHome}>
              <BannerCarousel />
              {renderCarousel("Steal Deals: Budget Finds", <Tag size={24} style={{color: 'var(--danger)'}}/>, stealDeals, "/?sort=price_asc")}
              {renderCarousel("StyleCast Premium Picks", <Award size={24} style={{color: 'var(--primary)'}}/>, topPicks, "/?sort=rating")}
              {renderCarousel("New Launch", <Sparkles size={24} style={{color: 'var(--accent)'}}/>, newLaunchPicks, "/?sort=newest")}
              
              {/* Cozy Winter Edit */}
              {renderCarousel("Velvet & Frost: Cozy Winter Layers", <Snowflake size={24} style={{color: 'var(--secondary)'}}/>, winterPicks, "/?q=jacket")}
              
              {/* Golden Hour Summer Selections */}
              {renderCarousel("Solstice Sun: Golden Hour Essentials", <Sun size={24} style={{color: 'var(--warning)'}}/>, summerPicks, "/?q=summer")}
              
              {/* Luxe Celebration & Diwali Sparkle */}
              {renderCarousel("Luxe Festivities: Celebration & Sparkle", <Sparkles size={24} style={{color: 'var(--accent)'}}/>, festivePicks, "/?q=saree")}
              
              {renderCarousel("Bestsellers", <TrendingUp size={24} style={{color: 'var(--success)'}}/>, mostSold, "/?sort=rating")}
              
              {CATEGORIES.map((cat, idx) => {
                const catProds = products.filter(p => p.main_category_name === cat);
                const catId = getCategoryIdByName(cat);
                return catProds.length > 0 ? (
                  <React.Fragment key={idx}>
                    {renderCarousel(`${cat} Collection`, <ChevronRight size={24} style={{color: 'var(--primary)'}}/>, catProds, catId ? `/?category_id=${catId}` : "/")}
                  </React.Fragment>
                ) : null;
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: { position: 'relative' },
  container: { maxWidth: '1400px', margin: '0 auto', padding: '16px 20px' },
  filterSidebar: {
    position: 'fixed', top: 0, left: 0, height: '100vh', width: '300px', zIndex: 1000,
    background: 'var(--surface)', borderRight: '1px solid var(--border-color)',
    padding: '24px 20px', overflowY: 'auto', transition: 'transform 0.3s ease',
    display: 'flex', flexDirection: 'column', gap: '4px',
    boxShadow: '4px 0 24px rgba(0,0,0,0.3)'
  },
  filterHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' },
  filterSection: { marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  filterLabel: { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' },
  sortChip: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', transition: 'all 0.2s', color: 'var(--text-primary)' },
  priceInput: { flex: 1, padding: '8px', borderRadius: '8px' },
  clearBtn: { background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '8px', fontSize: '0.85rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(31, 26, 38, 0.5)', zIndex: 999 },
  filterBar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px 0', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' },
  filterToggle: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', position: 'relative' },
  filterBadge: { background: 'var(--danger)', color: 'var(--text-light)', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  sortQuickBar: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  quickSortChip: { padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' },
  alertPopup: { position: 'fixed', top: '80px', right: '20px', padding: '12px 20px', borderRadius: '12px', color: 'var(--text-light)', fontWeight: 600, zIndex: 9999, animation: 'slideIn 0.3s ease' },
  loaderContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0' },
  loader: { width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  emptyState: { textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' },
  productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' },
  amazonHome: { display: 'flex', flexDirection: 'column', gap: '0px' },
  heroBanner: { height: '0px' },
  sectionContainer: { marginBottom: '40px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' },
  sectionTitle: { margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' },
  seeAllLink: { color: 'var(--primary)', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '2px' },
  carouselContainer: { display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px' },
  card: { minWidth: '180px', maxWidth: '180px', cursor: 'pointer', transition: 'transform 0.2s', borderRadius: '12px', overflow: 'hidden' },
  imageWrapper: { position: 'relative', height: '200px', overflow: 'hidden', background: 'var(--surface-elevated)' },
  productImg: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' },
  outOfStockStrip: { position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', background: 'rgba(0, 0, 0, 0.75)', color: '#fff', textAlign: 'center', padding: '8px 0', fontWeight: 800, letterSpacing: '2px', fontSize: '0.85rem', zIndex: 3, backdropFilter: 'blur(4px)' },
  lowStockBadge: { position: 'absolute', bottom: '8px', left: '8px', background: 'var(--warning)', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, zIndex: 2 },
  discountBadge: { position: 'absolute', top: '8px', left: '8px', background: 'var(--danger)', color: 'var(--text-light)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 },
  wishlistBtn: { position: 'absolute', top: '8px', right: '8px', background: 'rgba(31, 26, 38, 0.5)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' },
  cardBody: { padding: '10px 12px' },
  productTitle: { fontSize: '0.85rem', fontWeight: 600, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' },
  ratingRow: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' },
  stars: { display: 'flex', alignItems: 'center', gap: '2px' },
  ratingNum: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--warning)' },
  reviewsCount: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  priceRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  price: { fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' },
  originalPrice: { fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'line-through' },
  
  // Shimmer Skeletons styling
  skeletonImage: { width: '100%', height: '200px', background: 'var(--surface-elevated)' },
  skeletonTitle: { height: '14px', width: '80%', borderRadius: '4px', marginBottom: '12px', background: 'var(--surface-elevated)' },
  skeletonRating: { height: '12px', width: '40%', borderRadius: '4px', marginBottom: '12px', background: 'var(--surface-elevated)' },
  skeletonPrice: { height: '16px', width: '60%', borderRadius: '4px', background: 'var(--surface-elevated)' },
  
  // Pagination controls styling
  paginationRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '30px', padding: '16px 0' },
  pageBtn: { padding: '10px 18px', fontSize: '0.85rem', minWidth: '80px', transition: 'all 0.2s ease' },
  pageNumberBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease', fontWeight: 600 },
};
