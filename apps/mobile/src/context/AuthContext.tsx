import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@restaurant/types';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

interface AuthUser {
  id: string;
  role: UserRole;
  restaurantId?: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  accessToken: string | null;
  login: (firebaseToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (firebaseToken: string) => {
    // In real app, make API call to backend /api/auth/login
    // const response = await fetch('/api/auth/login', { ... });
    
    // Mocking for now
    const mockUser: AuthUser = { id: '1', role: UserRole.WAITER };
    const mockToken = 'mock-jwt-token';
    
    setUser(mockUser);
    setAccessToken(mockToken);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setAccessToken(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !user && accessToken) {
        setUser({ id: firebaseUser.uid, role: UserRole.WAITER });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, accessToken]);

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
