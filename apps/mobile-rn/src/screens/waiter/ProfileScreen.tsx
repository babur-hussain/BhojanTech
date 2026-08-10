import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useStaffStore } from '../../store/staffStore';
import { useAuth } from '../../hooks/useAuth';
import { inrFormat } from '../../utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function ProfileScreen() {
    const user = useAuthStore((s) => s.user);
    const { logout } = useAuth();
    const { isClockedIn, todayStats, clockIn, clockOut, fetchMyStats } = useStaffStore();
    const [clockLoading, setClockLoading] = useState(false);

    useEffect(() => { fetchMyStats(); }, []);

    const handleClockToggle = async () => {
        setClockLoading(true);
        try {
            if (isClockedIn) {
                await clockOut();
                ReactNativeHapticFeedback.trigger('notificationWarning');
                Alert.alert('Clocked Out ⏱️', 'See you next shift!');
            } else {
                await clockIn();
                ReactNativeHapticFeedback.trigger('notificationSuccess');
                Alert.alert('Clocked In ✅', 'Your shift has started. Good luck!');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not process');
        } finally {
            setClockLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user?.name?.charAt(0) || '?'}</Text>
                </View>
                <Text style={styles.name}>{user?.name || 'Staff Member'}</Text>
                <Text style={styles.role}>{user?.role?.replace('_', ' ') || ''}</Text>
            </View>

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{user?.phoneNumber || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={[styles.infoValue, { color: isClockedIn ? Colors.success : Colors.gray500 }]}>
                        {isClockedIn ? '🟢 On Duty' : '⚫ Off Duty'}
                    </Text>
                </View>
            </View>

            {/* Today's Performance */}
            <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>Today's Performance</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{todayStats?.ordersHandled ?? '—'}</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{todayStats ? inrFormat(todayStats.revenueGenerated) : '—'}</Text>
                        <Text style={styles.statLabel}>Revenue</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.clockBtn, isClockedIn && styles.clockBtnOut]}
                onPress={handleClockToggle}
                disabled={clockLoading}
            >
                {clockLoading ? (
                    <ActivityIndicator color={Colors.white} />
                ) : (
                    <Text style={styles.clockBtnText}>
                        {isClockedIn ? '⏱ Clock Out' : '⏱ Clock In'}
                    </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream, padding: Spacing.lg },
    avatarSection: { alignItems: 'center', marginTop: Spacing.xxl, marginBottom: Spacing.xl },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.saffron + '20', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
    avatarText: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.saffron },
    name: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
    role: { fontSize: FontSize.sm, color: Colors.gray400, marginTop: Spacing.xs },
    infoCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
    infoLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
    infoValue: { fontSize: FontSize.sm, color: Colors.gray800, fontWeight: '600' },
    statsCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.xl },
    statsTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.gray800, marginBottom: Spacing.md },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { flex: 1, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.gray50, borderRadius: Radius.md, marginHorizontal: 4 },
    statValue: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.maroon },
    statLabel: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
    clockBtn: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
    clockBtnOut: { backgroundColor: Colors.error },
    clockBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
    logoutBtn: { backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: Colors.error },
    logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
});
