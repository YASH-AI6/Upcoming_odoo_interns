import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; phone?: string; address?: string }) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (api.getToken()) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch {
          api.setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
  };

  const signup = async (data: { name: string; email: string; password: string; phone?: string; address?: string }) => {
    const res = await api.signup(data);
    setUser(res.user);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const switchDemoRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      if (role === 'ADMIN') {
        await login('admin@example.com', 'AdminPassword123!');
      } else if (role === 'STAFF') {
        await login('staff1@example.com', 'StaffPassword123!');
      } else {
        await login('customer1@business.org', 'CustomerPassword123!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        switchDemoRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
