import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import QRScanner from '../../components/QRScanner';

export default function OnboardingScreen() {
    const navigation = useNavigation<any>();
    const [restaurantId, setRestaurantId] = React.useState('');
    const [inviteToken, setInviteToken] = React.useState('');
    const [showScanner, setShowScanner] = React.useState(false);

    const handleQRScan = (data: string) => {
        // Expected QR format: restaurantapp://invite?restaurantId=xxx&token=yyy
        try {
            let rId: string | null = null;
            let tkn: string | null = null;

            if (data.includes('restaurantId') || data.includes('invite')) {
                const url = new URL(data);
                rId = url.searchParams.get('restaurantId');
                tkn = url.searchParams.get('token');
            }

            if (rId) {
                setRestaurantId(rId);
                if (tkn) setInviteToken(tkn);
                setShowScanner(false);
                Alert.alert('Restaurant Found! ✅', 'Proceed to login to join this restaurant.');
            } else {
                Alert.alert('Invalid QR', 'This QR code doesn\'t contain a valid restaurant invite.');
            }
        } catch {
            Alert.alert('Invalid QR', 'Could not read this QR code. Ask your manager for a new one.');
        }
    };

    const handleJoin = () => {
        if (!restaurantId) {
            Alert.alert('Missing Info', 'Please scan the QR code from your manager first.');
            return;
        }
        // Navigate to Login screen with restaurantId as param
        // After login, the backend will associate the user with this restaurant
        navigation.navigate('Login', { restaurantId, inviteToken });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.emoji}>👨‍🍳</Text>
            <Text style={styles.title}>Join Your Restaurant</Text>
            <Text style={styles.subtitle}>
                Ask your manager to show the invite QR code from the web dashboard, then scan it below.
            </Text>

            <TouchableOpacity style={styles.scanButton} onPress={() => setShowScanner(true)}>
                <Text style={styles.scanButtonText}>📷 Scan Invite QR Code</Text>
            </TouchableOpacity>

            {restaurantId ? (
                <View style={styles.infoBox}>
                    <Text style={styles.infoIcon}>✅</Text>
                    <View>
                        <Text style={styles.infoLabel}>Restaurant Found</Text>
                        <Text style={styles.infoValue}>ID: {restaurantId.slice(0, 12)}...</Text>
                    </View>
                </View>
            ) : null}

            <TouchableOpacity
                style={[styles.joinButton, !restaurantId && styles.joinButtonDisabled]}
                onPress={handleJoin}
                disabled={!restaurantId}
            >
                <Text style={styles.joinButtonText}>Continue to Login →</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.skipText}>I'm an owner — skip to login</Text>
            </TouchableOpacity>

            {/* QR Scanner Modal */}
            <Modal visible={showScanner} animationType="slide" presentationStyle="fullScreen">
                <QRScanner
                    onScan={handleQRScan}
                    onClose={() => setShowScanner(false)}
                />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream, justifyContent: 'center', paddingHorizontal: Spacing.xxl },
    emoji: { fontSize: 64, textAlign: 'center', marginBottom: Spacing.lg },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon, textAlign: 'center' },
    subtitle: {
        fontSize: FontSize.sm,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.xxxl,
        lineHeight: 20,
    },
    scanButton: {
        backgroundColor: Colors.white,
        borderWidth: 2,
        borderColor: Colors.saffron,
        borderStyle: 'dashed',
        borderRadius: Radius.xl,
        paddingVertical: Spacing.xxxl,
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    scanButtonText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.saffron },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success + '10',
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.success + '30',
    },
    infoIcon: { fontSize: 28, marginRight: Spacing.md },
    infoLabel: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '700' },
    infoValue: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
    joinButton: {
        backgroundColor: Colors.saffron,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    joinButtonDisabled: { opacity: 0.4 },
    joinButtonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
    skipText: {
        color: Colors.gray400,
        textAlign: 'center',
        marginTop: Spacing.xxl,
        fontWeight: '500',
        fontSize: FontSize.sm,
    },
});
