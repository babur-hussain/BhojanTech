import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MenuItem, MenuCategory, OrderItem } from '@restaurant/types';

export default function OrderScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tableId } = route.params || { tableId: 'Unknown' };

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  // Variant selection modal
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    // Mock fetch
    setCategories([{ id: '1', restaurantId: 'r1', name: 'Starters', order: 0, isAvailable: true, createdAt: new Date(), updatedAt: new Date() }]);
    setMenuItems([
      { id: 'i1', restaurantId: 'r1', categoryId: '1', name: 'Paneer Tikka', isVeg: true, variants: [{ name: 'Half', priceINR: 150 }, { name: 'Full', priceINR: 280 }], gstSlab: 5, isAvailable: true, allergenTags: [], createdAt: new Date(), updatedAt: new Date() }
    ]);
    setSelectedCategoryId('1');
  }, []);

  const handleAddItem = (item: MenuItem, variantName?: string) => {
    const variant = variantName ? item.variants.find(v => v.name === variantName) : item.variants[0];
    if (!variant) return;

    setOrderItems([...orderItems, {
      id: Math.random().toString(),
      menuItemId: item.id,
      name: item.name,
      variantName: variant.name,
      quantity: 1,
      priceAtOrderTime: variant.priceINR,
      sentToKitchen: false
    }]);
    setSelectedMenuItem(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const handleSendToKitchen = () => {
    const itemsToSend = orderItems.filter(i => !i.sentToKitchen);
    if (itemsToSend.length === 0) return;
    
    Alert.alert('Success', `KOT generated for ${itemsToSend.length} items`);
    setOrderItems(orderItems.map(i => ({ ...i, sentToKitchen: true })));
  };

  const filteredMenu = menuItems.filter(i => i.categoryId === selectedCategoryId);
  const totalAmount = orderItems.reduce((sum, item) => sum + (item.priceAtOrderTime * item.quantity), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Table {tableId}</Text>
        <Text style={styles.totalText}>₹{totalAmount}</Text>
      </View>

      {/* Order Summary Area */}
      <View style={styles.orderSummary}>
        <FlatList
          data={orderItems}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={{padding: 20, textAlign:'center'}}>No items in order</Text>}
          renderItem={({ item }) => (
            <View style={[styles.orderItemRow, item.sentToKitchen && styles.sentItem]}>
              <View style={{flex: 1}}>
                <Text style={styles.orderItemName}>{item.name}</Text>
                {item.variantName && item.variantName !== 'Regular' && <Text style={{fontSize:12, color:'#666'}}>{item.variantName}</Text>}
              </View>
              <View style={styles.qtyContainer}>
                <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} disabled={item.sentToKitchen} style={styles.qtyBtn}><Text style={styles.qtyText}>-</Text></TouchableOpacity>
                <Text style={styles.qtyValue}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} disabled={item.sentToKitchen} style={styles.qtyBtn}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
              </View>
              <Text style={styles.itemTotal}>₹{item.priceAtOrderTime * item.quantity}</Text>
            </View>
          )}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, orderItems.filter(i => !i.sentToKitchen).length === 0 && styles.sendBtnDisabled]}
          onPress={handleSendToKitchen}
          disabled={orderItems.filter(i => !i.sentToKitchen).length === 0}
        >
          <Text style={styles.sendBtnText}>Send to Kitchen</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Area */}
      <View style={styles.menuArea}>
        <View style={styles.catTabs}>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={categories} keyExtractor={c=>c.id} renderItem={({item}) => (
            <TouchableOpacity onPress={() => setSelectedCategoryId(item.id)} style={[styles.catTab, selectedCategoryId===item.id && styles.catTabActive]}>
              <Text style={[styles.catText, selectedCategoryId===item.id && styles.catTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          )} />
        </View>
        <FlatList data={filteredMenu} keyExtractor={i=>i.id} numColumns={2} renderItem={({item}) => (
          <TouchableOpacity style={styles.menuItemCard} onPress={() => item.variants.length > 1 ? setSelectedMenuItem(item) : handleAddItem(item)}>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:4}}>
              <View style={[styles.vegIndicator, {borderColor: item.isVeg?'green':'red'}]}><View style={[styles.vegDot, {backgroundColor: item.isVeg?'green':'red'}]} /></View>
              <Text style={{fontWeight:'bold', color:'#800000'}}>₹{item.variants[0].priceINR}</Text>
            </View>
            <Text style={{fontWeight:'bold'}}>{item.name}</Text>
          </TouchableOpacity>
        )} />
      </View>

      {/* Variant Modal */}
      {selectedMenuItem && (
        <Modal transparent animationType="slide" visible={true}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedMenuItem.name} - Select Variant</Text>
              {selectedMenuItem.variants.map(v => (
                <TouchableOpacity key={v.name} style={styles.variantBtn} onPress={() => handleAddItem(selectedMenuItem, v.name)}>
                  <Text>{v.name}</Text>
                  <Text style={{fontWeight:'bold', color:'#800000'}}>₹{v.priceINR}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{marginTop:20, alignItems:'center'}} onPress={() => setSelectedMenuItem(null)}><Text style={{color:'#666', padding:10}}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { padding: 16, backgroundColor: '#800000', paddingTop: 60, flexDirection: 'row', justifyContent:'space-between', alignItems:'center' },
  backBtn: { color: '#FFF', fontSize: 16 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  totalText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  orderSummary: { flex: 0.4, borderBottomWidth: 1, borderBottomColor: '#DDD', backgroundColor: '#FAFAFA' },
  orderItemRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems:'center' },
  sentItem: { opacity: 0.5 },
  orderItemName: { fontWeight: 'bold', fontSize: 14 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CCC', borderRadius: 4, marginHorizontal: 12 },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#F0F0F0' },
  qtyText: { fontSize: 18, fontWeight: 'bold' },
  qtyValue: { paddingHorizontal: 12, fontWeight: 'bold' },
  itemTotal: { fontWeight: 'bold', width: 60, textAlign: 'right' },
  
  sendBtn: { backgroundColor: 'green', padding: 16, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  menuArea: { flex: 0.6, backgroundColor: '#FFF8F0' },
  catTabs: { paddingVertical: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  catTab: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 8, borderRadius: 20, backgroundColor: '#EEE' },
  catTabActive: { backgroundColor: '#FF9933' },
  catText: { color: '#333' },
  catTextActive: { color: '#FFF', fontWeight: 'bold' },
  
  menuItemCard: { flex: 1, margin: 8, padding: 12, backgroundColor: '#FFF', borderRadius: 8, elevation: 2, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:2 },
  vegIndicator: { width: 14, height: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  vegDot: { width: 8, height: 8, borderRadius: 4 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  variantBtn: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderColor: '#EEE', borderRadius: 8, marginBottom: 8 }
});
