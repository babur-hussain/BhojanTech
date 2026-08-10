import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useStaffStore } from '../../store/staffStore';
import { AttendanceRecord } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const ATTENDANCE_COLORS: Record<string, string> = {
    PRESENT: Colors.success,
    ABSENT: Colors.error,
    LATE: Colors.warning,
    HALF_DAY: Colors.info,
    HOLIDAY: Colors.gray400,
};

export default function AttendanceScreen() {
    const navigation = useNavigation<any>();
    const { attendanceRecords, isLoading, fetchTodayAttendance, staff, fetchStaff } = useStaffStore();

    useEffect(() => {
        fetchTodayAttendance();
        if (staff.length === 0) fetchStaff();
    }, []);

    const todayDate = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(r => r.date === todayDate);
    const presentCount = todayRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absentCount = todayRecords.filter(r => r.status === 'ABSENT').length;

    const renderRecord = ({ item }: { item: AttendanceRecord }) => {
        const statusColor = ATTENDANCE_COLORS[item.status] || Colors.gray400;
        return (
            <View style={styles.card}>
                <View style={styles.cardLeft}>
                    <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.avatarText, { color: statusColor }]}>{item.staffName.charAt(0)}</Text>
                    </View>
                    <View>
                        <Text style={styles.name}>{item.staffName}</Text>
                        <Text style={styles.shift}>{item.shift} Shift</Text>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    {item.clockInTime && (
                        <Text style={styles.clockTime}>
                            In: {new Date(item.clockInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                    {item.clockOutTime && (
                        <Text style={styles.clockTime}>
                            Out: {new Date(item.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Attendance</Text>
            </View>

            {/* Summary */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
                    <Text style={styles.summaryValue}>{presentCount}</Text>
                    <Text style={styles.summaryLabel}>Present</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: Colors.error }]}>
                    <Text style={styles.summaryValue}>{absentCount}</Text>
                    <Text style={styles.summaryLabel}>Absent</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: Colors.info }]}>
                    <Text style={styles.summaryValue}>{staff.length}</Text>
                    <Text style={styles.summaryLabel}>Total Staff</Text>
                </View>
            </View>

            <FlatList
                data={todayRecords}
                renderItem={renderRecord}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                refreshing={isLoading}
                onRefresh={fetchTodayAttendance}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>No attendance records for today yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    back: { fontSize: FontSize.base, color: Colors.saffron, fontWeight: '600', marginRight: Spacing.md },
    title: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.maroon },
    summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
    summaryCard: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, marginHorizontal: 4, alignItems: 'center', borderLeftWidth: 3 },
    summaryValue: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.gray900 },
    summaryLabel: { fontSize: FontSize.xs, color: Colors.gray500, fontWeight: '600' },
    card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    cardLeft: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    avatarText: { fontSize: FontSize.md, fontWeight: '800' },
    name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
    shift: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
    cardRight: { alignItems: 'flex-end' },
    clockTime: { fontSize: FontSize.xs, color: Colors.gray500, marginBottom: 2 },
    statusBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2, marginTop: 2 },
    statusText: { fontSize: FontSize.xs, fontWeight: '700' },
    emptyBox: { alignItems: 'center', marginTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
    emptyText: { fontSize: FontSize.base, color: Colors.gray400 },
});
