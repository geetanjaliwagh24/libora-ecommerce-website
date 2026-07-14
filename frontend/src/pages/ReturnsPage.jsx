import React from 'react';

export const ReturnsPage = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Return Policy</h1>
      <div style={styles.content}>
        <p style={styles.text}>We want you to love what you ordered, but if something isn't right, let us know.</p>
        
        <h3 style={styles.heading}>1. Eligibility for Returns</h3>
        <p style={styles.text}>Items can be returned within 14 days of delivery. The items must be unused, unwashed, and in their original condition with all tags attached.</p>
        
        <h3 style={styles.heading}>2. How to Return</h3>
        <p style={styles.text}>Go to your 'Orders' page, select the item you want to return, and follow the instructions to schedule a pickup or drop-off.</p>

        <h3 style={styles.heading}>3. Processing Refunds</h3>
        <p style={styles.text}>Once we receive your return, we will inspect the item and process your refund within 7-10 business days. Refunds will be issued to your original payment method.</p>
        
        <h3 style={styles.heading}>4. Non-Returnable Items</h3>
        <p style={styles.text}>Certain items such as undergarments, personalized items, and clearance sale items are non-returnable due to hygiene and policy reasons.</p>
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
