import React from 'react';

export const CancellationPage = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Cancellation Policy</h1>
      <div style={styles.content}>
        <p style={styles.text}>At Libora, we strive to make your shopping experience smooth and hassle-free.</p>
        
        <h3 style={styles.heading}>1. Order Cancellation</h3>
        <p style={styles.text}>You can cancel your order before it has been shipped. Once the order is shipped, it cannot be cancelled, but you may initiate a return upon receiving it.</p>
        
        <h3 style={styles.heading}>2. How to Cancel</h3>
        <p style={styles.text}>Navigate to your 'Orders' section, select the order you wish to cancel, and click the 'Cancel Order' button if available. If the button is not visible, the order may have already been dispatched.</p>

        <h3 style={styles.heading}>3. Refunds for Cancelled Orders</h3>
        <p style={styles.text}>If your order is successfully cancelled before shipment, the full amount will be refunded to your original payment method within 5-7 business days.</p>
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
