import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';
import { KOT, KOTItem } from '../types';
import { timeAgo } from '../utils/formatters';
import { Swipeable } from 'react-native-gesture-handler';

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
    const [isLate, setIsLate] = useState(false);

    useEffect(() => {
        const checkTime = () => {
            const diff = Date.now() - new Date(kot.createdAt).getTime();
            setIsLate(diff > 15 * 60 * 1000); // 15 mins
        };
        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, [kot.createdAt]);

    const renderRightActions = (progress: any, dragX: any, item: KOTItem) => {
        return (
            <TouchableOpacity style={styles.swipeAction} onPress={() => onItemPress(kot.id, item)}>
                <Text style={styles.swipeText}>BUMP</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.card, isLate && styles.cardLate]}>
            <View style={styles.header}>
                <Text style={styles.tableNumber}>Table {kot.tableNumber}</Text>
                <Text style={[styles.time, isLate && styles.timeLate]}>{timeAgo(kot.createdAt)}</Text>
            </View>
            <Text style={styles.waiter}>Waiter: {kot.waiterName}</Text>

            {kot.items.map((item) => (
                <Swipeable
                    key={item._id || item.orderItemId}
                    renderRightActions={(p, d) => renderRightActions(p, d, item)}
                >
                    <TouchableOpacity
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
                </Swipeable>
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
    cardLate: { borderLeftColor: Colors.error, backgroundColor: '#3f1111' },
    timeLate: { color: Colors.error, fontWeight: 'bold' },
    swipeAction: { backgroundColor: Colors.kdsReady, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%' },
    swipeText: { color: Colors.white, fontWeight: '900' },
});
