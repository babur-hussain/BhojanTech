import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
// import { QRScanner } from '../../components/QRScanner';

export default function OnboardingScreen() {
    const [restaurantId, setRestaurantId] = React.useState('');
    const [inviteToken, setInviteToken] = React.useState('');
    const [showScanner, setShowScanner] = React.useState(false);

    const handleQRScan = (data: string) => {
        // Expected QR format: restaurantapp://invite?restaurantId=xxx&token=yyy
        try {
            const url = new URL(data);
            const rId = url.searchParams.get('restaurantId');
            const tkn = url.searchParams.get('token');
            if (rId) setRestaurantId(rId);
            if (tkn) setInviteToken(tkn);
            setShowScanner(false);
        } catch {
            Alert.alert('Invalid QR', 'This QR code is not valid for onboarding.');
        }
    };

    const handleJoin = () => {
        if (!restaurantId || !inviteToken) {
            Alert.alert('Missing Info', 'Please scan the QR code from your manager first.');
            return;
        }
        // Navigate to Login screen with restaurantId and inviteToken as params
        Alert.alert('Success', `Restaurant: ${restaurantId}\nProceeding to phone verification...`);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Join Your Restaurant</Text>
            <Text style={styles.subtitle}>
                Ask your manager to show the QR code from the web app, then scan it below.
            </Text>

            <TouchableOpacity style={styles.scanButton} onPress={() => setShowScanner(true)}>
                <Text style={styles.scanButtonText}>📷 Scan QR Code</Text>
            </TouchableOpacity>

            {restaurantId ? (
                <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Restaurant ID</Text>
                    <Text style={styles.infoValue}>{restaurantId}</Text>
                </View>
            ) : null}

            <TouchableOpacity
                style={[styles.joinButton, !restaurantId && styles.joinButtonDisabled]}
                onPress={handleJoin}
                disabled={!restaurantId}
            >
                <Text style={styles.joinButtonText}>Continue to Verification →</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream, justifyContent: 'center', paddingHorizontal: Spacing.xxl },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon, textAlign: 'center' },
    subtitle: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xxxl, lineHeight: 20 },
    scanButton: { backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.saffron, borderStyle: 'dashed', borderRadius: Radius.xl, paddingVertical: Spacing.xxxl, alignItems: 'center', marginBottom: Spacing.xxl },
    scanButtonText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.saffron },
    infoBox: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.xxl },
    infoLabel: { fontSize: FontSize.xs, color: Colors.gray400, fontWeight: '600' },
    infoValue: { fontSize: FontSize.base, color: Colors.gray800, fontWeight: '600', marginTop: Spacing.xs },
    joinButton: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center' },
    joinButtonDisabled: { opacity: 0.4 },
    joinButtonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
});
