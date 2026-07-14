import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { API_URL } from '../config';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0.0 });
  const { token, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  
  useEffect(() => {
    if (token && user && user.role === 'buyer') {
      fetchCart();
    } else {
      setCart({ items: [], total: 0.0 });
    }
  }, [token, user]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1, selectedSize = null) => {
    if (!token) return { success: false, message: 'Please log in to add items to cart' };
    try {
      const res = await fetch(`${API_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: productId, quantity, selected_size: selectedSize })
      });
      
      const data = await res.json();
      if (res.ok) {
        setCart(data);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Failed to update cart' };
    }
  };

  const removeFromCart = async (cartItemId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/cart/${cartItemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        setCart(data);
      }
    } catch (err) {
      console.error('Error removing item from cart:', err);
    }
  };

  const clearCartState = () => {
    setCart({ items: [], total: 0.0 });
  };

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, removeFromCart, fetchCart, clearCartState }}>
      {children}
    </CartContext.Provider>
  );
};
