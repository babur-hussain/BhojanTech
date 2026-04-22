import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { api } from '../../services/api';
import { Endpoints } from '../../constants/api';
import { KOT } from '../../types';
import { timeAgo, inrFormat } from '../../utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotificationsStore } from '../../store/notificationsStore';

export default function LiveOrdersScreen() {
    const [kots, setKots] = useState<KOT[]>([]);
    const [loading, setLoading] = useState(true);
    const resetUnread = useNotificationsStore((s) => s.reset);

    const fetchKots = async () => {
        try {
            const data = await api<KOT[]>(Endpoints.KOT_ACTIVE);
            setKots(data);
        } catch { }
        setLoading(false);
    };

    useEffect(() => {
        fetchKots();
        resetUnread();
    }, []);

    const renderKOT = ({ item }: { item: KOT }) => {
        const statusColor =
            item.status === 'READY' ? Colors.success :
                item.status === 'PREPARING' ? Colors.warning : Colors.error;

        return (
            <View style={[styles.card, { borderLeftColor: statusColor }]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.tableNum}>Table {item.tableNumber}</Text>
                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={styles.waiter}>{item.waiterName}</Text>
                {item.items.map((i, idx) => (
                    <Text key={idx} style={styles.itemText}>
                        {i.quantity}× {i.name}{i.variantName ? ` (${i.variantName})` : ''} — <Text style={{ color: statusColor, fontWeight: '700' }}>{i.status}</Text>
                    </Text>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Text style={styles.title}>Live Orders</Text>
            <FlatList
                data={kots}
                renderItem={renderKOT}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                refreshing={loading}
                onRefresh={fetchKots}
                ListEmptyComponent={<Text style={styles.empty}>No active orders right now.</Text>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderLeftWidth: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    tableNum: { fontSize: FontSize.md, fontWeight: '800', color: Colors.gray900 },
    time: { fontSize: FontSize.sm, color: Colors.gray400 },
    waiter: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: Spacing.sm },
    itemText: { fontSize: FontSize.base, color: Colors.gray700, marginBottom: 4 },
    empty: { textAlign: 'center', color: Colors.gray400, marginTop: 48, fontSize: FontSize.base },
});
