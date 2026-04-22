import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';
import { MenuItem, ItemVariant } from '../types';
// In production: import BottomSheet from '@gorhom/bottom-sheet';

interface ItemBottomSheetProps {
    item: MenuItem;
    visible: boolean;
    onClose: () => void;
    onAdd: (variant: ItemVariant, quantity: number, notes: string) => void;
}

export default function ItemBottomSheet({ item, visible, onClose, onAdd }: ItemBottomSheetProps) {
    const [selectedVariant, setSelectedVariant] = useState<ItemVariant>(item.variants[0]);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <TouchableOpacity style={styles.backdrop} onPress={onClose} />
            <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.title}>{item.name}</Text>
                {item.hindiName && <Text style={styles.hindi}>{item.hindiName}</Text>}

                {/* Variant Selector */}
                <Text style={styles.sectionLabel}>Select Size</Text>
                <View style={styles.variantRow}>
                    {item.variants.map((v) => (
                        <TouchableOpacity
                            key={v.name}
                            style={[styles.variantChip, selectedVariant.name === v.name && styles.variantChipActive]}
                            onPress={() => setSelectedVariant(v)}
                        >
                            <Text style={[styles.variantText, selectedVariant.name === v.name && styles.variantTextActive]}>
                                {v.name} — ₹{v.priceINR}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Quantity */}
                <Text style={styles.sectionLabel}>Quantity</Text>
                <View style={styles.qtyRow}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                        <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                </View>

                {/* Special Instructions */}
                <Text style={styles.sectionLabel}>Special Instructions</Text>
                <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Extra spicy, no onion, etc."
                    placeholderTextColor={Colors.gray400}
                    multiline
                />

                {/* Add Button */}
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => { onAdd(selectedVariant, quantity, notes); onClose(); }}
                >
                    <Text style={styles.addBtnText}>Add to Order — ₹{selectedVariant.priceINR * quantity}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xxl, paddingBottom: Spacing.xxxl },
    handle: { width: 40, height: 4, backgroundColor: Colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.gray900 },
    hindi: { fontSize: FontSize.sm, color: Colors.gray400, marginBottom: Spacing.md },
    sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray500, marginTop: Spacing.lg, marginBottom: Spacing.sm },
    variantRow: { flexDirection: 'row', flexWrap: 'wrap' },
    variantChip: { borderWidth: 1, borderColor: Colors.gray200, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginRight: Spacing.sm, marginBottom: Spacing.sm },
    variantChipActive: { borderColor: Colors.saffron, backgroundColor: Colors.saffron + '10' },
    variantText: { fontSize: FontSize.sm, color: Colors.gray600 },
    variantTextActive: { color: Colors.saffron, fontWeight: '700' },
    qtyRow: { flexDirection: 'row', alignItems: 'center' },
    qtyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.gray700 },
    qtyValue: { fontSize: FontSize.xl, fontWeight: '900', marginHorizontal: Spacing.xxl, color: Colors.gray900 },
    notesInput: { backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: Spacing.md, fontSize: FontSize.base, maxHeight: 80 },
    addBtn: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
    addBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
});
