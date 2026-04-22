import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';
import { KOT, KOTItem } from '../types';
import { timeAgo } from '../utils/formatters';

const ITEM_STATUS_COLORS = {
    PENDING: Colors.kdsPending,
    PREPARING: Colors.kdsPreparing,
    READY: Colors.kdsReady,
};

interface KOTCardProps {
    kot: KOT;
    onItemPress: (kotId: string, item: KOTItem) => void;
}

function KOTCard({ kot, onItemPress }: KOTCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.tableNumber}>Table {kot.tableNumber}</Text>
                <Text style={styles.time}>{timeAgo(kot.createdAt)}</Text>
            </View>
            <Text style={styles.waiter}>Waiter: {kot.waiterName}</Text>

            {kot.items.map((item) => (
                <TouchableOpacity
                    key={item._id || item.orderItemId}
                    style={[styles.itemRow, { borderLeftColor: ITEM_STATUS_COLORS[item.status] }]}
                    onPress={() => onItemPress(kot.id, item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>
                            {item.quantity}× {item.name}
                            {item.variantName ? ` (${item.variantName})` : ''}
                        </Text>
                        {item.notes && <Text style={styles.itemNotes}>📝 {item.notes}</Text>}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: ITEM_STATUS_COLORS[item.status] + '30', borderColor: ITEM_STATUS_COLORS[item.status] }]}>
                        <Text style={[styles.statusText, { color: ITEM_STATUS_COLORS[item.status] }]}>{item.status}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

export default React.memo(KOTCard);

const styles = StyleSheet.create({
    card: { backgroundColor: Colors.kdsCard, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.saffron },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tableNumber: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.kdsText },
    time: { fontSize: FontSize.sm, color: Colors.gray400 },
    waiter: { fontSize: FontSize.sm, color: Colors.gray400, marginBottom: Spacing.md },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderLeftWidth: 3, paddingLeft: Spacing.md, marginBottom: Spacing.xs },
    itemInfo: { flex: 1 },
    itemName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.kdsText },
    itemNotes: { fontSize: FontSize.sm, color: Colors.warning, marginTop: 2 },
    statusBadge: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    statusText: { fontSize: FontSize.xs, fontWeight: '800' },
});
