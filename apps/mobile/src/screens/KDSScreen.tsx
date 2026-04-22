import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Vibration,
  Alert,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { KOT, KOTItem } from '@restaurant/types';
import { useAuth } from '../context/AuthContext';

// In a real app: import { io } from 'socket.io-client';
// const socket = io('http://your-backend-url');

const MOCK_KOTS: KOT[] = [
  {
    id: 'k1',
    restaurantId: 'r1',
    orderId: 'o1',
    tableNumber: '12',
    waiterName: 'Rahul',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3 * 60000),
    items: [
      {
        orderItemId: '1', menuItemId: 'm1', categoryId: 'c1', station: 'Tandoor',
        name: 'Paneer Tikka', quantity: 2, status: 'PENDING', notes: 'Extra spicy',
      },
      {
        orderItemId: '2', menuItemId: 'm2', categoryId: 'c2', station: 'Curry',
        name: 'Dal Makhani', quantity: 1, status: 'PENDING',
      },
    ],
  },
  {
    id: 'k2',
    restaurantId: 'r1',
    orderId: 'o2',
    tableNumber: '7',
    waiterName: 'Amit',
    status: 'PREPARING',
    createdAt: new Date(Date.now() - 18 * 60000),
    items: [
      {
        orderItemId: '3', menuItemId: 'm3', categoryId: 'c3', station: 'Curry',
        name: 'Butter Chicken', variantName: 'Full', quantity: 1, status: 'PREPARING', notes: 'No bone',
      },
    ],
  },
];

const STATIONS = ['ALL', 'Tandoor', 'Curry', 'Drinks', 'Dessert'];

export default function KDSScreen() {
  const { user } = useAuth();
  const [kots, setKots] = useState<KOT[]>(MOCK_KOTS);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stationFilter, setStationFilter] = useState('ALL');
  const newKotFlash = useRef(new Animated.Value(0)).current;

  // Tick every 30s to update elapsed times
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Socket.io hookup (pseudo-code — replace with real socket)
  useEffect(() => {
    // socket.emit('join_restaurant', user?.restaurantId);
    //
    // socket.on('kot_created', (kot: KOT) => {
    //   handleNewKOT(kot);
    // });
    //
    // socket.on('kot_update', ({ kot }: { kot: KOT }) => {
    //   setKots(prev => prev.map(k => k.id === kot.id ? kot : k));
    // });
    //
    // return () => { socket.off('kot_created'); socket.off('kot_update'); };
  }, [user?.restaurantId]);

  const handleNewKOT = useCallback((kot: KOT) => {
    setKots(prev => [kot, ...prev]);
    
    // Vibrate: short-long-short pattern for new order
    if (Platform.OS !== 'web') {
      Vibration.vibrate([200, 100, 400, 100, 200]);
    }

    // Flash animation on new order
    Animated.sequence([
      Animated.timing(newKotFlash, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(newKotFlash, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(newKotFlash, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(newKotFlash, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  }, [newKotFlash]);

  const handleItemTap = (kotId: string, itemId: string, current: KOTItem['status']) => {
    const next: KOTItem['status'] =
      current === 'PENDING' ? 'PREPARING' : current === 'PREPARING' ? 'READY' : 'READY';

    setKots(prev =>
      prev.map(k => {
        if (k.id !== kotId) return k;
        const updatedItems = k.items.map(i =>
          i.orderItemId === itemId ? { ...i, status: next } : i
        );
        const allReady = updatedItems.every(i => i.status === 'READY');
        const anyPreparing = updatedItems.some(i => i.status === 'PREPARING' || i.status === 'READY');
        return {
          ...k,
          items: updatedItems,
          status: allReady ? 'READY' : anyPreparing ? 'PREPARING' : 'PENDING',
        };
      })
    );

    // API call: PATCH /api/kots/:kotId/items/:itemId/status { status: next }
    if (next === 'READY') Vibration.vibrate(100);
  };

  const handleNotifyWaiter = (kot: KOT) => {
    Alert.alert(
      `Table ${kot.tableNumber} Ready`,
      `Notify ${kot.waiterName} that the order is ready?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Notify',
          onPress: () => {
            // API: POST /api/kots/:id/notify
            setKots(prev => prev.filter(k => k.id !== kot.id));
            Vibration.vibrate([100, 50, 100]);
          },
        },
      ]
    );
  };

  const getElapsedInfo = (createdAt: Date) => {
    const mins = Math.floor((currentTime.getTime() - createdAt.getTime()) / 60000);
    if (mins < 10) return { label: `${mins}m`, color: '#16a34a', bgColor: '#166534' };
    if (mins <= 20) return { label: `${mins}m`, color: '#fbbf24', bgColor: '#78350f' };
    return { label: `${mins}m`, color: '#f87171', bgColor: '#7f1d1d' };
  };

  const filteredKots = kots.filter(k => {
    if (stationFilter === 'ALL') return true;
    return k.items.some(i => i.station === stationFilter);
  });

  const flashBg = newKotFlash.interpolate({
    inputRange: [0, 1],
    outputRange: ['#111827', '#7c2d12'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: flashBg as any }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍳 Kitchen Display</Text>
        <Text style={styles.headerSub}>
          {filteredKots.filter(k => k.status === 'PENDING').length} pending
          {' · '}
          {filteredKots.filter(k => k.status === 'PREPARING').length} preparing
        </Text>
      </View>

      {/* Station filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.stationScroll}
        contentContainerStyle={styles.stationRow}
      >
        {STATIONS.map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setStationFilter(s)}
            style={[styles.stationChip, stationFilter === s && styles.stationChipActive]}
          >
            <Text style={[styles.stationText, stationFilter === s && styles.stationTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* KOT List */}
      <FlatList
        data={filteredKots}
        keyExtractor={k => k.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>✅ All clear — kitchen queue is empty!</Text>
          </View>
        }
        renderItem={({ item: kot }) => {
          const timeInfo = getElapsedInfo(kot.createdAt);
          const displayItems =
            stationFilter === 'ALL'
              ? kot.items
              : kot.items.filter(i => i.station === stationFilter);
          const allReady = kot.status === 'READY';

          return (
            <View
              style={[
                styles.kotCard,
                allReady ? styles.kotCardReady :
                kot.status === 'PREPARING' ? styles.kotCardPreparing :
                styles.kotCardPending,
              ]}
            >
              {/* KOT Header */}
              <View style={styles.kotHeader}>
                <View style={styles.tableNumberBadge}>
                  <Text style={styles.tableNumber}>{kot.tableNumber}</Text>
                </View>
                <View style={styles.kotMeta}>
                  <Text style={styles.waiterName}>👤 {kot.waiterName}</Text>
                  <Text style={styles.statusLabel}>
                    {kot.status}
                  </Text>
                </View>
                <View style={[styles.timeBadge, { backgroundColor: timeInfo.bgColor }]}>
                  <Text style={[styles.timeText, { color: timeInfo.color }]}>
                    {timeInfo.label}
                  </Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.itemsContainer}>
                {displayItems.map(item => (
                  <TouchableOpacity
                    key={item.orderItemId}
                    onPress={() => handleItemTap(kot.id, item.orderItemId, item.status)}
                    activeOpacity={0.7}
                    style={[
                      styles.itemRow,
                      item.status === 'PREPARING' && styles.itemPreparing,
                      item.status === 'READY' && styles.itemReady,
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <View style={[
                        styles.statusDot,
                        item.status === 'PENDING' && { backgroundColor: '#ef4444' },
                        item.status === 'PREPARING' && { backgroundColor: '#f59e0b' },
                        item.status === 'READY' && { backgroundColor: '#22c55e' },
                      ]} />
                      <View>
                        <Text style={[
                          styles.itemName,
                          item.status === 'READY' && styles.itemNameDone,
                        ]}>
                          {item.quantity}× {item.name}
                          {item.variantName && item.variantName !== 'Regular' ? ` (${item.variantName})` : ''}
                        </Text>
                        {item.notes ? (
                          <Text style={styles.notesBadge}>⚠️ {item.notes}</Text>
                        ) : null}
                      </View>
                    </View>
                    <Text style={styles.itemStatusIcon}>
                      {item.status === 'PENDING' ? '🔴' : item.status === 'PREPARING' ? '🟡' : '✅'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notify Waiter button — shown when all items ready */}
              {allReady && (
                <TouchableOpacity
                  style={styles.notifyBtn}
                  onPress={() => handleNotifyWaiter(kot)}
                >
                  <Text style={styles.notifyBtnText}>🔔 ORDER READY — NOTIFY WAITER</Text>
                </TouchableOpacity>
              )}

              {/* Demo: add KOT button for testing */}
            </View>
          );
        }}
      />

      {/* Demo button to simulate incoming KOT */}
      <TouchableOpacity
        style={styles.demoBtn}
        onPress={() =>
          handleNewKOT({
            id: `k${Date.now()}`,
            restaurantId: 'r1',
            orderId: `o${Date.now()}`,
            tableNumber: String(Math.floor(Math.random() * 20) + 1),
            waiterName: 'Demo Waiter',
            status: 'PENDING',
            createdAt: new Date(),
            items: [
              {
                orderItemId: String(Date.now()),
                menuItemId: 'm1',
                categoryId: 'c1',
                station: 'Tandoor',
                name: 'Tandoori Chicken',
                variantName: 'Full',
                quantity: 1,
                status: 'PENDING',
                notes: 'Less spicy',
              },
            ],
          })
        }
      >
        <Text style={styles.demoBtnText}>+ Simulate New KOT</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f59e0b',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerSub: {
    color: '#9ca3af',
    fontSize: 13,
  },
  stationScroll: {
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    maxHeight: 52,
  },
  stationRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  stationChip: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    marginRight: 8,
  },
  stationChipActive: {
    backgroundColor: '#92400e',
    borderColor: '#f59e0b',
  },
  stationText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  stationTextActive: {
    color: '#fbbf24',
  },
  list: {
    padding: 12,
    paddingBottom: 100,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
  kotCard: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  kotCardPending: {
    borderColor: '#dc2626',
    backgroundColor: '#1c0a0a',
  },
  kotCardPreparing: {
    borderColor: '#d97706',
    backgroundColor: '#1c1200',
  },
  kotCardReady: {
    borderColor: '#16a34a',
    backgroundColor: '#071d0d',
  },
  kotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: 12,
  },
  tableNumberBadge: {
    backgroundColor: '#fff',
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableNumber: {
    color: '#111',
    fontSize: 26,
    fontWeight: '900',
  },
  kotMeta: {
    flex: 1,
  },
  waiterName: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '600',
  },
  statusLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 1,
  },
  timeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemsContainer: {
    padding: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemPreparing: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  itemReady: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    borderColor: 'rgba(22, 163, 74, 0.2)',
    opacity: 0.6,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  itemName: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
  },
  itemNameDone: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  notesBadge: {
    marginTop: 4,
    color: '#000',
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  itemStatusIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  notifyBtn: {
    margin: 10,
    backgroundColor: '#16a34a',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  notifyBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  demoBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  demoBtnText: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
  },
});
