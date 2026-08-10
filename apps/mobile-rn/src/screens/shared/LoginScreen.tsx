import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { isValidIndianPhone, isValidOTP, isValidEmail } from '../../utils/validators';
import { useAuth } from '../../hooks/useAuth';

type Step = 'PHONE' | 'OTP' | 'EMAIL' | 'EMAIL_SIGNUP';

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 */
function friendlyError(err: any): string {
    const code = err?.code || '';
    switch (code) {
        case 'auth/invalid-phone-number':
            return 'Invalid phone number format. Please check and try again.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait a few minutes and try again.';
        case 'auth/invalid-verification-code':
            return 'The OTP you entered is incorrect. Please try again.';
        case 'auth/session-expired':
            return 'OTP has expired. Please request a new one.';
        case 'auth/user-not-found':
            return 'No account found with this email. Try signing up.';
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Incorrect email or password.';
        case 'auth/email-already-in-use':
            return 'This email is already registered. Try logging in instead.';
        case 'auth/weak-password':
            return 'Password is too weak. Use at least 6 characters.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not enabled. Contact support.';
        default:
            return err?.message || 'Something went wrong. Please try again.';
    }
}

export default function LoginScreen() {
    const [step, setStep] = React.useState<Step>('PHONE');
    const [phone, setPhone] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmResult, setConfirmResult] = React.useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

    const {
        isLoading,
        sendOTP,
        verifyOTP,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
    } = useAuth();

    // ─── Phone OTP ──────────────────────────────────────────────────────────
    const handleSendOTP = async () => {
        if (!isValidIndianPhone(phone)) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit Indian mobile number.');
            return;
        }
        try {
            const confirmation = await sendOTP(phone);
            setConfirmResult(confirmation);
            setStep('OTP');
        } catch (err: any) {
            Alert.alert('Error', friendlyError(err));
        }
    };

    const handleVerifyOTP = async () => {
        if (!isValidOTP(otp)) {
            Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
            return;
        }
        if (!confirmResult) {
            Alert.alert('Error', 'No OTP session found. Please request a new OTP.');
            setStep('PHONE');
            return;
        }
        try {
            await verifyOTP(confirmResult, otp);
            // On success, auth store updates and RootNavigator switches automatically
        } catch (err: any) {
            Alert.alert('Verification Failed', friendlyError(err));
        }
    };

    // ─── Email / Password ───────────────────────────────────────────────────
    const handleEmailLogin = async () => {
        if (!isValidEmail(email)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        if (!password || password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }
        try {
            await loginWithEmail(email, password);
        } catch (err: any) {
            Alert.alert('Login Failed', friendlyError(err));
        }
    };

    const handleEmailSignup = async () => {
        if (!isValidEmail(email)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        if (!password || password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }
        try {
            await signUpWithEmail(email, password);
        } catch (err: any) {
            Alert.alert('Sign Up Failed', friendlyError(err));
        }
    };

    // ─── Google ─────────────────────────────────────────────────────────────
    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (err: any) {
            // User cancelled is not an error
            if (err?.code === 'SIGN_IN_CANCELLED' || err?.code === '12501') return;
            Alert.alert('Google Sign-In Failed', friendlyError(err));
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.title}>🍛</Text>
                    <Text style={styles.appName}>BhojanTech</Text>
                    <Text style={styles.subtitle}>Indian Restaurant Management</Text>
                </View>

                <View style={styles.card}>
                    {/* ── PHONE STEP ────────────────────────────────────────── */}
                    {step === 'PHONE' && (
                        <>
                            <Text style={styles.label}>Mobile Number</Text>
                            <View style={styles.phoneRow}>
                                <View style={styles.prefix}>
                                    <Text style={styles.prefixText}>+91</Text>
                                </View>
                                <TextInput
                                    style={styles.phoneInput}
                                    placeholder="98765 43210"
                                    placeholderTextColor={Colors.gray400}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={phone}
                                    onChangeText={setPhone}
                                    editable={!isLoading}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.button, isLoading && styles.buttonDisabled]}
                                onPress={handleSendOTP}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={styles.buttonText}>Send OTP</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>OR</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <TouchableOpacity
                                style={[styles.outlineButton, isLoading && styles.buttonDisabled]}
                                onPress={() => setStep('EMAIL')}
                                disabled={isLoading}
                            >
                                <Text style={styles.outlineButtonIcon}>✉️</Text>
                                <Text style={styles.outlineButtonText}>Continue with Email</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.googleButton, isLoading && styles.buttonDisabled]}
                                onPress={handleGoogleLogin}
                                disabled={isLoading}
                            >
                                <Text style={styles.outlineButtonIcon}>G</Text>
                                <Text style={styles.googleButtonText}>Continue with Google</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── OTP STEP ─────────────────────────────────────────── */}
                    {step === 'OTP' && (
                        <>
                            <Text style={styles.label}>Enter OTP</Text>
                            <Text style={styles.sentTo}>Sent to +91 {phone}</Text>
                            <TextInput
                                style={styles.otpInput}
                                placeholder="• • • • • •"
                                placeholderTextColor={Colors.gray400}
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otp}
                                onChangeText={setOtp}
                                autoFocus
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={[styles.button, isLoading && styles.buttonDisabled]}
                                onPress={handleVerifyOTP}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={styles.buttonText}>Verify & Login</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { setStep('PHONE'); setOtp(''); setConfirmResult(null); }}
                                disabled={isLoading}
                            >
                                <Text style={styles.changeNumber}>Change Number</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── EMAIL LOGIN STEP ─────────────────────────────────── */}
                    {step === 'EMAIL' && (
                        <>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="hello@example.com"
                                placeholderTextColor={Colors.gray400}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={email}
                                onChangeText={setEmail}
                                editable={!isLoading}
                            />
                            <Text style={[styles.label, { marginTop: Spacing.md }]}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.gray400}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={[styles.button, { marginTop: Spacing.lg }, isLoading && styles.buttonDisabled]}
                                onPress={handleEmailLogin}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={styles.buttonText}>Login</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setStep('EMAIL_SIGNUP')}
                                disabled={isLoading}
                            >
                                <Text style={styles.switchAuth}>Don't have an account? Sign Up</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setStep('PHONE')}
                                disabled={isLoading}
                            >
                                <Text style={styles.changeNumber}>Back to Other Options</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── EMAIL SIGNUP STEP ────────────────────────────────── */}
                    {step === 'EMAIL_SIGNUP' && (
                        <>
                            <Text style={styles.label}>Create Account</Text>
                            <Text style={styles.sentTo}>Enter your email and choose a password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="hello@example.com"
                                placeholderTextColor={Colors.gray400}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                value={email}
                                onChangeText={setEmail}
                                editable={!isLoading}
                            />
                            <Text style={[styles.label, { marginTop: Spacing.md }]}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Min 6 characters"
                                placeholderTextColor={Colors.gray400}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={[styles.button, { marginTop: Spacing.lg }, isLoading && styles.buttonDisabled]}
                                onPress={handleEmailSignup}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={styles.buttonText}>Create Account</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setStep('EMAIL')}
                                disabled={isLoading}
                            >
                                <Text style={styles.switchAuth}>Already have an account? Login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setStep('PHONE')}
                                disabled={isLoading}
                            >
                                <Text style={styles.changeNumber}>Back to Other Options</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: {
        flexGrow: 1,
        backgroundColor: Colors.cream,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.xxxl,
    },
    header: { alignItems: 'center', marginBottom: Spacing.xxxl },
    title: { fontSize: 56 },
    appName: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.maroon, marginTop: Spacing.sm },
    subtitle: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: Spacing.xs },
    card: {
        backgroundColor: Colors.white,
        borderRadius: Radius.xl,
        padding: Spacing.xxl,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    label: { fontSize: FontSize.md, fontWeight: '700', color: Colors.gray800, marginBottom: Spacing.sm },
    phoneRow: { flexDirection: 'row', marginBottom: Spacing.lg },
    prefix: {
        backgroundColor: Colors.gray100,
        borderRadius: Radius.md,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        marginRight: Spacing.sm,
    },
    prefixText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.gray700 },
    phoneInput: {
        flex: 1,
        backgroundColor: Colors.gray50,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: FontSize.lg,
        color: Colors.gray900,
        letterSpacing: 2,
    },
    otpInput: {
        backgroundColor: Colors.gray50,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        fontSize: FontSize.xxl,
        color: Colors.gray900,
        letterSpacing: 8,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    sentTo: { fontSize: FontSize.sm, color: Colors.gray400, marginBottom: Spacing.lg },
    button: {
        backgroundColor: Colors.saffron,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
    changeNumber: { color: Colors.saffron, textAlign: 'center', marginTop: Spacing.lg, fontWeight: '600' },
    switchAuth: { color: Colors.maroon, textAlign: 'center', marginTop: Spacing.lg, fontWeight: '600' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.xl },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.gray200 },
    dividerText: { marginHorizontal: Spacing.md, color: Colors.gray400, fontWeight: '600' },
    outlineButton: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: Colors.gray300,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        marginBottom: Spacing.md,
    },
    outlineButtonIcon: { fontSize: FontSize.lg, marginRight: Spacing.sm },
    outlineButtonText: { color: Colors.gray800, fontSize: FontSize.md, fontWeight: '600' },
    googleButton: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#4285F4',
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4285F4',
    },
    googleButtonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
    input: {
        backgroundColor: Colors.gray50,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.gray900,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
});
