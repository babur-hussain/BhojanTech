import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@restaurant/types';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import axios from 'axios';

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

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);

  const login = async (firebaseToken: string) => {
    // Call the real backend to exchange Firebase ID token for a JWT
    const response = await axios.post(`${API_BASE}/api/auth/login`, { firebaseToken });
    const { user: backendUser, accessToken: jwt } = response.data;

    setUser(backendUser);
    setAccessToken(jwt);
    localStorage.setItem('accessToken', jwt);
  };

  const logout = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        await axios.post(
          `${API_BASE}/api/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        // Ignore logout errors — clear state regardless
      }
    }
    await firebaseSignOut(auth);
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
  };

  useEffect(() => {
    // On mount, if we have a stored token, try to restore the user session
    // by getting the current Firebase user and re-fetching a fresh token
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const freshToken = await firebaseUser.getIdToken();
          const response = await axios.post(`${API_BASE}/api/auth/login`, { firebaseToken: freshToken });
          const { user: backendUser, accessToken: jwt } = response.data;
          setUser(backendUser);
          setAccessToken(jwt);
          localStorage.setItem('accessToken', jwt);
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            // Genuine auth failure — clear session
            console.warn('Session restore: auth rejected, clearing session');
            localStorage.removeItem('accessToken');
            setAccessToken(null);
            setUser(null);
          } else {
            // Transient server error (429 rate limit, 500, network) — preserve existing session
            console.warn('Session restore failed with transient error, keeping existing session:', status);
            // Try to keep the user alive from stored token if available
            const storedToken = localStorage.getItem('accessToken');
            if (!storedToken) {
              setUser(null);
              setAccessToken(null);
            }
          }
        }
      } else {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('accessToken');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
