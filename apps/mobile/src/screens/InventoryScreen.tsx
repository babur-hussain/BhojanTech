import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Vibration, ScrollView,
} from 'react-native';
import { InventoryItem, StockStatus } from '@restaurant/types';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@restaurant/types';

type EnrichedItem = InventoryItem & { status: StockStatus };

const MOCK_ITEMS: EnrichedItem[] = [
  { id:'i1', restaurantId:'r1', name:'Paneer',       category:'Dairy',      unit:'kg',     currentQty:4.5,  minThreshold:2,  reorderQty:10, costPerUnit:280, isActive:true, linkedMenuItems:[], status:'HEALTHY', createdAt:new Date(), updatedAt:new Date() } as any,
  { id:'i2', restaurantId:'r1', name:'Tomatoes',     category:'Vegetables', unit:'kg',     currentQty:1.2,  minThreshold:3,  reorderQty:15, costPerUnit:30,  isActive:true, linkedMenuItems:[], status:'LOW',     createdAt:new Date(), updatedAt:new Date() } as any,
  { id:'i3', restaurantId:'r1', name:'Cooking Oil',  category:'Oil',        unit:'litres', currentQty:0.5,  minThreshold:5,  reorderQty:20, costPerUnit:110, isActive:true, linkedMenuItems:[], status:'CRITICAL',createdAt:new Date(), updatedAt:new Date() } as any,
  { id:'i4', restaurantId:'r1', name:'Basmati Rice', category:'Grains',     unit:'kg',     currentQty:25,   minThreshold:10, reorderQty:50, costPerUnit:85,  isActive:true, linkedMenuItems:[], status:'HEALTHY', createdAt:new Date(), updatedAt:new Date() } as any,
];

function stockColor(status: StockStatus) {
  if (status === 'HEALTHY') return '#16a34a';
  if (status === 'LOW')     return '#d97706';
  return '#dc2626';
}

function stockPct(item: EnrichedItem) {
  const max = item.minThreshold * 4;
  return Math.min(1, item.currentQty / Math.max(max, 0.001));
}

export default function InventoryScreen() {
  const { user } = useAuth();
  const [items, setItems]       = useState<EnrichedItem[]>(MOCK_ITEMS);
  const [search, setSearch]     = useState('');
  const [addModal, setAddModal] = useState<EnrichedItem | null>(null);
  const [qty, setQty]           = useState('');

  const canManage = user?.role === UserRole.OWNER || user?.role === UserRole.MANAGER;

  const critical = items.filter(i => i.status === 'CRITICAL');
  const low      = items.filter(i => i.status === 'LOW');

  // Vibrate if there are critical items
  useEffect(() => {
    if (critical.length > 0) Vibration.vibrate([200, 100, 200]);
  }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddStock = () => {
    if (!addModal || !qty || +qty <= 0) return;
    setItems(prev => prev.map(i => {
      if (i.id !== addModal.id) return i;
      const newQty = +(i.currentQty + +qty).toFixed(3);
      const s: StockStatus = newQty <= 0 ? 'CRITICAL' : newQty <= i.minThreshold ? 'LOW' : 'HEALTHY';
      return { ...i, currentQty: newQty, status: s };
    }));
    Alert.alert('Success', `Added ${qty} ${addModal.unit} of ${addModal.name}`);
    setAddModal(null);
    setQty('');
    // Real: POST /api/inventory/stock/add
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Inventory</Text>
        {(critical.length + low.length) > 0 && (
          <View style={s.alertBadge}>
            <Text style={s.alertBadgeText}>{critical.length + low.length}</Text>
          </View>
        )}
      </View>

      {/* Alert Banner */}
      {critical.length > 0 && (
        <View style={s.alertBanner}>
          <Text style={s.alertText}>🚨 {critical.length} items are out of stock!</Text>
        </View>
      )}

      {/* Search */}
      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder="Search items…"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={s.statsRow}>
            <StatCard label="Total Items" value={String(items.length)} color="#1e40af" />
            <StatCard label="Low Stock"   value={String(low.length)}      color="#d97706" />
            <StatCard label="Critical"    value={String(critical.length)} color="#dc2626" />
          </View>
        }
        renderItem={({ item }) => {
          const pct = stockPct(item);
          const col = stockColor(item.status);
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{item.name}</Text>
                  <Text style={s.itemCat}>{item.category}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: col + '22' }]}>
                  <Text style={[s.statusText, { color: col }]}>{item.status}</Text>
                </View>
              </View>

              {/* Stock bar */}
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: col }]} />
              </View>

              <View style={s.qtyRow}>
                <Text style={s.qtyText}>
                  <Text style={{ fontWeight: 'bold', color: col }}>{item.currentQty}</Text>
                  {` ${item.unit}`}
                </Text>
                <Text style={s.thresholdText}>Min: {item.minThreshold} {item.unit}</Text>
              </View>

              <Text style={s.costText}>₹{item.costPerUnit}/{item.unit} · Total: ₹{(item.currentQty * item.costPerUnit).toFixed(0)}</Text>

              {canManage && (
                <TouchableOpacity style={s.addBtn} onPress={() => { setAddModal(item); setQty(''); }}>
                  <Text style={s.addBtnText}>+ Add Stock</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Add Stock Bottom Sheet */}
      {addModal && (
        <View style={s.bottomSheet}>
          <Text style={s.sheetTitle}>Add Stock — {addModal.name}</Text>
          <Text style={s.sheetSub}>Current: {addModal.currentQty} {addModal.unit}</Text>
          <TextInput
            style={s.sheetInput}
            placeholder={`Quantity (${addModal.unit})`}
            keyboardType="decimal-pad"
            value={qty}
            onChangeText={setQty}
            autoFocus
          />
          <View style={s.sheetBtns}>
            <TouchableOpacity style={s.sheetCancel} onPress={() => setAddModal(null)}>
              <Text style={{ color: '#555' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetSave} onPress={handleAddStock}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.statCard, { borderTopColor: color }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#FFF8F0' },
  header:        { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#800000', flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  headerTitle:   { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  alertBadge:    { backgroundColor: '#dc2626', width: 22, height: 22, borderRadius: 11, alignItems:'center', justifyContent:'center' },
  alertBadgeText:{ color:'#fff', fontSize: 12, fontWeight:'bold' },
  alertBanner:   { backgroundColor:'#fef2f2', borderBottomWidth:1, borderBottomColor:'#fecaca', padding:12 },
  alertText:     { color:'#dc2626', fontWeight:'600', fontSize:13 },
  searchBar:     { padding:12, backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#eee' },
  searchInput:   { backgroundColor:'#f5f5f5', borderRadius:8, paddingHorizontal:12, paddingVertical:8, fontSize:14 },
  list:          { padding:12, paddingBottom:40 },
  statsRow:      { flexDirection:'row', gap:8, marginBottom:16 },
  statCard:      { flex:1, backgroundColor:'#fff', borderRadius:8, padding:12, borderTopWidth:3, elevation:2, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:4 },
  statValue:     { fontSize:22, fontWeight:'900' },
  statLabel:     { fontSize:11, color:'#777', marginTop:2 },
  card:          { backgroundColor:'#fff', borderRadius:12, padding:14, marginBottom:12, elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4 },
  cardHeader:    { flexDirection:'row', alignItems:'flex-start', marginBottom:8 },
  itemName:      { fontWeight:'bold', fontSize:16, color:'#1f2937' },
  itemCat:       { fontSize:11, color:'#9ca3af', marginTop:2 },
  statusBadge:   { paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  statusText:    { fontSize:11, fontWeight:'700' },
  barBg:         { height:6, backgroundColor:'#f3f4f6', borderRadius:3, marginBottom:6, overflow:'hidden' },
  barFill:       { height:'100%', borderRadius:3 },
  qtyRow:        { flexDirection:'row', justifyContent:'space-between', marginBottom:4 },
  qtyText:       { fontSize:13, color:'#374151' },
  thresholdText: { fontSize:12, color:'#9ca3af' },
  costText:      { fontSize:11, color:'#9ca3af', marginBottom:10 },
  addBtn:        { backgroundColor:'#16a34a', paddingVertical:8, borderRadius:8, alignItems:'center' },
  addBtnText:    { color:'#fff', fontWeight:'bold', fontSize:13 },
  bottomSheet:   { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#fff', borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, elevation:20, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:10 },
  sheetTitle:    { fontSize:17, fontWeight:'bold', marginBottom:4 },
  sheetSub:      { fontSize:12, color:'#9ca3af', marginBottom:16 },
  sheetInput:    { borderWidth:1, borderColor:'#d1d5db', borderRadius:10, paddingHorizontal:14, paddingVertical:12, fontSize:18, marginBottom:16 },
  sheetBtns:     { flexDirection:'row', gap:12 },
  sheetCancel:   { flex:1, backgroundColor:'#f3f4f6', borderRadius:10, padding:12, alignItems:'center' },
  sheetSave:     { flex:1, backgroundColor:'#16a34a', borderRadius:10, padding:12, alignItems:'center' },
});
