import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';
import { MenuItem } from '../types';
// import FastImage from 'react-native-fast-image';

interface MenuItemCardProps {
    item: MenuItem;
    onPress: (item: MenuItem) => void;
}

function MenuItemCard({ item, onPress }: MenuItemCardProps) {
    const minPrice = Math.min(...item.variants.map((v) => v.priceINR));
    const maxPrice = Math.max(...item.variants.map((v) => v.priceINR));
    const priceLabel = item.variants.length === 1
        ? `₹${minPrice}`
        : `₹${minPrice} – ₹${maxPrice}`;

    return (
        <TouchableOpacity
            style={[styles.card, !item.isAvailable && styles.unavailable]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            {/* Image */}
            {item.imageUrl ? (
                // Replace with <FastImage source={{ uri: item.imageUrl, priority: 'normal' }} ... />
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
                <View style={styles.imagePlaceholder}>
                    <Text style={{ fontSize: 32 }}>🍽️</Text>
                </View>
            )}

            {/* Veg/Non-Veg Indicator */}
            <View style={[styles.vegIndicator, { borderColor: item.isVeg ? Colors.vegGreen : Colors.nonVegRed }]}>
                <View style={[styles.vegDot, { backgroundColor: item.isVeg ? Colors.vegGreen : Colors.nonVegRed }]} />
            </View>

            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.hindiName && <Text style={styles.hindiName} numberOfLines={1}>{item.hindiName}</Text>}
                <Text style={styles.price}>{priceLabel}</Text>
            </View>

            {!item.isAvailable && (
                <View style={styles.soldOutBadge}>
                    <Text style={styles.soldOutText}>Sold Out</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

export default React.memo(MenuItemCard);

const styles = StyleSheet.create({
    card: { backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
    unavailable: { opacity: 0.5 },
    image: { width: '100%', height: 120, backgroundColor: Colors.gray100 },
    imagePlaceholder: { width: '100%', height: 120, backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' },
    vegIndicator: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, width: 18, height: 18, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
    vegDot: { width: 8, height: 8, borderRadius: 4 },
    content: { padding: Spacing.md },
    name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
    hindiName: { fontSize: FontSize.sm, color: Colors.gray400, marginTop: 2 },
    price: { fontSize: FontSize.base, fontWeight: '800', color: Colors.maroon, marginTop: Spacing.xs },
    soldOutBadge: { position: 'absolute', top: Spacing.sm, right: Spacing.sm, backgroundColor: Colors.error, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    soldOutText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
});
