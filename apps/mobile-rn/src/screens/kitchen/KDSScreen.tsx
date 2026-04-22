import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { api } from '../../services/api';
import { Endpoints } from '../../constants/api';
import { onSocketEvent } from '../../services/socket';
import { SocketEvents } from '../../constants/socketEvents';
import { KOT, KOTItem } from '../../types';
import KOTCard from '../../components/KOTCard';
import { SafeAreaView } from 'react-native-safe-area-context';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function KDSScreen() {
    const [kots, setKots] = useState<KOT[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchKots = useCallback(async () => {
        try {
            const data = await api<KOT[]>(Endpoints.KOT_ACTIVE);
            // Sort by oldest first
            data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            setKots(data);
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchKots();

        // Listen for new KOTs and vibrate
        const unsub = onSocketEvent(SocketEvents.KOT_CREATED, (data: KOT) => {
            setKots((prev) => [...prev, data].sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            ));
            // Vibrate phone when new order arrives
            Vibration.vibrate([0, 200, 100, 200]); // Pattern: wait, vibrate, wait, vibrate
            // ReactNativeHapticFeedback.trigger('notificationWarning');
        });

        return unsub;
    }, []);

    const handleItemPress = async (kotId: string, item: KOTItem) => {
        // Cycle: PENDING → PREPARING → READY
        const nextStatus = item.status === 'PENDING' ? 'PREPARING' : item.status === 'PREPARING' ? 'READY' : 'READY';
        try {
            await api(Endpoints.KOT_ITEM_STATUS(kotId, item._id || item.orderItemId), {
                method: 'PATCH',
                body: { status: nextStatus },
            });
            // ReactNativeHapticFeedback.trigger('impactMedium');
            // Refresh
            fetchKots();
        } catch (err) {
            console.warn('Could not update status:', err);
        }
    };

    const pendingCount = kots.reduce((count, k) =>
        count + k.items.filter((i) => i.status !== 'READY').length, 0
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Dark Mode Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🍳 Kitchen Display</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount} pending</Text>
                </View>
            </View>

            <FlatList
                data={kots.filter((k) => k.items.some((i) => i.status !== 'READY'))}
                renderItem={({ item }) => (
                    <KOTCard kot={item} onItemPress={handleItemPress} />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                refreshing={loading}
                onRefresh={fetchKots}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>✅</Text>
                        <Text style={styles.emptyText}>All caught up! No pending orders.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.kdsBg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.kdsText },
    badge: { backgroundColor: Colors.kdsPending, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
    badgeText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '800' },
    emptyBox: { alignItems: 'center', marginTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
    emptyText: { fontSize: FontSize.md, color: Colors.gray400, fontWeight: '500' },
});
