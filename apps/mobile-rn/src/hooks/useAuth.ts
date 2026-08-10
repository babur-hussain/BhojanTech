import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';

// Web client ID from google-services.json (client_type: 3)
const WEB_CLIENT_ID = '546344163655-o5b9645chs8s0tubd087046djrspb1cf.apps.googleusercontent.com';

// Configure Google Sign-In once
GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
});

interface LoginResponse {
    user: {
        id: string;
        role: string;
        restaurantId?: string;
        branchId?: string;
        name?: string;
        selectedBranchId?: string | null;
        permissions?: string[];
    };
    accessToken: string;
    refreshToken: string;
}

/**
 * Sends the Firebase ID token to the backend and stores the resulting session.
 */
async function authenticateWithBackend(firebaseUser: FirebaseAuthTypes.User) {
    const idToken = await firebaseUser.getIdToken();
    const result = await api<LoginResponse>(Endpoints.AUTH_LOGIN, {
        method: 'POST',
        body: { firebaseToken: idToken },
    });
    const { setAuth } = useAuthStore.getState();
    setAuth(result.user as any, result.accessToken, result.refreshToken);
}

export function useAuth() {
    const { user, token, isAuthenticated, isLoading, logout: storeLogout, setLoading } = useAuthStore();

    // ─── Phone OTP ──────────────────────────────────────────────────────────
    const sendOTP = async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
        setLoading(true);
        try {
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
            const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
            return confirmation;
        } catch (err) {
            setLoading(false);
            throw err;
        }
    };

    const verifyOTP = async (
        confirmation: FirebaseAuthTypes.ConfirmationResult,
        otp: string,
    ) => {
        setLoading(true);
        try {
            const credential = await confirmation.confirm(otp);
            if (!credential?.user) throw new Error('OTP verification failed');
            await authenticateWithBackend(credential.user);
        } catch (err) {
            setLoading(false);
            throw err;
        }
    };

    // ─── Email / Password ───────────────────────────────────────────────────
    const loginWithEmail = async (email: string, password: string) => {
        setLoading(true);
        try {
            const credential = await auth().signInWithEmailAndPassword(email, password);
            await authenticateWithBackend(credential.user);
        } catch (err) {
            setLoading(false);
            throw err;
        }
    };

    const signUpWithEmail = async (email: string, password: string) => {
        setLoading(true);
        try {
            const credential = await auth().createUserWithEmailAndPassword(email, password);
            await authenticateWithBackend(credential.user);
        } catch (err) {
            setLoading(false);
            throw err;
        }
    };

    // ─── Google Sign-In ─────────────────────────────────────────────────────
    const loginWithGoogle = async () => {
        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const signInResult = await GoogleSignin.signIn();
            const idToken = signInResult?.data?.idToken;
            if (!idToken) throw new Error('Google Sign-In failed: no ID token');
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);
            const credential = await auth().signInWithCredential(googleCredential);
            await authenticateWithBackend(credential.user);
        } catch (err) {
            setLoading(false);
            throw err;
        }
    };

    // ─── Logout ─────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        try {
            await api(Endpoints.AUTH_LOGOUT, { method: 'POST' });
        } catch { } // still logout locally even if API fails
        try {
            await auth().signOut();
        } catch { }
        try {
            await GoogleSignin.signOut();
        } catch { }
        storeLogout();
    };

    return {
        user,
        token,
        isAuthenticated,
        isLoading,
        sendOTP,
        verifyOTP,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        logout: handleLogout,
    };
}
