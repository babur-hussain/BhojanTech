import { create } from 'zustand';
import { User, UserRole } from '../types';
import { setAuthToken } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
// import * as Keychain from 'react-native-keychain';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    setAuth: (user: User, token: string) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;

    // Helpers
    isOwnerOrManager: () => boolean;
    isWaiter: () => boolean;
    isKitchen: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,

    setAuth: (user, token) => {
        setAuthToken(token);
        if (user.restaurantId) {
            connectSocket(token, user.restaurantId);
        }
        // Persist to Keychain
        // Keychain.setGenericPassword('auth', JSON.stringify({ user, token }));
        set({ user, token, isAuthenticated: true, isLoading: false });
    },

    logout: () => {
        setAuthToken(null);
        disconnectSocket();
        // Keychain.resetGenericPassword();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    isOwnerOrManager: () => {
        const role = get().user?.role;
        return role === UserRole.OWNER || role === UserRole.MANAGER;
    },
    isWaiter: () => get().user?.role === UserRole.WAITER,
    isKitchen: () => get().user?.role === UserRole.KITCHEN_STAFF,
}));
