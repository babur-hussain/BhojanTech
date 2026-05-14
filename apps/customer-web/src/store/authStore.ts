import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CustomerUser {
  uid: string;
  phoneNumber: string;
  displayName?: string;
  token: string; // Backend JWT
}

interface AuthState {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  setUser: (user: CustomerUser) => void;
  logout: () => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false }),

      getToken: () => get().user?.token ?? null,
    }),
    {
      name: 'customer-auth-storage',
    }
  )
);
