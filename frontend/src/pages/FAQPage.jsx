import React from 'react';

export const FAQPage = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Frequently Asked Questions</h1>
      <div style={styles.content}>
        <div style={styles.section}>
          <h3 style={styles.heading}>1. What is Libora?</h3>
          <p style={styles.text}>Libora is an AI-powered fashion and lifestyle marketplace that offers a curated selection of products.</p>
        </div>
        <div style={styles.section}>
          <h3 style={styles.heading}>2. How do StyleCoins work?</h3>
          <p style={styles.text}>StyleCoins are our reward points. You can use them for discounts during checkout when you accumulate 100 or more coins (100 coins = 1 Rupee).</p>
        </div>
        <div style={styles.section}>
          <h3 style={styles.heading}>3. What payment methods are accepted?</h3>
          <p style={styles.text}>We accept all major credit/debit cards, UPI, and net banking via our secure Razorpay integration.</p>
        </div>
        <div style={styles.section}>
          <h3 style={styles.heading}>4. How can I track my order?</h3>
          <p style={styles.text}>You can track your order by navigating to the "Orders" section in your profile.</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '800px', margin: '0', padding: '0 20px', fontFamily: 'Inter, sans-serif' },
  title: { fontSize: '2rem', marginBottom: '30px', color: '#FF3F6C' },
  content: { display: 'flex', flexDirection: 'column', gap: '20px' },
  section: { backgroundColor: '#FAFAFB', padding: '20px', borderRadius: '8px' },
  heading: { fontSize: '1.1rem', marginBottom: '10px', color: '#FF3F6C' },
  text: { color: '#696E79', lineHeight: '1.6', margin: 0 }
};
