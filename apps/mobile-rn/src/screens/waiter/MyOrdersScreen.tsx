import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useOrdersStore } from '../../store/ordersStore';
import { inrFormat, timeAgo } from '../../utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyOrdersScreen() {
    const orders = useOrdersStore((s) => s.orders);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Text style={styles.title}>My Orders</Text>
            <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.table}>Table {item.tableNumber}</Text>
                            <Text style={[styles.status, {
                                color: item.status === 'PAID' ? Colors.success
                                    : item.status === 'BILLED' ? Colors.warning
                                        : Colors.info
                            }]}>{item.status}</Text>
                        </View>
                        <Text style={styles.items}>{item.items.length} items  •  {timeAgo(item.createdAt)}</Text>
                        <Text style={styles.total}>{inrFormat(item.totalAmountINR)}</Text>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No orders yet today.</Text>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
    table: { fontSize: FontSize.md, fontWeight: '800', color: Colors.gray900 },
    status: { fontSize: FontSize.sm, fontWeight: '700' },
    items: { fontSize: FontSize.sm, color: Colors.gray400 },
    total: { fontSize: FontSize.md, fontWeight: '900', color: Colors.maroon, marginTop: Spacing.sm },
    empty: { textAlign: 'center', color: Colors.gray400, marginTop: 48, fontSize: FontSize.base },
});
