import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Switch } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { MenuCategory, MenuItem, UserRole } from '@restaurant/types';
// import { io } from 'socket.io-client';

export default function MenuScreen() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const canEdit = user?.role === UserRole.OWNER || user?.role === UserRole.MANAGER;

  useEffect(() => {
    // Mock fetch
    setCategories([
      { id: '1', restaurantId: 'r1', name: 'Starters', order: 0, isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '2', restaurantId: 'r1', name: 'Main Course', order: 1, isAvailable: true, createdAt: new Date(), updatedAt: new Date() }
    ]);
    setItems([
      {
        id: 'i1', restaurantId: 'r1', categoryId: '1', name: 'Paneer Tikka', hindiName: 'पनीर टिक्का',
        isVeg: true, variants: [{ name: 'Half', priceINR: 150 }, { name: 'Full', priceINR: 280 }],
        gstSlab: 5, isAvailable: true, allergenTags: ['Dairy'], createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 'i2', restaurantId: 'r1', categoryId: '2', name: 'Butter Chicken', hindiName: 'बटर चिकन',
        isVeg: false, variants: [{ name: 'Half', priceINR: 350 }, { name: 'Full', priceINR: 600 }],
        gstSlab: 5, isAvailable: false, allergenTags: ['Dairy'], createdAt: new Date(), updatedAt: new Date()
      }
    ]);
    setSelectedCategoryId('1');
  }, []);

  const toggleItemAvailability = (id: string, current: boolean) => {
    if (!canEdit) return;
    setItems(items.map(i => i.id === id ? { ...i, isAvailable: !current } : i));
    // Emit API patch
  };

  const filteredItems = items.filter(i => i.categoryId === selectedCategoryId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu Management</Text>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.categoryTab, selectedCategoryId === item.id && styles.categoryTabActive]}
              onPress={() => setSelectedCategoryId(item.id)}
            >
              <Text style={[styles.categoryText, selectedCategoryId === item.id && styles.categoryTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, !item.isAvailable && styles.itemCardDisabled]}>
            <View style={styles.itemImageContainer}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
            </View>
            <View style={styles.itemInfo}>
              <View style={styles.itemHeaderRow}>
                <View style={styles.titleRow}>
                  <View style={[styles.vegIndicator, { borderColor: item.isVeg ? 'green' : 'red' }]}>
                    <View style={[styles.vegDot, { backgroundColor: item.isVeg ? 'green' : 'red' }]} />
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                {canEdit && (
                  <Switch
                    value={item.isAvailable}
                    onValueChange={() => toggleItemAvailability(item.id, item.isAvailable)}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={item.isAvailable ? '#f5dd4b' : '#f4f3f4'}
                  />
                )}
              </View>
              {item.hindiName && <Text style={styles.itemHindiName}>{item.hindiName}</Text>}
              
              <Text style={styles.itemPrice}>
                {item.variants.length === 1 
                  ? `₹${item.variants[0].priceINR}` 
                  : `₹${Math.min(...item.variants.map(v => v.priceINR))} - ₹${Math.max(...item.variants.map(v => v.priceINR))}`
                }
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { padding: 16, backgroundColor: '#800000', paddingTop: 60 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  categoriesContainer: { paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 8, borderRadius: 20, backgroundColor: '#F0F0F0' },
  categoryTabActive: { backgroundColor: '#FF9933' },
  categoryText: { color: '#333', fontWeight: '500' },
  categoryTextActive: { color: '#FFF', fontWeight: 'bold' },
  listContainer: { padding: 16 },
  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  itemCardDisabled: { opacity: 0.6, backgroundColor: '#F9F9F9' },
  itemImageContainer: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', marginRight: 12 },
  itemImage: { width: '100%', height: '100%' },
  itemImagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 10, color: '#888' },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  vegIndicator: { width: 14, height: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  vegDot: { width: 8, height: 8, borderRadius: 4 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333', flexShrink: 1 },
  itemHindiName: { fontSize: 13, color: '#666', marginTop: 2, marginLeft: 20 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#800000', marginTop: 8, marginLeft: 20 },
});
