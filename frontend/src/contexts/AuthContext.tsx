'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { EncryptionManager } from '@/lib/encryption';

interface User {
  id: string;
  email: string;
  username: string;
  is_2fa_enabled: boolean;
  encryption_salt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Verify token is still valid
      verifyToken(storedToken);
    }
    
    setIsLoading(false);
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token is invalid, clear auth state
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    }
  };

  const login = async (email: string, password: string, totpCode?: string) => {
    const response = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, totp_code: totpCode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    
    setToken(data.access_token);
    setUser(data.user);
    
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    
    // Initialize encryption with user password and salt
    if (data.user.encryption_salt) {
      try {
        const encryptionManager = EncryptionManager.getInstance();
        await encryptionManager.initialize(password, data.user.encryption_salt);
        console.log('✅ E2E Encryption initialized');
      } catch (error) {
        console.error('Failed to initialize encryption:', error);
      }
    }
  };

  const register = async (email: string, username: string, password: string) => {
    const response = await fetch('http://localhost:8000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    
    setToken(data.access_token);
    setUser(data.user);
    
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    
    // Initialize encryption for new user
    if (data.user.encryption_salt) {
      try {
        const encryptionManager = EncryptionManager.getInstance();
        await encryptionManager.initialize(password, data.user.encryption_salt);
        console.log('✅ E2E Encryption initialized for new user');
      } catch (error) {
        console.error('Failed to initialize encryption:', error);
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    // Clear encryption key from memory
    const encryptionManager = EncryptionManager.getInstance();
    encryptionManager.clear();
    console.log('🔐 Encryption key cleared');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to get auth headers for API requests
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
