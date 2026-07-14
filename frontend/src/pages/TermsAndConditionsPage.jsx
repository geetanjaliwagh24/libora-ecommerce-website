import React from 'react';

export const TermsAndConditionsPage = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Terms & Conditions</h1>
      <div style={styles.content}>
        <p style={styles.text}>These Terms and Conditions govern your use of Libora and the purchase of products from it.</p>
        
        <h3 style={styles.heading}>1. Product Information</h3>
        <p style={styles.text}>We make every effort to display as accurately as possible the colors and images of our products that appear at the store. We cannot guarantee that your computer monitor's display of any color will be accurate.</p>
        
        <h3 style={styles.heading}>2. Pricing and Payment</h3>
        <p style={styles.text}>Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time. We process payments securely via Razorpay.</p>

        <h3 style={styles.heading}>3. StyleCoins</h3>
        <p style={styles.text}>StyleCoins hold no cash value outside of the Libora ecosystem. They are purely for promotional discounts on our platform and can be modified or revoked at our discretion.</p>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '800px', margin: '0', padding: '0 20px', fontFamily: 'Inter, sans-serif' },
  title: { fontSize: '2rem', marginBottom: '30px', color: '#FF3F6C' },
  content: { display: 'flex', flexDirection: 'column', gap: '15px' },
  heading: { fontSize: '1.2rem', marginTop: '20px', marginBottom: '10px', color: '#FF3F6C' },
  text: { color: '#696E79', lineHeight: '1.6', margin: 0 }
};
