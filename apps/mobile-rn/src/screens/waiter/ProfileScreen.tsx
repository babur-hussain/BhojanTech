import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const user = useAuthStore((s) => s.user);
    const { logout } = useAuth();

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
                    <Text style={styles.infoLabel}>Restaurant ID</Text>
                    <Text style={styles.infoValue}>{user?.restaurantId || '—'}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.clockBtn}>
                <Text style={styles.clockBtnText}>⏱ Clock In / Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream, padding: Spacing.lg },
    avatarSection: { alignItems: 'center', marginTop: Spacing.xxxl, marginBottom: Spacing.xxl },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.saffron + '20', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
    avatarText: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.saffron },
    name: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
    role: { fontSize: FontSize.sm, color: Colors.gray400, marginTop: Spacing.xs },
    infoCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.xxl },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
    infoLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
    infoValue: { fontSize: FontSize.sm, color: Colors.gray800, fontWeight: '600' },
    clockBtn: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
    clockBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
    logoutBtn: { backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: Colors.error },
    logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
});
