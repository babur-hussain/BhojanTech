import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';
import { User } from '../types';

export function useAuth() {
    const { user, token, isAuthenticated, isLoading, setAuth, logout, setLoading } = useAuthStore();

    const login = async (firebaseIdToken: string) => {
        setLoading(true);
        try {
            const result = await api<{ user: User; token: string }>(Endpoints.AUTH_LOGIN, {
                method: 'POST',
                body: { idToken: firebaseIdToken },
            });
            setAuth(result.user, result.token);
        } catch (err) {
            setLoading(false);
            throw err;
        }
    };

    const handleLogout = async () => {
        try {
            await api(Endpoints.AUTH_LOGOUT, { method: 'POST' });
        } catch { } // still logout locally even if API fails
        logout();
    };

    return { user, token, isAuthenticated, isLoading, login, logout: handleLogout };
}
