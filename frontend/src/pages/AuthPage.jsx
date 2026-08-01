import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, Mail, Phone, MapPin, Store, User, ArrowRight, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { API_URL } from '../config';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1); // 1: Contact Info (Phone + Email), 2: Email OTP, 3: Account & Role Details
  
  const [role, setRole] = useState('buyer'); // buyer, seller
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  
  // OTP state
  const [otpId, setOtpId] = useState(null);
  const [emailOtp, setEmailOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState(null);
  
  const [uiError, setUiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup, user, error: authError } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setSuccessMsg('Logged in successfully!');
      const timer = setTimeout(() => {
        if (user.role === 'admin') navigate('/admin-dashboard');
        else if (user.role === 'seller') navigate('/seller-dashboard');
        else navigate('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);
  
  const phoneRegex = /^\+[0-9]{1,3}[0-9]{4,14}$/;

  const handleSendEmailOtp = async (e) => {
    if (e) e.preventDefault();
    setUiError('');
    setSuccessMsg('');

    if (!phone) {
      setUiError('Phone number is required.');
      return;
    }
    if (!phoneRegex.test(phone)) {
      setUiError('Phone number must start with a country code (e.g. +91) followed by digits.');
      return;
    }
    if (!email) {
      setUiError('Email address is required.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, otp_id: otpId })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpId(data.otp_id);
        setSignupStep(2);
        setSuccessMsg('Verification code sent to your email address!');
      } else {
        setUiError(data.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setUiError('Connection failed. Please ensure the backend is running.');
    }
    setLoading(false);
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setUiError('');
    setSuccessMsg('');

    if (!emailOtp || emailOtp.trim().length === 0) {
      setUiError('Please enter the 6-digit verification code from your email.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_id: otpId, email_otp: emailOtp.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setVerificationToken(data.verification_token);
        setSignupStep(3);
        setSuccessMsg('Email verified successfully! Complete your account details below.');
      } else {
        setUiError(data.message || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setUiError('Connection failed. Please ensure the backend is running.');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiError('');
    setSuccessMsg('');

    if (isLogin) {
      if (!email || !password) {
        setUiError('Email and Password are required.');
        return;
      }
      setLoading(true);
      const res = await login(email, password);
      setLoading(false);
      if (!res.success) {
        setUiError(res.message || 'Login failed.');
      }
    } else {
      if (signupStep !== 3) return;

      if (!password) {
        setUiError('Password is required.');
        return;
      }

      if (password.length < 8) {
        setUiError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[0-9]/.test(password)) {
        setUiError('Password must contain at least one number.');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setUiError('Password must contain at least one uppercase letter.');
        return;
      }
      if (!/[a-z]/.test(password)) {
        setUiError('Password must contain at least one lowercase letter.');
        return;
      }

      if (role === 'seller' && !businessName.trim()) {
        setUiError('Business Name is required for seller accounts.');
        return;
      }

      const signupData = {
        email,
        password,
        role,
        phone,
        address,
        verification_token: verificationToken
      };

      if (role === 'seller') {
        signupData.business_name = businessName.trim();
        signupData.gstin = gstin.trim();
        signupData.bank_details = bankDetails.trim();
      }
      
      setLoading(true);
      const res = await signup(signupData);
      setLoading(false);
      
      if (res.success) {
        setSuccessMsg('Account created successfully! Please sign in with your credentials.');
        setIsLogin(true);
        setSignupStep(1);
        setPassword('');
        setEmailOtp('');
        setVerificationToken(null);
      } else {
        setUiError(res.message || 'Registration failed.');
      }
    }
  };

  const renderSignupStep1 = () => (
    <form onSubmit={handleSendEmailOtp} style={styles.form}>
      <div style={styles.inputContainer}>
        <Phone size={18} style={styles.inputIcon} />
        <input
          type="tel"
          placeholder="Phone Number (+91XXXXXXXXXX)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="cyber-input"
          style={styles.inputField}
          required
        />
      </div>

      <div style={styles.inputContainer}>
        <Mail size={18} style={styles.inputIcon} />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="cyber-input"
          style={styles.inputField}
          required
        />
      </div>

      <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
        {loading ? 'Sending Verification Code...' : 'Send Verification Code'}
        <ArrowRight size={18} style={{ marginLeft: '6px' }} />
      </button>
    </form>
  );

  const renderSignupStep2 = () => (
    <form onSubmit={handleVerifyEmailOtp} style={styles.form}>
      <div style={styles.stepInfoBox}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          A 6-digit verification code was sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
        </p>
      </div>

      <div style={styles.inputContainer}>
        <ShieldCheck size={18} style={styles.inputIcon} />
        <input
          type="text"
          maxLength={6}
          placeholder="Enter 6-Digit Email OTP"
          value={emailOtp}
          onChange={(e) => setEmailOtp(e.target.value)}
          className="cyber-input"
          style={{ ...styles.inputField, letterSpacing: '4px', fontSize: '1.1rem', fontWeight: '600' }}
          required
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => {
            setSignupStep(1);
            setUiError('');
            setSuccessMsg('');
          }}
          style={styles.secondaryBtn}
          disabled={loading}
        >
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back
        </button>

        <button type="submit" className="btn-primary" style={{ ...styles.submitBtn, flex: 2, marginTop: 0 }} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify Email'}
          <ArrowRight size={18} style={{ marginLeft: '6px' }} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <button
          type="button"
          onClick={(e) => handleSendEmailOtp(e)}
          style={styles.resendBtn}
          disabled={loading}
        >
          <RefreshCw size={14} style={{ marginRight: '4px' }} /> Resend Code
        </button>
      </div>
    </form>
  );

  const renderSignupStep3 = () => (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.roleToggleGroup}>
        <button
          type="button"
          onClick={() => setRole('buyer')}
          style={{ ...styles.roleToggleBtn, ...(role === 'buyer' ? styles.roleToggleActive : {}) }}
        >
          <User size={16} /> Buyer
        </button>
        <button
          type="button"
          onClick={() => setRole('seller')}
          style={{ ...styles.roleToggleBtn, ...(role === 'seller' ? styles.roleToggleActive : {}) }}
        >
          <Store size={16} /> Seller
        </button>
      </div>

      <div style={styles.inputContainer}>
        <Lock size={18} style={styles.inputIcon} />
        <input
          type="password"
          placeholder="Password (min 8 chars, 1 uppercase, 1 number)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="cyber-input"
          style={styles.inputField}
          required
        />
      </div>

      <div style={styles.inputContainer}>
        <MapPin size={18} style={styles.inputIcon} />
        <input
          type="text"
          placeholder="Delivery Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="cyber-input"
          style={styles.inputField}
          required={role === 'buyer'}
        />
      </div>

      {role === 'seller' && (
        <div style={styles.sellerSection} className="glass-panel">
          <h4 style={styles.sellerSecTitle}>Business KYC Details</h4>
          <input
            type="text"
            placeholder="Business / Shop Name *"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="cyber-input"
            style={{ ...styles.inputField, marginBottom: '12px' }}
            required={role === 'seller'}
          />
          <input
            type="text"
            placeholder="GSTIN Number (15-digit)"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            className="cyber-input"
            style={{ ...styles.inputField, marginBottom: '12px' }}
          />
          <input
            type="text"
            placeholder="Bank Details (Bank, Acct, IFSC)"
            value={bankDetails}
            onChange={(e) => setBankDetails(e.target.value)}
            className="cyber-input"
            style={styles.inputField}
          />
        </div>
      )}

      <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
        {loading ? 'Creating Account...' : 'Complete Signup'}
        <ArrowRight size={18} style={{ marginLeft: '6px' }} />
      </button>
    </form>
  );

  const getSubtitle = () => {
    if (isLogin) {
      return 'Sign in to access your secure shopping experience';
    }
    if (signupStep === 1) {
      return 'Step 1: Enter your phone number & email address';
    }
    if (signupStep === 2) {
      return 'Step 2: Enter the verification code sent to your email';
    }
    return 'Step 3: Choose your account type & complete profile';
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.formCard} className="glass-panel">
        <h2 style={styles.title}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
          <span style={{ color: 'var(--secondary)' }}>.</span>
        </h2>
        <p style={styles.subtitle}>
          {getSubtitle()}
        </p>

        {(uiError || authError) && <div style={styles.errorAlert}>{uiError || authError}</div>}
        {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

        {isLogin ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputContainer}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cyber-input"
                style={styles.inputField}
                required
              />
            </div>
            <div style={styles.inputContainer}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cyber-input"
                style={styles.inputField}
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
              <ArrowRight size={18} style={{ marginLeft: '6px' }} />
            </button>
          </form>
        ) : (
          <>
            {signupStep === 1 && renderSignupStep1()}
            {signupStep === 2 && renderSignupStep2()}
            {signupStep === 3 && renderSignupStep3()}
          </>
        )}

        <div style={styles.switchMode}>
          <span>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setSignupStep(1);
              setUiError('');
              setSuccessMsg('');
              setEmailOtp('');
              setVerificationToken(null);
            }}
            style={styles.switchBtn}
          >
            {isLogin ? 'Sign Up here' : 'Sign In here'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '40px 20px' },
  formCard: { width: '100%', maxWidth: '480px', padding: '40px 30px', background: 'var(--surface)', borderRadius: '24px', border: '1px solid rgba(138, 43, 226, 0.25)', backdropFilter: 'var(--glass-blur)' },
  title: { fontSize: '2rem', fontWeight: '800', marginBottom: '8px', textAlign: 'center' },
  subtitle: { fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '30px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  stepInfoBox: { padding: '12px 16px', background: 'rgba(138, 43, 226, 0.08)', borderRadius: '10px', border: '1px solid rgba(138, 43, 226, 0.2)', textAlign: 'center' },
  roleToggleGroup: { display: 'flex', background: 'var(--bg-app)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-color)', marginBottom: '8px' },
  roleToggleBtn: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '10px', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.2s ease' },
  roleToggleActive: { background: 'var(--grad-primary)', color: 'var(--text-light)', boxShadow: '0 4px 12px rgba(138, 43, 226, 0.3)' },
  inputContainer: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '16px', color: 'var(--text-muted)', pointerEvents: 'none' },
  inputField: { width: '100%', paddingLeft: '48px', fontSize: '0.95rem' },
  sellerSection: { padding: '16px', borderRadius: '12px', background: 'rgba(92, 77, 177, 0.05)', border: '1px solid rgba(138, 43, 226, 0.15)', marginBottom: '5px' },
  sellerSecTitle: { fontSize: '0.85rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', marginBottom: '12px' },
  submitBtn: { width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '10px', marginTop: '10px', display: 'flex', alignItems: 'center' },
  secondaryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 20px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' },
  resendBtn: { background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'underline' },
  errorAlert: { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(255, 23, 68, 0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '20px', fontWeight: '500', textAlign: 'center' },
  successAlert: { background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(0, 230, 118, 0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '20px', fontWeight: '500', textAlign: 'center' },
  switchMode: { marginTop: '25px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' },
  switchBtn: { background: 'none', border: 'none', color: 'var(--secondary)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }
};
