import React from 'react';

export const SellerHandbook = () => {
  return (
    <div className="glass-panel" style={{ padding: '30px', borderRadius: '12px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '20px' }}>🛍️ Libora: The Ultimate Seller Handbook</h1>
      <p style={{ fontSize: '1.1rem', marginBottom: '30px' }}>
        Welcome to the <strong>Libora Marketplace</strong>! We are thrilled to have you onboard as a seller. Libora is a modern, AI-powered e-commerce platform designed to help you reach more customers, provide personalized shopping experiences through our AI Stylist, and grow your business seamlessly.
      </p>

      <div style={{ display: 'grid', gap: '30px' }}>
        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>1. Getting Started</h2>
          <h3 style={{ marginTop: '15px' }}>Registration and Approval</h3>
          <p>To start selling on Libora, you first need a registered Seller Account.</p>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Navigate to the <strong>Libora Sign-Up Page</strong>.</li>
            <li>Select <strong>"Register as a Seller"</strong>.</li>
            <li>Fill in your business details, email, and contact information.</li>
            <li>Once submitted, your account may require approval from the Marketplace Admin. You will receive an SMS/Email notification (via Twilio) once your account is active.</li>
          </ol>
          <h3 style={{ marginTop: '15px' }}>Logging In</h3>
          <p>Once approved, log in using your credentials to access the <strong>Seller Dashboard</strong>—your central hub for managing your entire business on Libora.</p>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>2. Setting Up Your Store</h2>
          <p>A complete and trustworthy store profile attracts more buyers.</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Store Name & Logo:</strong> Ensure your brand name is spelled correctly and upload a high-quality logo.</li>
            <li><strong>Store Description:</strong> Write a brief, compelling description of what you sell.</li>
            <li><strong>Contact Information:</strong> Keep your customer service email and phone number up to date so buyers can reach you if needed.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>3. Managing Your Products</h2>
          <p>Libora features dynamic categories (Fashion, Electronics, Cosmetics, etc.). Properly categorizing your items is crucial for visibility.</p>
          <h3 style={{ marginTop: '15px' }}>Adding a New Product</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Go to the <strong>Products</strong> tab in your dashboard and click <strong>"Add New Product"</strong>.</li>
            <li><strong>Product Details:</strong> Enter a clear Title, detailed Description, and the Price.</li>
            <li><strong>Categories:</strong> Select the most accurate category and sub-category.</li>
            <li><strong>Inventory:</strong> Input your available stock quantity.</li>
            <li><strong>Images:</strong> Upload high-resolution images. Good images drastically increase conversion rates!</li>
          </ol>
          <h3 style={{ marginTop: '15px' }}>Editing & Deleting</h3>
          <p>You can update stock, change prices, or edit descriptions at any time from the <strong>Products</strong> list. If a product is permanently discontinued, you can delete it or mark it as inactive.</p>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>4. Order Management & Fulfillment</h2>
          <p>When a customer places an order, it will appear in your <strong>Orders</strong> tab.</p>
          <ol style={{ paddingLeft: '20px' }}>
            <li><strong>New Orders:</strong> Check this tab daily. You will see the buyer's details, shipping address, and the products ordered.</li>
            <li><strong>Order Status:</strong> Keep your buyers informed by updating the order status:
              <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                <li><em>Processing:</em> You are preparing the item.</li>
                <li><em>Shipped:</em> The item has been handed to the courier. (Make sure to provide tracking details if applicable!)</li>
                <li><em>Delivered:</em> The item has reached the buyer.</li>
              </ul>
            </li>
            <li><strong>Cancellations & Returns:</strong> Handle customer return requests promptly through the dashboard to maintain a high seller rating.</li>
          </ol>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>5. Payments & Earnings (Razorpay)</h2>
          <p>Libora uses <strong>Razorpay</strong> to ensure 100% secure, production-ready payments.</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>How you get paid:</strong> When a buyer purchases your product, the payment is securely processed. Your earnings (minus any marketplace commissions) will be credited to your registered bank account during the platform's standard payout cycle.</li>
            <li><strong>Transparency:</strong> You can view a complete history of your transactions, successful payments, and pending payouts in the <strong>Earnings</strong> tab.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>6. Smart Analytics & Dashboard</h2>
          <p>Your Seller Dashboard provides real-time data to help you make informed business decisions:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Sales Metrics:</strong> View your total revenue, daily sales, and top-selling products.</li>
            <li><strong>Order Tracking:</strong> Monitor the ratio of completed vs. pending orders.</li>
            <li><strong>Fraud Detection:</strong> Libora includes smart metrics to flag potentially fraudulent transactions, keeping your business safe.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>7. Optimizing for the AI Stylist 🤖</h2>
          <p>One of Libora's standout features is the <strong>AI Stylist</strong>, powered by advanced AI models. The Stylist helps buyers find products based on their personalized prompts (e.g., <em>"I need a summer outfit for a beach wedding"</em>).</p>
          <p style={{ marginTop: '10px', fontWeight: 'bold' }}>How to make the AI recommend YOUR products:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Rich Descriptions:</strong> The AI reads your product descriptions! Use rich, descriptive keywords. Instead of just <em>"Red Dress"</em>, use <em>"Flowy red summer maxi dress, perfect for beach weddings and evening parties, made of breathable cotton."</em></li>
            <li><strong>Accurate Tags:</strong> If the platform supports tagging, use relevant seasonal and stylistic tags.</li>
            <li><strong>Clear Categorization:</strong> Ensure your items are in the exact right nested category so the AI can filter them correctly.</li>
          </ul>
        </section>
      </div>
      
      <div style={{ marginTop: '40px', padding: '20px', background: 'var(--bg-app)', borderRadius: '8px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Need more help?</p>
        <p style={{ margin: '0 0 10px 0' }}>Contact the Libora Admin Support team via your dashboard.</p>
        <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--primary)' }}>Happy Selling on Libora!</p>
      </div>
    </div>
  );
};
