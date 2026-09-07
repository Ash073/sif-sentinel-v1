'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/types/api';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('sif_token');
      if (token) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
        } catch {
          // Token is invalid or expired
          localStorage.removeItem('sif_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (token: string) => {
    localStorage.setItem('sif_token', token);
    try {
      const userData = await authService.getMe();
      setUser(userData);
      router.push('/');
    } catch (error) {
      localStorage.removeItem('sif_token');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('sif_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
