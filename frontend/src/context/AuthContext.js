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
  const [csrfTokenReady, setCsrfTokenReady] = useState(false);
  const isInitialized = useRef(false);

  // Initialize authentication only once when component mounts
  useEffect(() => {
    const initAuth = async () => {
      // Prevent multiple initializations
      if (isInitialized.current) {
        console.log('AuthContext: Initialization already in progress, skipping');
        return;
      }

      isInitialized.current = true;
      console.log('AuthContext: Starting authentication initialization...');

      try {
        // Step 1: Initialize CSRF token by making a GET request to establish session
        console.log('AuthContext: Fetching CSRF token from /api/auth/csrf-token/...');
        const csrfResponse = await authAPI.getCsrfToken();
        console.log('AuthContext: CSRF token response:', csrfResponse.data);
        console.log('AuthContext: CSRF token initialized successfully');
        setCsrfTokenReady(true);

        // Step 2: Check if user is authenticated
        console.log('AuthContext: Checking user authentication status...');
        const response = await authAPI.getUser();
        console.log('AuthContext: User authentication check successful:', response.data);
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.log('AuthContext: Auth check failed:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          data: error.response?.data
        });

        // Check if it's a CSRF error specifically
        if (error.response?.status === 403) {
          console.log('AuthContext: CSRF verification failed (403), attempting retry...');
          try {
            // Retry CSRF token initialization
            console.log('AuthContext: Retrying CSRF token fetch...');
            const retryCsrfResponse = await authAPI.getCsrfToken();
            console.log('AuthContext: CSRF retry response:', retryCsrfResponse.data);
            setCsrfTokenReady(true);

            // Retry user check
            console.log('AuthContext: Retrying user authentication check...');
            const response = await authAPI.getUser();
            setUser(response.data);
            setIsAuthenticated(true);
            console.log('AuthContext: Authentication successful after CSRF retry');
          } catch (retryError) {
            console.log('AuthContext: Authentication failed after CSRF retry:', {
              status: retryError.response?.status,
              message: retryError.message,
              url: retryError.config?.url
            });
            setUser(null);
            setIsAuthenticated(false);
          }
        } else if (error.response?.status === 401) {
          // User is not authenticated - this is expected on first load
          setUser(null);
          setIsAuthenticated(false);
          console.log('AuthContext: User not authenticated (401), this is expected on first load');
        } else {
          console.log('AuthContext: Network or other error during auth check, keeping current auth state');
          // Don't change auth state for network errors
        }
      } finally {
        setLoading(false);
        console.log('AuthContext: Auth initialization complete, loading set to false');
      }
    };

    // Use setTimeout to defer initialization to avoid React's strict mode double-rendering
    console.log('AuthContext: Scheduling auth initialization with 100ms delay');
    const timeoutId = setTimeout(initAuth, 100);

    return () => {
      console.log('AuthContext: Cleanup - clearing initialization timeout');
      clearTimeout(timeoutId);
    };
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      console.log('AuthContext: Login attempt for user:', username);

      // Ensure CSRF token is ready before login
      if (!csrfTokenReady) {
        console.log('AuthContext: CSRF token not ready before login, initializing...');
        const csrfResponse = await authAPI.getCsrfToken();
        console.log('AuthContext: CSRF token initialized for login:', csrfResponse.data);
        setCsrfTokenReady(true);
      } else {
        console.log('AuthContext: CSRF token already ready for login');
      }

      console.log('AuthContext: Making login API call...');
      const response = await authAPI.login(username, password);
      console.log('AuthContext: Login response:', response.data);

      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        console.log('AuthContext: Login successful, user set:', response.data.user.username);
        toast.success('Login successful!');
        return { success: true };
      } else {
        console.log('AuthContext: Login response missing user data');
      }
    } catch (error) {
      console.log('AuthContext: Login failed:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
      console.log('AuthContext: Login process complete, loading set to false');
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
      setCsrfTokenReady(false);
      // Reset initialization flag on logout
      isInitialized.current = false;
      toast.success('Logged out successfully');
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    csrfTokenReady,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};