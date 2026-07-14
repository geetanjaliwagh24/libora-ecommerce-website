import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { API_URL } from '../config';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { user } = useContext(AuthContext);
  
  
  useEffect(() => {
    if (user && user.role === 'buyer') {
      fetchWishlist();
    } else {
      setWishlist([]);
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_URL}/wishlist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWishlist(data);
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    }
  };

  const addToWishlist = async (productId) => {
    if (!user) return { success: false, message: 'Please login first' };
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: productId })
      });
      
      if (res.ok) {
        await fetchWishlist();
        return { success: true };
      }
      const data = await res.json();
      return { success: false, message: data.message || 'Failed to add to wishlist' };
    } catch (err) {
      return { success: false, message: 'Network error' };
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!user) return { success: false, message: 'Please login first' };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/wishlist/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        await fetchWishlist();
        return { success: true };
      }
      const data = await res.json();
      return { success: false, message: data.message || 'Failed to remove from wishlist' };
    } catch (err) {
      return { success: false, message: 'Network error' };
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item.product_id === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};
