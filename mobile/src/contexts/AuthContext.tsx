import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';
import { encryptionService } from '../services/encryption';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Verify token is still valid
        await verifyToken(storedToken);
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyToken = async (token: string) => {
    try {
      await apiService.getMe();
    } catch (error) {
      console.error('Token verification failed:', error);
      await logout();
    }
  };

  const login = async (email: string, password: string, totpCode?: string) => {
    try {
      const data = await apiService.login(email, password, totpCode);

      setToken(data.access_token);
      setUser(data.user);

      await AsyncStorage.setItem('auth_token', data.access_token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));

      // Initialize encryption
      if (data.user.encryption_salt) {
        try {
          await encryptionService.initialize(password, data.user.encryption_salt);
          console.log('✅ E2E Encryption initialized');
        } catch (error) {
          console.error('Failed to initialize encryption:', error);
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const data = await apiService.register(email, username, password);

      setToken(data.access_token);
      setUser(data.user);

      await AsyncStorage.setItem('auth_token', data.access_token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));

      // Initialize encryption for new user
      if (data.user.encryption_salt) {
        try {
          await encryptionService.initialize(password, data.user.encryption_salt);
          console.log('✅ E2E Encryption initialized for new user');
        } catch (error) {
          console.error('Failed to initialize encryption:', error);
        }
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);

    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');

    encryptionService.clear();
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
