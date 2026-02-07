/**
 * Authentication Context
 *
 * Manages password-protected session authentication.
 * Session is cleared when browser closes.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { secureSessionStorage } from '@/lib/secureSessionStorage';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated in this session
    const isUnlocked = secureSessionStorage.isUnlocked();
    setIsAuthenticated(isUnlocked);
    setIsLoading(false);
  }, []);

  const login = (password: string): boolean => {
    const success = secureSessionStorage.unlock(password);
    if (success) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    secureSessionStorage.lock();
    setIsAuthenticated(false);
    // Clear any remaining data
    sessionStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
