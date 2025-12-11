import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isInitialized = useRef(false);

  // Initialize authentication only once when component mounts
  useEffect(() => {
    const initAuth = async () => {
      // Prevent multiple initializations
      if (isInitialized.current) {
        return;
      }
      
      isInitialized.current = true;
      console.log('Initializing authentication...');
      
      try {
        // Only check if user is authenticated, don't force CSRF token retrieval
        // The CSRF token will be handled automatically by the browser/API
        console.log('Checking user authentication...');
        const response = await authAPI.getUser();
        console.log('User authenticated:', response.data);
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.log('Auth check failed:', error.response?.status || error.message);
        // User is not authenticated - this is expected on first load
        // Only set to false if it's actually an auth error, not a network error
        if (error.response?.status === 401) {
          setUser(null);
          setIsAuthenticated(false);
          console.log('User not authenticated, setting auth state to false');
        } else {
          console.log('Network or other error, keeping current auth state');
          // Don't change auth state for network errors
        }
      } finally {
        setLoading(false);
        console.log('Auth initialization complete');
      }
    };
    
    // Use setTimeout to defer initialization to avoid React's strict mode double-rendering
    const timeoutId = setTimeout(initAuth, 0);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      const response = await authAPI.login(username, password);
      
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        toast.success('Login successful!');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Even if logout fails on server, clear local state
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      // Reset initialization flag on logout
      isInitialized.current = false;
      toast.success('Logged out successfully');
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};