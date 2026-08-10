import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useOrdersStore } from '../../store/ordersStore';
import { useAuthStore } from '../../store/authStore';
import { Order } from '../../types';
import { inrFormat, timeAgo } from '../../utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const STATUS_COLORS: Record<string, string> = {
    OPEN: Colors.info,
    BILLED: Colors.warning,
    PAID: Colors.success,
    CANCELLED: Colors.gray400,
};

export default function MyOrdersScreen() {
    const { orders, isLoading, fetchMyOrders } = useOrdersStore();
    const userId = useAuthStore((s) => s.user?.id || '');
    const navigation = useNavigation<any>();

    useEffect(() => {
        if (userId) fetchMyOrders(userId);
    }, [userId]);

    const handlePress = (order: Order) => {
        if (order.status === 'OPEN') {
            navigation.navigate('OrderScreen', { tableId: order.tableId, tableNumber: order.tableNumber, orderId: order.id });
        } else if (order.status === 'BILLED') {
            navigation.navigate('Billing', { orderId: order.id });
        }
    };

    const renderOrder = ({ item }: { item: Order }) => {
        const statusColor = STATUS_COLORS[item.status] || Colors.gray400;
        return (
            <TouchableOpacity style={styles.card} onPress={() => handlePress(item)} activeOpacity={0.7}>
                <View style={styles.row}>
                    <View style={styles.tableTag}>
                        <Text style={styles.tableTagText}>T{item.tableNumber}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                    </View>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.items}>{item.items.length} items</Text>
                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={styles.total}>{inrFormat(item.totalAmountINR)}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Text style={styles.title}>My Orders</Text>
            <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                refreshing={isLoading}
                onRefresh={() => userId && fetchMyOrders(userId)}
                renderItem={renderOrder}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.empty}>No orders yet today.</Text>
                        <Text style={styles.emptyHint}>Tap a table to start taking orders.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    tableTag: { backgroundColor: Colors.maroon + '15', borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 2 },
    tableTagText: { fontSize: FontSize.md, fontWeight: '800', color: Colors.maroon },
    statusBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 2 },
    statusText: { fontSize: FontSize.xs, fontWeight: '700' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
    items: { fontSize: FontSize.sm, color: Colors.gray500 },
    time: { fontSize: FontSize.sm, color: Colors.gray400 },
    total: { fontSize: FontSize.md, fontWeight: '900', color: Colors.maroon, marginTop: Spacing.xs },
    emptyBox: { alignItems: 'center', marginTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
    empty: { fontSize: FontSize.base, color: Colors.gray500, fontWeight: '600' },
    emptyHint: { fontSize: FontSize.sm, color: Colors.gray400, marginTop: Spacing.xs },
});
