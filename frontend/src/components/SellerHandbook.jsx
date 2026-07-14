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
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>2. Setting Up Your Store & KYC</h2>
          <p>A complete and trustworthy store profile attracts more buyers.</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Store Name & Logo:</strong> Ensure your brand name is spelled correctly and upload a high-quality logo.</li>
            <li><strong>KYC Verification:</strong> Submit your business documents via the dashboard to remove selling caps and gain a "Verified" badge.</li>
            <li><strong>Contact Information:</strong> Keep your customer service email and phone number up to date so buyers can reach you if needed.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>3. Managing Your Products, Groups & Sizes</h2>
          <p>Libora features dynamic categories (Fashion, Electronics, Cosmetics, etc.). Properly categorizing your items is crucial for visibility.</p>
          
          <h3 style={{ marginTop: '15px' }}>Grouping Products (The "Group ID")</h3>
          <p>If you sell the same product in multiple colors (e.g., a T-shirt in Red, Blue, and Green), you should link them together using a <strong>Group ID</strong>. When listing these products, give them all the <strong>exact same Group ID string</strong> (e.g., <code>TSHIRT-V1</code>). Libora will automatically group them on the product page, allowing buyers to seamlessly click between the color variants!</p>

          <h3 style={{ marginTop: '15px' }}>Handling Sizes</h3>
          <p>When you create a product in an apparel or footwear category, the system will automatically prompt you for sizes.</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Specific Sizes:</strong> Enter the stock quantity for each size (e.g., XS, S, M, L). If you don't have stock for a specific size, leave it as 0.</li>
            <li><strong>Free Size:</strong> If the item is one-size-fits-all (like a scarf or a handbag), check the "Free Size" box and just enter the total stock.</li>
          </ul>

          <h3 style={{ marginTop: '15px' }}>Editing & Deleting</h3>
          <p>You can update stock, change prices, or edit descriptions at any time from the <strong>Products</strong> list. If a product is permanently discontinued, you can delete it or mark it as inactive.</p>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>4. Order Management & Returns</h2>
          <p>When a customer places an order, it will appear in your <strong>Orders</strong> tab.</p>
          <ol style={{ paddingLeft: '20px' }}>
            <li><strong>Order Status:</strong> Keep your buyers informed by updating the order status (Processing → Shipped → Delivered).</li>
            <li><strong>Buyer Messaging (14-Day Limit):</strong> Buyers can message you directly from their orders page. However, this is restricted to an active order window and up to <strong>14 days post-delivery</strong>. Respond promptly to maintain a high seller rating!</li>
            <li><strong>Handling Returns:</strong> Buyers can request a return strictly within <strong>14 days</strong> of the delivery date. When they do, they are required to submit a <strong>Return Reason</strong> (e.g., "Defective", "Wrong Size", etc.). You will see this reason explicitly listed on the order in your Fulfillment Queue—use this valuable feedback to improve your future listings and sizing charts!</li>
          </ol>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>5. Style Coins & Sponsored Ads 🪙</h2>
          <p><strong>Style Coins</strong> are Libora's premium internal currency that give you powerful marketing tools to boost your store's visibility.</p>
          
          <h3 style={{ marginTop: '15px' }}>How Style Coins Help (Sponsored Banners)</h3>
          <p>You can spend Style Coins to purchase <strong>Sponsored Banners</strong> that appear directly on the Libora Homepage. This acts as prime real estate to showcase your brand, highlight a massive sale, or feature a new collection to thousands of daily visitors!</p>
          
          <h3 style={{ marginTop: '15px' }}>How to Earn Style Coins</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Without Money (Organically):</strong> You can earn Style Coins organically as rewards for platform engagement. Examples include maintaining a high seller rating, keeping return rates exceptionally low, participating in platform events, or having buyers use your promo codes.</li>
            <li><strong>With Money (Top-Ups):</strong> If you want to run an immediate marketing campaign and don't have enough coins, you can purchase Style Coin top-ups directly from the platform using real money (e.g., via Razorpay).</li>
          </ul>
        </section>

        <section>
          <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--secondary)' }}>6. Payments & Earnings (Razorpay)</h2>
          <p>Libora uses <strong>Razorpay</strong> to ensure 100% secure, production-ready payments.</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>How you get paid:</strong> When a buyer purchases your product, the payment is securely processed. Your earnings (minus any marketplace commissions) will be credited to your registered bank account during the platform's standard payout cycle.</li>
            <li><strong>Transparency:</strong> You can view a complete history of your transactions, successful payments, and pending payouts in the <strong>Earnings</strong> tab.</li>
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
