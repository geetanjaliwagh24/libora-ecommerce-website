import React from 'react';

export const TermsOfUsePage = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Terms of Use</h1>
      <div style={styles.content}>
        <p style={styles.text}>Welcome to Libora. By accessing or using our platform, you agree to comply with and be bound by these Terms of Use.</p>
        
        <h3 style={styles.heading}>1. Acceptance of Terms</h3>
        <p style={styles.text}>By creating an account and using our services, you accept these terms in full. If you disagree with any part of these terms, please do not use our website.</p>
        
        <h3 style={styles.heading}>2. User Conduct</h3>
        <p style={styles.text}>Users must not use the website in any way that causes, or may cause, damage to the website or impairment of the availability or accessibility of Libora.</p>

        <h3 style={styles.heading}>3. Intellectual Property</h3>
        <p style={styles.text}>All content, trademarks, and data on this website, including but not limited to software, databases, text, graphics, icons, hyperlinks, private information, designs and agreements, are the property of or licensed to Libora.</p>
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
