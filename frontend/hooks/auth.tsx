'use client';

import { create } from 'zustand';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (data: { email: string; password: string; name?: string }) => Promise<void>;
  register: (data: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => void;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials: { email: string; password: string }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.access_token || data.token);
        localStorage.setItem('user', JSON.stringify(data.user || { email: credentials.email }));
      }

      set({
        user: data.user || { email: credentials.email },
        token: data.access_token || data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  signup: async (data: { email: string; password: string; name?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Registration failed');
      }

      const result = await response.json();
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', result.access_token || result.token);
        localStorage.setItem('user', JSON.stringify(result.user || { email: data.email }));
      }

      set({
        user: result.user || { email: data.email },
        token: result.access_token || result.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (data: { email: string; password: string; name?: string }) => {
    // Alias for signup
    return get().signup(data);
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  clearError: () => {
    set({ error: null });
  },

  checkAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (token && user) {
        set({ token, user, isAuthenticated: true });
      }
    }
  },
}));

// Context and Provider
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthStore();
  
  useEffect(() => {
    auth.checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
