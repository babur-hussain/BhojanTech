import { create } from 'zustand';
import { UserRole } from '../types';
import { setAuthToken } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
// import * as Keychain from 'react-native-keychain';

interface AuthUser {
    id: string;
    role: UserRole;
    restaurantId?: string;
    branchId?: string;
    name?: string;
    selectedBranchId?: string | null;
    permissions?: string[];
}

interface AuthState {
    user: AuthUser | null;
    token: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    setAuth: (user: AuthUser, token: string, refreshToken?: string) => void;
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
    refreshToken: null,
    isLoading: false,
    isAuthenticated: false,

    setAuth: (user, token, refreshToken) => {
        setAuthToken(token);
        if (user.restaurantId) {
            connectSocket(token, user.restaurantId);
        }
        // Persist to Keychain
        // Keychain.setGenericPassword('auth', JSON.stringify({ user, token, refreshToken }));
        set({
            user,
            token,
            refreshToken: refreshToken || null,
            isAuthenticated: true,
            isLoading: false,
        });
    },

    logout: () => {
        setAuthToken(null);
        disconnectSocket();
        // Keychain.resetGenericPassword();
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    isOwnerOrManager: () => {
        const role = get().user?.role;
        return role === UserRole.OWNER || role === UserRole.MANAGER;
    },
    isWaiter: () => get().user?.role === UserRole.WAITER,
    isKitchen: () => get().user?.role === UserRole.KITCHEN_STAFF,
}));
