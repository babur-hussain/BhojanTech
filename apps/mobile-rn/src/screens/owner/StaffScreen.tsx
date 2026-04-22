import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { api } from '../../services/api';
import { Endpoints } from '../../constants/api';
import { StaffMember } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StaffScreen() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api<StaffMember[]>(Endpoints.STAFF)
            .then(setStaff)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const onDuty = staff.filter((s) => s.isOnDuty);
    const offDuty = staff.filter((s) => !s.isOnDuty);

    const renderStaff = ({ item }: { item: StaffMember }) => (
        <View style={styles.card}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.role}>{item.role.replace('_', ' ')}</Text>
            </View>
            <View style={[styles.dutyBadge, { backgroundColor: item.isOnDuty ? Colors.success + '20' : Colors.gray200 }]}>
                <Text style={[styles.dutyText, { color: item.isOnDuty ? Colors.success : Colors.gray500 }]}>
                    {item.isOnDuty ? 'On Duty' : 'Off Duty'}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Text style={styles.title}>Staff ({onDuty.length} on duty)</Text>
            <FlatList
                data={[...onDuty, ...offDuty]}
                renderItem={renderStaff}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                refreshing={loading}
                onRefresh={() => {
                    setLoading(true);
                    api<StaffMember[]>(Endpoints.STAFF).then(setStaff).finally(() => setLoading(false));
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.saffron + '20', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    avatarText: { fontSize: FontSize.md, fontWeight: '800', color: Colors.saffron },
    info: { flex: 1 },
    name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
    role: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: 2 },
    dutyBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
    dutyText: { fontSize: FontSize.xs, fontWeight: '700' },
});
