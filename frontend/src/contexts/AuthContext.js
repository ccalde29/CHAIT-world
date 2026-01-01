// ============================================================================
// Authentication Context
// frontend/src/contexts/AuthContext.js
// ============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error getting session:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setUser(session?.user || null);
        setLoading(false);
        setError(null);
      }
    );

    // Handle deep links for OAuth callback on mobile
    let appUrlListener;
    if (Capacitor.isNativePlatform()) {
      appUrlListener = App.addListener('appUrlOpen', async ({ url }) => {
        console.log('Deep link received:', url);
        
        // Check if this is an auth callback
        if (url.includes('auth/callback')) {
          try {
            // Parse the hash fragment to extract tokens
            const hashFragment = url.split('#')[1];
            console.log('Hash fragment:', hashFragment);
            
            if (hashFragment) {
              const params = new URLSearchParams(hashFragment);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              
              console.log('Tokens extracted:', { 
                hasAccessToken: !!accessToken, 
                hasRefreshToken: !!refreshToken 
              });
              
              if (accessToken && refreshToken) {
                console.log('Setting session from tokens...');
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                });
                
                if (error) {
                  console.error('Error setting session:', error);
                  setError(error.message);
                } else {
                  console.log('Session set successfully:', data.user?.email);
                  setUser(data.user);
                }
              } else {
                console.error('Missing tokens in URL');
              }
            } else {
              console.error('No hash fragment in URL');
            }
          } catch (err) {
            console.error('Error processing auth callback:', err);
            console.error('Error details:', err.message, err.stack);
            setError(err.message);
          }
        }
      });
    }

    return () => {
      subscription.unsubscribe();
      if (appUrlListener) {
        appUrlListener.remove();
      }
    };
  }, []);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setError(null);
      
      // Detect platform and set appropriate redirect URL
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative 
        ? 'chaitworld://auth/callback'
        : window.location.origin;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      setError(error.message);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error.message);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};