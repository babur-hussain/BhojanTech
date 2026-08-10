import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useStaffStore } from '../../store/staffStore';
import { StaffMember } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { inrFormat } from '../../utils/formatters';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const ATTENDANCE_COLORS: Record<string, string> = {
    PRESENT: Colors.success,
    ABSENT: Colors.error,
    LATE: Colors.warning,
    HALF_DAY: Colors.info,
    HOLIDAY: Colors.gray400,
};

export default function StaffDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { staff: staffMember } = route.params as { staff: StaffMember };
    const { attendanceRecords, performanceData, fetchAttendanceHistory, fetchPerformance, toggleStaffActive } = useStaffStore();

    useEffect(() => {
        fetchAttendanceHistory(staffMember.id);
        const now = new Date();
        fetchPerformance(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }, [staffMember.id]);

    const perf = performanceData.find(p => p.staffId === staffMember.id);
    const myAttendance = attendanceRecords.filter(r => r.staffId === staffMember.id);
    const presentDays = myAttendance.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;

    const handleToggleActive = () => {
        const action = staffMember.isActive ? 'Deactivate' : 'Activate';
        Alert.alert(`${action} Staff`, `${action} ${staffMember.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: action, style: staffMember.isActive ? 'destructive' : 'default',
                onPress: async () => {
                    try {
                        await toggleStaffActive(staffMember.id);
                        ReactNativeHapticFeedback.trigger('impactMedium');
                        navigation.goBack();
                    } catch (e: any) { Alert.alert('Error', e.message); }
                }
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Staff Detail</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{staffMember.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.name}>{staffMember.name}</Text>
                    <Text style={styles.role}>{staffMember.role.replace('_', ' ')}</Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaItem}>📱 {staffMember.phone}</Text>
                        <View style={[styles.activeBadge, { backgroundColor: staffMember.isActive ? Colors.success + '20' : Colors.error + '20' }]}>
                            <Text style={[styles.activeText, { color: staffMember.isActive ? Colors.success : Colors.error }]}>
                                {staffMember.isActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.dutyIndicator, { backgroundColor: staffMember.isOnDuty ? Colors.success + '15' : Colors.gray100 }]}>
                        <Text style={{ color: staffMember.isOnDuty ? Colors.success : Colors.gray500, fontWeight: '700', fontSize: FontSize.sm }}>
                            {staffMember.isOnDuty ? '🟢 Currently On Duty' : '⚫ Off Duty'}
                        </Text>
                    </View>
                </View>

                {/* Performance Card */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📊 This Month's Performance</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{perf?.ordersHandled ?? '—'}</Text>
                            <Text style={styles.statLabel}>Orders</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{perf ? inrFormat(perf.totalRevenue) : '—'}</Text>
                            <Text style={styles.statLabel}>Revenue</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{perf ? inrFormat(perf.avgOrderValue) : '—'}</Text>
                            <Text style={styles.statLabel}>Avg Order</Text>
                        </View>
                    </View>
                </View>

                {/* Attendance Card */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📅 Attendance ({presentDays} present this month)</Text>
                    {myAttendance.length > 0 ? (
                        myAttendance.slice(0, 10).map((rec) => (
                            <View key={rec.id} style={styles.attendanceRow}>
                                <Text style={styles.attendanceDate}>{rec.date}</Text>
                                <Text style={styles.attendanceShift}>{rec.shift}</Text>
                                <View style={[styles.attendanceBadge, { backgroundColor: (ATTENDANCE_COLORS[rec.status] || Colors.gray400) + '20' }]}>
                                    <Text style={[styles.attendanceStatus, { color: ATTENDANCE_COLORS[rec.status] || Colors.gray400 }]}>
                                        {rec.status}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noData}>No attendance data yet</Text>
                    )}
                </View>

                {/* Actions */}
                <TouchableOpacity style={[styles.actionBtn, { borderColor: staffMember.isActive ? Colors.error : Colors.success }]} onPress={handleToggleActive}>
                    <Text style={[styles.actionBtnText, { color: staffMember.isActive ? Colors.error : Colors.success }]}>
                        {staffMember.isActive ? '🚫 Deactivate Staff' : '✅ Activate Staff'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    back: { fontSize: FontSize.base, color: Colors.saffron, fontWeight: '600', marginRight: Spacing.md },
    title: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.maroon },
    scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
    profileCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', marginBottom: Spacing.lg, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.saffron + '20', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
    avatarText: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.saffron },
    name: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
    role: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
    metaItem: { fontSize: FontSize.sm, color: Colors.gray600, marginRight: Spacing.md },
    activeBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 2 },
    activeText: { fontSize: FontSize.xs, fontWeight: '700' },
    dutyIndicator: { marginTop: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radius.full },
    sectionCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.gray800, marginBottom: Spacing.md },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { flex: 1, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.gray50, borderRadius: Radius.md, marginHorizontal: 4 },
    statValue: { fontSize: FontSize.md, fontWeight: '900', color: Colors.maroon },
    statLabel: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
    attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
    attendanceDate: { fontSize: FontSize.sm, color: Colors.gray700, fontWeight: '500', flex: 1 },
    attendanceShift: { fontSize: FontSize.xs, color: Colors.gray400, flex: 1, textAlign: 'center' },
    attendanceBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    attendanceStatus: { fontSize: FontSize.xs, fontWeight: '700' },
    noData: { color: Colors.gray400, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg },
    actionBtn: { borderWidth: 2, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.md },
    actionBtnText: { fontSize: FontSize.md, fontWeight: '700' },
});
