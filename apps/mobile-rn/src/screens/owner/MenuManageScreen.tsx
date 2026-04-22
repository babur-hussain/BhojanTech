import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useMenuStore } from '../../store/menuStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import MenuItemCard from '../../components/MenuItemCard';

export default function MenuManageScreen() {
    const { categories, items, isLoading, fetchMenu } = useMenuStore();
    const [selectedCatId, setSelectedCatId] = React.useState<string | null>(null);

    useEffect(() => { fetchMenu(); }, []);

    const filteredItems = selectedCatId
        ? items.filter((i) => i.categoryId === selectedCatId)
        : items;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Text style={styles.title}>Menu Management</Text>

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

            {/* Menu Items Grid */}
            <FlatList
                data={filteredItems}
                numColumns={2}
                columnWrapperStyle={styles.row}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl }}
                refreshing={isLoading}
                onRefresh={fetchMenu}
                renderItem={({ item }) => (
                    <View style={styles.cardWrapper}>
                        <MenuItemCard item={item} onPress={() => { }} />
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No items found.</Text>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    catList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    catPill: { backgroundColor: Colors.white, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200 },
    catPillActive: { backgroundColor: Colors.saffron, borderColor: Colors.saffron },
    catText: { fontSize: FontSize.sm, color: Colors.gray600, fontWeight: '500' },
    catTextActive: { color: Colors.white, fontWeight: '700' },
    row: { justifyContent: 'space-between' },
    cardWrapper: { width: '48%', marginBottom: Spacing.md },
    empty: { textAlign: 'center', color: Colors.gray400, marginTop: 48, fontSize: FontSize.base },
});
