import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Switch, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useMenuStore } from '../../store/menuStore';
import { MenuItem } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { inrFormat } from '../../utils/formatters';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export default function MenuManageScreen() {
    const { categories, items, isLoading, fetchMenu, toggleItemAvailability, addItem, deleteItem, addCategory, deleteCategory } = useMenuStore();
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [showAddItem, setShowAddItem] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);

    // Add Item form state
    const [itemName, setItemName] = useState('');
    const [itemHindi, setItemHindi] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemIsVeg, setItemIsVeg] = useState(true);
    const [itemCatId, setItemCatId] = useState('');
    const [saving, setSaving] = useState(false);

    // Add Category form state
    const [catName, setCatName] = useState('');
    const [catStation, setCatStation] = useState('');

    useEffect(() => { fetchMenu(); }, []);

    const filteredItems = selectedCatId
        ? items.filter((i) => i.categoryId === selectedCatId)
        : items;

    const handleToggle = async (item: MenuItem) => {
        try {
            await toggleItemAvailability(item.id, !item.isAvailable);
            ReactNativeHapticFeedback.trigger('impactLight');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not toggle');
        }
    };

    const handleAddItem = async () => {
        if (!itemName.trim() || !itemPrice.trim() || !itemCatId) {
            Alert.alert('Error', 'Name, price, and category are required');
            return;
        }
        setSaving(true);
        try {
            await addItem({
                name: itemName.trim(),
                hindiName: itemHindi.trim() || undefined,
                categoryId: itemCatId,
                isVeg: itemIsVeg,
                variants: [{ name: 'Regular', priceINR: parseFloat(itemPrice) }],
                gstSlab: 5,
                isAvailable: true,
                allergenTags: [],
            });
            ReactNativeHapticFeedback.trigger('notificationSuccess');
            setShowAddItem(false);
            setItemName(''); setItemHindi(''); setItemPrice('');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not add item');
        } finally { setSaving(false); }
    };

    const handleDeleteItem = (item: MenuItem) => {
        Alert.alert('Delete Item', `Delete "${item.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: () => deleteItem(item.id).catch(console.warn),
            },
        ]);
    };

    const handleAddCategory = async () => {
        if (!catName.trim()) { Alert.alert('Error', 'Category name is required'); return; }
        setSaving(true);
        try {
            await addCategory(catName.trim(), catStation.trim() || undefined);
            ReactNativeHapticFeedback.trigger('notificationSuccess');
            setShowAddCategory(false);
            setCatName(''); setCatStation('');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not add category');
        } finally { setSaving(false); }
    };

    const handleDeleteCategory = (catId: string, catNameStr: string) => {
        Alert.alert('Delete Category', `Delete "${catNameStr}" and all its items?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(catId).catch(console.warn) },
        ]);
    };

    const renderItem = ({ item }: { item: MenuItem }) => {
        const minPrice = Math.min(...item.variants.map(v => v.priceINR));
        return (
            <View style={[styles.itemCard, !item.isAvailable && styles.itemUnavailable]}>
                <View style={styles.itemLeft}>
                    <View style={[styles.vegDot, { borderColor: item.isVeg ? Colors.vegGreen : Colors.nonVegRed }]}>
                        <View style={[styles.vegInner, { backgroundColor: item.isVeg ? Colors.vegGreen : Colors.nonVegRed }]} />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        {item.hindiName && <Text style={styles.itemHindi}>{item.hindiName}</Text>}
                        <Text style={styles.itemPrice}>{inrFormat(minPrice)}</Text>
                    </View>
                </View>
                <View style={styles.itemRight}>
                    <Switch
                        value={item.isAvailable}
                        onValueChange={() => handleToggle(item)}
                        trackColor={{ false: Colors.gray300, true: Colors.saffron + '60' }}
                        thumbColor={item.isAvailable ? Colors.saffron : Colors.gray400}
                    />
                    <TouchableOpacity onPress={() => handleDeleteItem(item)} style={styles.deleteBtn}>
                        <Text style={styles.deleteText}>🗑</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Menu Management</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.addCatBtn} onPress={() => setShowAddCategory(true)}>
                        <Text style={styles.addCatBtnText}>+ Category</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addItemBtn} onPress={() => {
                        setItemCatId(selectedCatId || categories[0]?.id || '');
                        setShowAddItem(true);
                    }}>
                        <Text style={styles.addItemBtnText}>+ Item</Text>
                    </TouchableOpacity>
                </View>
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
                        onLongPress={() => item.id && handleDeleteCategory(item.id, item.name)}
                    >
                        <Text style={[styles.catText, selectedCatId === item.id && styles.catTextActive]}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />

            {/* Menu Items List */}
            <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}
                refreshing={isLoading}
                onRefresh={fetchMenu}
                renderItem={renderItem}
                ListEmptyComponent={<Text style={styles.empty}>No items. Tap + Item to add.</Text>}
            />

            {/* Add Item Modal */}
            <Modal visible={showAddItem} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Menu Item</Text>
                        <ScrollView>
                            <Text style={styles.fieldLabel}>Item Name *</Text>
                            <TextInput style={styles.fieldInput} value={itemName} onChangeText={setItemName} placeholder="e.g. Paneer Butter Masala" placeholderTextColor={Colors.gray400} />

                            <Text style={styles.fieldLabel}>Hindi Name</Text>
                            <TextInput style={styles.fieldInput} value={itemHindi} onChangeText={setItemHindi} placeholder="e.g. पनीर बटर मसाला" placeholderTextColor={Colors.gray400} />

                            <Text style={styles.fieldLabel}>Price (₹) *</Text>
                            <TextInput style={styles.fieldInput} value={itemPrice} onChangeText={setItemPrice} placeholder="250" placeholderTextColor={Colors.gray400} keyboardType="number-pad" />

                            <Text style={styles.fieldLabel}>Category *</Text>
                            <View style={styles.catSelectRow}>
                                {categories.map(c => (
                                    <TouchableOpacity key={c.id} style={[styles.catSelectPill, itemCatId === c.id && styles.catSelectActive]} onPress={() => setItemCatId(c.id)}>
                                        <Text style={[styles.catSelectText, itemCatId === c.id && { color: Colors.white }]}>{c.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.vegRow}>
                                <Text style={styles.fieldLabel}>Veg / Non-Veg</Text>
                                <View style={styles.vegToggle}>
                                    <TouchableOpacity style={[styles.vegOption, itemIsVeg && styles.vegOptionActive]} onPress={() => setItemIsVeg(true)}>
                                        <Text style={{ color: itemIsVeg ? Colors.white : Colors.vegGreen, fontWeight: '700' }}>🟢 Veg</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.vegOption, !itemIsVeg && styles.nonVegOptionActive]} onPress={() => setItemIsVeg(false)}>
                                        <Text style={{ color: !itemIsVeg ? Colors.white : Colors.nonVegRed, fontWeight: '700' }}>🔴 Non-Veg</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddItem(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAddItem} disabled={saving}>
                                <Text style={styles.saveBtnText}>{saving ? 'Adding...' : 'Add Item'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Category Modal */}
            <Modal visible={showAddCategory} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Category</Text>
                        <Text style={styles.fieldLabel}>Category Name *</Text>
                        <TextInput style={styles.fieldInput} value={catName} onChangeText={setCatName} placeholder="e.g. Main Course" placeholderTextColor={Colors.gray400} />
                        <Text style={styles.fieldLabel}>Kitchen Station</Text>
                        <TextInput style={styles.fieldInput} value={catStation} onChangeText={setCatStation} placeholder="e.g. Tandoor, Wok" placeholderTextColor={Colors.gray400} />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddCategory(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAddCategory} disabled={saving}>
                                <Text style={styles.saveBtnText}>{saving ? 'Adding...' : 'Add Category'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon },
    headerActions: { flexDirection: 'row' },
    addCatBtn: { backgroundColor: Colors.white, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200 },
    addCatBtnText: { color: Colors.gray600, fontWeight: '600', fontSize: FontSize.xs },
    addItemBtn: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    addItemBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
    catList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    catPill: { backgroundColor: Colors.white, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200 },
    catPillActive: { backgroundColor: Colors.saffron, borderColor: Colors.saffron },
    catText: { fontSize: FontSize.sm, color: Colors.gray600, fontWeight: '500' },
    catTextActive: { color: Colors.white, fontWeight: '700' },
    itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    itemUnavailable: { opacity: 0.5 },
    itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    vegDot: { width: 16, height: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    vegInner: { width: 7, height: 7, borderRadius: 4 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
    itemHindi: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 1 },
    itemPrice: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.maroon, marginTop: 2 },
    itemRight: { flexDirection: 'row', alignItems: 'center' },
    deleteBtn: { marginLeft: Spacing.sm, padding: Spacing.xs },
    deleteText: { fontSize: 16 },
    empty: { textAlign: 'center', color: Colors.gray400, marginTop: 48, fontSize: FontSize.base },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xxl },
    modalContent: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl, maxHeight: '80%' },
    modalTitle: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.maroon, marginBottom: Spacing.md },
    fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray600, marginBottom: Spacing.xs, marginTop: Spacing.md },
    fieldInput: { backgroundColor: Colors.gray50, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.base, color: Colors.gray900 },
    catSelectRow: { flexDirection: 'row', flexWrap: 'wrap' },
    catSelectPill: { borderWidth: 1, borderColor: Colors.gray200, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginRight: Spacing.sm, marginBottom: Spacing.xs },
    catSelectActive: { backgroundColor: Colors.saffron, borderColor: Colors.saffron },
    catSelectText: { fontSize: FontSize.xs, color: Colors.gray600 },
    vegRow: { marginTop: Spacing.md },
    vegToggle: { flexDirection: 'row', marginTop: Spacing.xs },
    vegOption: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200, borderRadius: Radius.md, marginRight: Spacing.xs },
    vegOptionActive: { backgroundColor: Colors.vegGreen, borderColor: Colors.vegGreen },
    nonVegOptionActive: { backgroundColor: Colors.nonVegRed, borderColor: Colors.nonVegRed },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xxl },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.gray300, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center', marginRight: Spacing.sm },
    cancelBtnText: { color: Colors.gray600, fontWeight: '600', fontSize: FontSize.base },
    saveBtn: { flex: 1, backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center', marginLeft: Spacing.sm },
    saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});
