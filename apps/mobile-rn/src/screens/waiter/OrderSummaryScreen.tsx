import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useOrders } from '../../hooks/useOrders';
import { OrderItem } from '../../types';
import { inrFormat } from '../../utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function OrderSummaryScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { tableId, tableNumber, orderId: existingOrderId, cart: initialCart } = route.params;
    const [cart, setCart] = useState<OrderItem[]>(initialCart || []);
    const { createOrder, addItemsToOrder, sendKOT, isSubmitting } = useOrders();

    const total = cart.reduce((s, c) => s + c.priceAtOrderTime * c.quantity, 0);

    const handleSendKOT = async () => {
        try {
            let oid = existingOrderId;
            if (!oid) {
                const order = await createOrder(tableId, tableNumber);
                oid = order.id;
            }
            await addItemsToOrder(oid, cart);
            await sendKOT(oid);
            // Strong haptic tap on KOT sent
            // ReactNativeHapticFeedback.trigger('notificationSuccess');
            Alert.alert('KOT Sent! 🎉', 'Order has been sent to the kitchen.', [
                { text: 'OK', onPress: () => navigation.popToTop() },
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not send KOT');
        }
    };

    const updateQty = (id: string, delta: number) => {
        setCart((prev) =>
            prev.map((c) => c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)
        );
    };

    const removeItem = (id: string) => {
        setCart((prev) => prev.filter((c) => c.id !== id));
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Order — Table {tableNumber}</Text>
            </View>

            <FlatList
                data={cart}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                renderItem={({ item }) => (
                    <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            {item.variantName && <Text style={styles.variant}>{item.variantName}</Text>}
                            <Text style={styles.price}>{inrFormat(item.priceAtOrderTime)}</Text>
                        </View>
                        <View style={styles.qtyControl}>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                                <Text style={styles.qtyBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.qty}>{item.quantity}</Text>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                                <Text style={styles.qtyBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => removeItem(item.id)}>
                            <Text style={styles.remove}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>{inrFormat(total)}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.kotBtn, isSubmitting && styles.kotBtnDisabled]}
                    onPress={handleSendKOT}
                    disabled={isSubmitting || cart.length === 0}
                >
                    <Text style={styles.kotBtnText}>{isSubmitting ? 'Sending...' : '🍳 Send to Kitchen (KOT)'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    back: { fontSize: FontSize.base, color: Colors.saffron, fontWeight: '600', marginRight: Spacing.md },
    title: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.maroon },
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    itemInfo: { flex: 1 },
    itemName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
    variant: { fontSize: FontSize.sm, color: Colors.gray400 },
    price: { fontSize: FontSize.sm, color: Colors.maroon, fontWeight: '600', marginTop: 2 },
    qtyControl: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md },
    qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.gray700 },
    qty: { fontSize: FontSize.md, fontWeight: '800', marginHorizontal: Spacing.md, color: Colors.gray900 },
    remove: { fontSize: FontSize.md, color: Colors.error, fontWeight: '700' },
    footer: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray200, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
    totalLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.gray600 },
    totalValue: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon },
    kotBtn: { backgroundColor: Colors.maroon, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center' },
    kotBtnDisabled: { opacity: 0.6 },
    kotBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
});
