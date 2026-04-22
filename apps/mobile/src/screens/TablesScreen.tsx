import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Table } from '@restaurant/types';
import { useNavigation } from '@react-navigation/native';
// import { io } from 'socket.io-client';

export default function TablesScreen() {
  const [tables, setTables] = useState<Table[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Mock fetch
    setTables([
      { id: 't1', restaurantId: 'r1', number: 'T1', capacity: 4, status: 'AVAILABLE' },
      { id: 't2', restaurantId: 'r1', number: 'T2', capacity: 2, status: 'OCCUPIED', seatedAt: new Date(Date.now() - 45 * 60000), currentOrderId: 'o1' },
      { id: 't3', restaurantId: 'r1', number: 'T3', capacity: 6, status: 'RESERVED' },
    ]);

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTurnTime = (seatedAt?: Date) => {
    if (!seatedAt) return '';
    const diffMins = Math.floor((currentTime.getTime() - seatedAt.getTime()) / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tables Floor Plan</Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: 'green'}]} /><Text>Available</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: 'red'}]} /><Text>Occupied</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: 'orange'}]} /><Text>Reserved</Text></View>
      </View>

      <FlatList
        data={tables}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('OrderStack', { screen: 'OrderDetails', params: { tableId: item.id } })}
            style={[
              styles.tableCard,
              item.status === 'AVAILABLE' ? styles.tableAvailable :
              item.status === 'OCCUPIED' ? styles.tableOccupied : styles.tableReserved
            ]}
          >
            <Text style={styles.tableNumber}>{item.number}</Text>
            <Text style={styles.tableCapacity}>{item.capacity} Seats</Text>
            
            {item.status === 'OCCUPIED' && item.seatedAt && (
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{formatTurnTime(item.seatedAt)}</Text>
              </View>
            )}
            <Text style={[styles.statusText, { color: item.status === 'AVAILABLE' ? 'green' : item.status === 'OCCUPIED' ? '#800000' : 'orange' }]}>
              {item.status === 'AVAILABLE' ? 'Open' : item.status === 'OCCUPIED' ? 'Occupied' : 'Reserved'}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { padding: 16, backgroundColor: '#800000', paddingTop: 60 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  legend: { flexDirection: 'row', justifyContent: 'center', padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  listContainer: { padding: 12 },
  tableCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    height: 140,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableAvailable: { borderColor: 'green' },
  tableOccupied: { borderColor: 'red', backgroundColor: '#FFF0F0' },
  tableReserved: { borderColor: 'orange', backgroundColor: '#FFFDF0' },
  tableNumber: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  tableCapacity: { fontSize: 12, color: '#666', marginBottom: 8 },
  timeBadge: { backgroundColor: '#FFD0D0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 4 },
  timeText: { fontSize: 12, fontWeight: 'bold', color: '#800000' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
});
