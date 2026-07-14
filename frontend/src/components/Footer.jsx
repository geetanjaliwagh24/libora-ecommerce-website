import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ShieldCheck, RefreshCcw, X } from 'lucide-react';
import { FAQPage } from '../pages/FAQPage';
import { TermsOfUsePage } from '../pages/TermsOfUsePage';
import { TermsAndConditionsPage } from '../pages/TermsAndConditionsPage';
import { CancellationPage } from '../pages/CancellationPage';
import { ReturnsPage } from '../pages/ReturnsPage';

export const Footer = () => {
  const [activePolicy, setActivePolicy] = useState(null);

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid}>
          {/* Column 1: Online Shopping */}
          <div style={styles.column}>
            <h3 style={styles.heading}>ONLINE SHOPPING</h3>
            <ul style={styles.list}>
              <li><Link to="/?category_id=1" style={styles.link}>Men</Link></li>
              <li><Link to="/?category_id=2" style={styles.link}>Women</Link></li>
              <li><Link to="/?category_id=3" style={styles.link}>Kids</Link></li>
              <li><Link to="/?category_id=4" style={styles.link}>Home & Living</Link></li>
              <li><Link to="/?category_id=5" style={styles.link}>Beauty</Link></li>
            </ul>
          </div>

          {/* Column 2: Customer Policies */}
          <div style={styles.column}>
            <h3 style={styles.heading}>CUSTOMER POLICIES</h3>
            <ul style={styles.list}>
              <li><Link to="#" style={styles.link}>Contact Us</Link></li>
              <li><span onClick={() => setActivePolicy('faq')} style={styles.link}>FAQ</span></li>
              <li><span onClick={() => setActivePolicy('terms-and-conditions')} style={styles.link}>T&C</span></li>
              <li><span onClick={() => setActivePolicy('terms-of-use')} style={styles.link}>Terms Of Use</span></li>
              <li><Link to="/orders" style={styles.link}>Track Orders</Link></li>
              <li><span onClick={() => setActivePolicy('cancellation')} style={styles.link}>Cancellation</span></li>
              <li><span onClick={() => setActivePolicy('returns')} style={styles.link}>Returns</span></li>
            </ul>
          </div>

          {/* Column 3: Newsletter */}
          <div style={styles.column}>
            <h3 style={styles.heading}>STAY UPDATED</h3>
            <p style={styles.text}>
              Subscribe to our newsletter to get the latest updates on trends, exclusive offers, and steals!
            </p>
            <form style={styles.subscribeForm} onSubmit={(e) => { e.preventDefault(); alert("Thanks for subscribing!"); }}>
              <div style={styles.inputGroup}>
                <Mail size={18} style={styles.inputIcon} />
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  style={styles.input} 
                  required
                />
              </div>
              <button type="submit" style={styles.subscribeBtn}>Subscribe</button>
            </form>
          </div>

          {/* Column 4: Keep In Touch */}
          <div style={styles.column}>
            <h3 style={styles.heading}>KEEP IN TOUCH</h3>
            <div style={styles.socialIcons}>
              <a href="#" style={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="#" style={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </a>
              <a href="#" style={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
              </a>
              <a href="#" style={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
            </div>
            
            <div style={styles.trustBadges}>
              <div style={styles.trustBadge}>
                <ShieldCheck size={28} style={{color: 'var(--success)'}} />
                <div>
                  <strong>100% ORIGINAL</strong> guarantee for all products at libora.com
                </div>
              </div>
              <div style={styles.trustBadge}>
                <RefreshCcw size={28} style={{color: 'var(--primary)'}} />
                <div>
                  <strong>Return within 14 days</strong> of receiving your order
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div style={styles.bottomBar}>
          <p>© {new Date().getFullYear()} Libora. All rights reserved.</p>
        </div>
      </div>

      {activePolicy && (
        <div style={styles.modalOverlay} onClick={() => setActivePolicy(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setActivePolicy(null)}>
              <X size={20} />
            </button>
            <div style={styles.modalBodyScrollable}>
              {activePolicy === 'faq' && <FAQPage />}
              {activePolicy === 'terms-and-conditions' && <TermsAndConditionsPage />}
              {activePolicy === 'terms-of-use' && <TermsOfUsePage />}
              {activePolicy === 'cancellation' && <CancellationPage />}
              {activePolicy === 'returns' && <ReturnsPage />}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: '#FAFAFB',
    borderTop: '1px solid #EAEAEA',
    padding: '60px 0 20px 0',
    marginTop: '60px',
    color: '#282C3F',
    fontFamily: 'Inter, sans-serif',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '40px',
    marginBottom: '40px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
  },
  heading: {
    fontSize: '0.85rem',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#282C3F',
    letterSpacing: '1px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  link: {
    color: '#696E79',
    textDecoration: 'none',
    fontSize: '0.95rem',
    transition: 'color 0.2s',
    cursor: 'pointer',
  },
  text: {
    color: '#696E79',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    marginBottom: '20px',
  },
  subscribeForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#696E79',
  },
  input: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    border: '1px solid #D4D5D9',
    borderRadius: '4px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  subscribeBtn: {
    backgroundColor: '#FF3F6C',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '4px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  socialIcons: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
  },
  socialIcon: {
    color: '#696E79',
    transition: 'color 0.2s',
  },
  trustBadges: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  trustBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    color: '#696E79',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  bottomBar: {
    borderTop: '1px solid #EAEAEA',
    paddingTop: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    color: '#696E79',
    fontSize: '0.9rem',
  },
  paymentMethods: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  paymentText: {
    fontWeight: '500',
  },
  paymentBadge: {
    backgroundColor: '#fff',
    border: '1px solid #EAEAEA',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#282C3F',
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
    maxWidth: '800px',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: '40px 20px',
    position: 'relative',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
    color: '#282c3f',
    textAlign: 'left'
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'var(--primary-glow)',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    zIndex: 10,
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
  },
  modalBodyScrollable: {
    width: '100%',
    height: '100%'
  }
};
