/**
 * Authentication Context
 *
 * Google OAuth authentication restricted to karmecholing.org accounts.
 * Session is cleared when browser closes (no persistence).
 */

import React, { createContext, useContext, useState } from 'react';

interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: GoogleUser | null;
  loginWithGoogle: (credential: string) => { success: boolean; error?: string };
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Decode a JWT token payload to extract claims.
 *
 * NOTE: This function does NOT verify the token signature. Signature
 * verification is handled upstream by GoogleOAuthProvider / the Google
 * Identity Services library before the credential is passed here. This
 * function exists solely to read the already-verified payload claims
 * (email, hd, name, picture) without adding an external dependency.
 */
function decodeJwt(token: string): Record<string, unknown> {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
  return JSON.parse(jsonPayload);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);

  const loginWithGoogle = (credential: string): { success: boolean; error?: string } => {
    try {
      const payload = decodeJwt(credential);

      // Enforce karmecholing.org domain — both checks required
      const hd = payload.hd as string | undefined;
      const email = payload.email as string | undefined;

      if (hd !== 'karmecholing.org' || !email?.endsWith('@karmecholing.org')) {
        return { success: false, error: 'Access restricted to karmecholing.org accounts only.' };
      }

      setUser({
        name: payload.name as string,
        email: email,
        picture: payload.picture as string,
      });
      setIsAuthenticated(true);
      return { success: true };
    } catch {
      return { success: false, error: 'Authentication failed. Please try again.' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    // Clear any stale planning data that may have been written by an older version
    localStorage.removeItem('kcl-planning-v1');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loginWithGoogle, logout, isLoading: false }}>
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
