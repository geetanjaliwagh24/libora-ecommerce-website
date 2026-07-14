import React, { createContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setError(null);
      } else {
        // Token might be invalid/expired
        logout();
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Could not connect to auth server');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        setError(data.message || 'Login failed');
        return { success: false, message: data.message };
      }
    } catch (err) {
      setError('Connection failed. Please check if backend is running.');
      return { success: false, message: 'Connection failed' };
    }
  };

  const signup = async (signupData) => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signupData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        return { success: true };
      } else {
        setError(data.message || 'Signup failed');
        return { success: false, message: data.message };
      }
    } catch (err) {
      setError('Connection failed. Please check if backend is running.');
      return { success: false, message: 'Connection failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const submitKyc = async (kycData) => {
    try {
      const res = await fetch(`${API_URL}/seller/kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(kycData)
      });
      
      const data = await res.json();
      if (res.ok) {
        // Refresh user profile to reflect submitted KYC
        await fetchUserProfile();
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Connection failed' };
    }
  };

  const deleteAccount = async (password) => {
    try {
      const res = await fetch(`${API_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      if (res.ok) {
        logout();
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Failed to delete account' };
      }
    } catch (err) {
      return { success: false, message: 'Connection failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, error, login, signup, logout, submitKyc, deleteAccount, refreshProfile: fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
