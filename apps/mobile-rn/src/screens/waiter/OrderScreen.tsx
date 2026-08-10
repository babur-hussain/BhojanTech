import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useMenuStore } from '../../store/menuStore';
import { useOrders } from '../../hooks/useOrders';
import MenuItemCard from '../../components/MenuItemCard';
import { MenuItem, OrderItem } from '../../types';
import { inrFormat } from '../../utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import ItemBottomSheet from '../../components/ItemBottomSheet';

export default function OrderScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { tableId, tableNumber, orderId: existingOrderId } = route.params;
    const { categories, items, fetchMenu } = useMenuStore();
    const { createOrder, addItemsToOrder, isSubmitting } = useOrders();
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [orderId, setOrderId] = useState<string | null>(existingOrderId || null);
    const [selectedItemForSheet, setSelectedItemForSheet] = useState<MenuItem | null>(null);

    useEffect(() => { fetchMenu(); }, []);

    const filteredItems = useMemo(() => {
        return selectedCatId
            ? items.filter((i) => i.categoryId === selectedCatId && i.isAvailable)
            : items.filter((i) => i.isAvailable);
    }, [selectedCatId, items]);

    const handleItemPress = (item: MenuItem) => {
        ReactNativeHapticFeedback.trigger('impactLight');
        setSelectedItemForSheet(item);
    };

    const handleAddItem = (variant: any, quantity: number, notes: string) => {
        const item = selectedItemForSheet!;
        ReactNativeHapticFeedback.trigger('impactLight');
        const existing = cart.find((c) => c.menuItemId === item.id && c.variantName === variant.name);
        if (existing) {
            setCart(cart.map((c) =>
                c.menuItemId === item.id && c.variantName === variant.name
                    ? { ...c, quantity: c.quantity + quantity }
                    : c
            ));
        } else {
            setCart([...cart, {
                id: Math.random().toString(36).slice(2),
                menuItemId: item.id,
                name: item.name,
                variantName: variant.name,
                quantity: quantity,
                priceAtOrderTime: variant.priceINR,
                sentToKitchen: false,
            }]);
        }
    };

    const cartTotal = useMemo(() =>
        cart.reduce((sum, c) => sum + c.priceAtOrderTime * c.quantity, 0), [cart]
    );

    const handleProceed = () => {
        if (cart.length === 0) return;
        navigation.navigate('OrderSummary', { tableId, tableNumber, orderId, cart });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Table {tableNumber}</Text>
            </View>

            {/* Category Pills */}
            <FlatList
                horizontal
                data={[{ id: null, name: 'All' }, ...categories.map((c) => ({ id: c.id, name: c.name }))]}
                keyExtractor={(item) => item.id || 'all'}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catList}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.catPill, selectedCatId === item.id && styles.catPillActive]}
                        onPress={() => setSelectedCatId(item.id)}
                    >
                        <Text style={[styles.catText, selectedCatId === item.id && styles.catTextActive]}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />

            {/* Menu Grid */}
            <FlatList
                data={filteredItems}
                numColumns={2}
                columnWrapperStyle={styles.row}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
                renderItem={({ item }) => (
                    <View style={styles.cardWrapper}>
                        <MenuItemCard item={item} onPress={handleItemPress} />
                    </View>
                )}
            />

            {/* Cart Footer */}
            {cart.length > 0 && (
                <Animated.View entering={SlideInDown.duration(300)} exiting={SlideOutDown.duration(300)} style={styles.cartBarWrapper}>
                    <TouchableOpacity style={styles.cartBar} onPress={handleProceed}>
                        <Text style={styles.cartCount}>{cart.reduce((s, c) => s + c.quantity, 0)} items</Text>
                        <Text style={styles.cartTotal}>{inrFormat(cartTotal)} → Review Order</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Bottom Sheet for Variants */}
            {selectedItemForSheet && (
                <ItemBottomSheet
                    item={selectedItemForSheet}
                    visible={!!selectedItemForSheet}
                    onClose={() => setSelectedItemForSheet(null)}
                    onAdd={handleAddItem}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    back: { fontSize: FontSize.base, color: Colors.saffron, fontWeight: '600', marginRight: Spacing.md },
    title: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.maroon },
    catList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
    catPill: { backgroundColor: Colors.white, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200 },
    catPillActive: { backgroundColor: Colors.saffron, borderColor: Colors.saffron },
    catText: { fontSize: FontSize.sm, color: Colors.gray600, fontWeight: '500' },
    catTextActive: { color: Colors.white, fontWeight: '700' },
    row: { justifyContent: 'space-between' },
    cardWrapper: { width: '48%', marginBottom: Spacing.md },
    cartBarWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    cartBar: { backgroundColor: Colors.saffron, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl },
    cartCount: { color: Colors.white, fontWeight: '600', fontSize: FontSize.base },
    cartTotal: { color: Colors.white, fontWeight: '800', fontSize: FontSize.md },
});
