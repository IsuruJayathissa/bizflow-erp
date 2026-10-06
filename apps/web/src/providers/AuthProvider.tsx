'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, AuthResponse } from '@/services/auth.service';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<AuthResponse>;
  register: (data: any) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = authService.getStoredUser();
    const token = authService.getToken();

    if (token && storedUser) {
      setUser(storedUser);
      // Verify token freshness against server in background
      authService
        .getProfile()
        .then((profile) => {
          setUser(profile);
          localStorage.setItem('bizflow_user', JSON.stringify(profile));
        })
        .catch(() => {
          // Token expired or invalid
          setUser(null);
          localStorage.removeItem('bizflow_token');
          localStorage.removeItem('bizflow_user');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const response = await authService.register(data);
      setUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    router.push('/login');
  };

  const refreshProfile = async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      localStorage.setItem('bizflow_user', JSON.stringify(profile));
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
