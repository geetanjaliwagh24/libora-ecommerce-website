import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AIStylistChat } from './components/AIStylistChat';
import { BuyerHome } from './pages/BuyerHome';
import { BuyerWishlist } from './pages/BuyerWishlist';
import { ProductDetails } from './pages/ProductDetails';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { BuyerOrders } from './pages/BuyerOrders';
import { SellerDashboard } from './pages/SellerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SocialFeed } from './pages/SocialFeed';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { FAQPage } from './pages/FAQPage';
import { TermsOfUsePage } from './pages/TermsOfUsePage';
import { TermsAndConditionsPage } from './pages/TermsAndConditionsPage';
import { CancellationPage } from './pages/CancellationPage';
import { ReturnsPage } from './pages/ReturnsPage';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <Router>
            <div style={styles.appContainer}>
              <Navbar />
              <main style={styles.mainContent}>
                <Routes>
                  <Route path="/" element={<BuyerHome />} />
                  <Route path="/wishlist" element={<ProtectedRoute allowedRoles={['buyer']}><BuyerWishlist /></ProtectedRoute>} />
                  <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<ProtectedRoute allowedRoles={['buyer']}><CartPage /></ProtectedRoute>} />
                  <Route path="/checkout" element={<ProtectedRoute allowedRoles={['buyer']}><CheckoutPage /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute allowedRoles={['buyer']}><BuyerOrders /></ProtectedRoute>} />
                  <Route path="/seller-dashboard" element={<ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>} />
                  <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/feed" element={<SocialFeed />} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/terms-of-use" element={<TermsOfUsePage />} />
                  <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
                  <Route path="/cancellation" element={<CancellationPage />} />
                  <Route path="/returns" element={<ReturnsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
              <AIStylistChat />
            </div>
          </Router>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  mainContent: {
    flex: 1,
    paddingBottom: '60px',
  }
};

export default App;
