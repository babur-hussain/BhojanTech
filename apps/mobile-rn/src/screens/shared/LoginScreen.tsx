import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { isValidIndianPhone, isValidOTP } from '../../utils/validators';
import { useAuth } from '../../hooks/useAuth';

// NOTE: In production, import and use:
// import auth from '@react-native-firebase/auth';

type Step = 'PHONE' | 'OTP' | 'BRANCH_SELECT';

const MOCK_BRANCHES = [
    { id: 'all', name: 'Consolidated (All Branches)', icon: '🏢' },
    { id: '1', name: 'Main Branch - CP', icon: '📍' },
    { id: '2', name: 'South Ex Branch', icon: '📍' },
];

export default function LoginScreen() {
    const [step, setStep] = React.useState<Step>('PHONE');
    const [phone, setPhone] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [confirmResult, setConfirmResult] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);
    const { login } = useAuth();

    const handleSendOTP = async () => {
        if (!isValidIndianPhone(phone)) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit Indian mobile number.');
            return;
        }
        setLoading(true);
        try {
            // const confirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
            // setConfirmResult(confirmation);
            setStep('OTP');
            Alert.alert('OTP Sent', 'A 6-digit OTP has been sent to your phone (stub).');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!isValidOTP(otp)) {
            Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
            return;
        }
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setStep('BRANCH_SELECT');
        }, 1000);
    };

    const handleSelectBranch = async (branchId: string) => {
        setLoading(true);
        try {
            // Stub: call login with a fake token for development
            // In a real app, you would pass the branchId to the store during login.
            await login('stub-firebase-id-token');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Login failed');
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🍛</Text>
                <Text style={styles.appName}>Restaurant App</Text>
                <Text style={styles.subtitle}>Indian Restaurant Management</Text>
            </View>

            <View style={styles.card}>
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
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSendOTP}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
                        </TouchableOpacity>
                    </>
                )}

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
                        />
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleVerifyOTP}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify & Login'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setStep('PHONE'); setOtp(''); }}>
                            <Text style={styles.changeNumber}>Change Number</Text>
                        </TouchableOpacity>
                    </>
                )}

                {step === 'BRANCH_SELECT' && (
                    <>
                        <Text style={styles.label}>Select Context</Text>
                        <Text style={styles.sentTo}>Choose a branch to view or manage</Text>
                        {MOCK_BRANCHES.map(b => (
                            <TouchableOpacity
                                key={b.id}
                                style={styles.branchCard}
                                onPress={() => handleSelectBranch(b.id)}
                            >
                                <Text style={styles.branchIcon}>{b.icon}</Text>
                                <Text style={styles.branchName}>{b.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream, justifyContent: 'center', paddingHorizontal: Spacing.xxl },
    header: { alignItems: 'center', marginBottom: Spacing.xxxl },
    title: { fontSize: 56 },
    appName: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.maroon, marginTop: Spacing.sm },
    subtitle: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: Spacing.xs },
    card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    label: { fontSize: FontSize.md, fontWeight: '700', color: Colors.gray800, marginBottom: Spacing.sm },
    phoneRow: { flexDirection: 'row', marginBottom: Spacing.lg },
    prefix: { backgroundColor: Colors.gray100, borderRadius: Radius.md, justifyContent: 'center', paddingHorizontal: Spacing.lg, marginRight: Spacing.sm },
    prefixText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.gray700 },
    phoneInput: { flex: 1, backgroundColor: Colors.gray50, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.lg, color: Colors.gray900, letterSpacing: 2 },
    otpInput: { backgroundColor: Colors.gray50, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, fontSize: FontSize.xxl, color: Colors.gray900, letterSpacing: 8, textAlign: 'center', marginBottom: Spacing.lg },
    sentTo: { fontSize: FontSize.sm, color: Colors.gray400, marginBottom: Spacing.lg },
    button: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center' },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
    changeNumber: { color: Colors.saffron, textAlign: 'center', marginTop: Spacing.lg, fontWeight: '600' },
    branchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray50, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.gray200 },
    branchIcon: { fontSize: FontSize.xl, marginRight: Spacing.md },
    branchName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.gray800 },
});
