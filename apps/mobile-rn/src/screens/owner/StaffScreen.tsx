import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useStaffStore } from '../../store/staffStore';
import { StaffMember } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function StaffScreen() {
    const { staff, isLoading, fetchStaff } = useStaffStore();
    const navigation = useNavigation<any>();

    useEffect(() => { fetchStaff(); }, []);

    const onDuty = staff.filter((s) => s.isOnDuty && s.isActive);
    const offDuty = staff.filter((s) => !s.isOnDuty && s.isActive);
    const inactive = staff.filter((s) => !s.isActive);

    const renderStaff = ({ item }: { item: StaffMember }) => (
        <TouchableOpacity
            style={[styles.card, !item.isActive && styles.cardInactive]}
            onPress={() => navigation.navigate('StaffDetail', { staff: item })}
            activeOpacity={0.7}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.role}>{item.role.replace('_', ' ')}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
            </View>
            <View style={[styles.dutyBadge, {
                backgroundColor: !item.isActive ? Colors.gray200
                    : item.isOnDuty ? Colors.success + '20' : Colors.gray200
            }]}>
                <Text style={[styles.dutyText, {
                    color: !item.isActive ? Colors.gray500
                        : item.isOnDuty ? Colors.success : Colors.gray500
                }]}>
                    {!item.isActive ? 'Inactive' : item.isOnDuty ? 'On Duty' : 'Off Duty'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Staff ({onDuty.length} on duty)</Text>
                    <Text style={styles.subtitle}>{staff.length} total  •  {inactive.length} inactive</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.attendanceBtn} onPress={() => navigation.navigate('Attendance')}>
                        <Text style={styles.attendanceBtnText}>📅</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.inviteBtn} onPress={() => navigation.navigate('InviteStaff')}>
                        <Text style={styles.inviteBtnText}>+ Invite</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <FlatList
                data={[...onDuty, ...offDuty, ...inactive]}
                renderItem={renderStaff}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                refreshing={isLoading}
                onRefresh={fetchStaff}
                ListEmptyComponent={<Text style={styles.empty}>No staff members. Tap + Invite.</Text>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon },
    subtitle: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    attendanceBtn: { backgroundColor: Colors.white, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200 },
    attendanceBtnText: { fontSize: 18 },
    inviteBtn: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    inviteBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    cardInactive: { opacity: 0.5 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.saffron + '20', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    avatarText: { fontSize: FontSize.md, fontWeight: '800', color: Colors.saffron },
    info: { flex: 1 },
    name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
    role: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 2 },
    phone: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 1 },
    dutyBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
    dutyText: { fontSize: FontSize.xs, fontWeight: '700' },
    empty: { textAlign: 'center', color: Colors.gray400, marginTop: 48, fontSize: FontSize.base },
});
