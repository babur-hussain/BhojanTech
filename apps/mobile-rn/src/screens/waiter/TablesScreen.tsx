import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useTablesStore } from '../../store/tablesStore';
import TableCard from '../../components/TableCard';
import { Table } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function TablesScreen() {
    const { tables, isLoading, fetchTables } = useTablesStore();
    const navigation = useNavigation<any>();

    useEffect(() => { fetchTables(); }, []);

    const handleTablePress = (table: Table) => {
        if (table.status === 'OCCUPIED' && table.currentOrderId) {
            // Go to existing order
            navigation.navigate('OrderScreen', { tableId: table.id, tableNumber: table.number, orderId: table.currentOrderId });
        } else {
            // New order for this table
            navigation.navigate('OrderScreen', { tableId: table.id, tableNumber: table.number });
        }
    };

    const handleScanQR = () => {
        // Navigate to QR scanner
        // In production, use react-native-vision-camera to scan QR on physical table
        // The QR encodes the table number/ID
        // For now, alert as stub
        alert('QR Scanner: Would open camera to scan table QR code');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>My Tables</Text>
                <TouchableOpacity style={styles.qrButton} onPress={handleScanQR}>
                    <Text style={styles.qrButtonText}>📷 Scan QR</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={tables}
                numColumns={2}
                columnWrapperStyle={styles.row}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                refreshing={isLoading}
                onRefresh={fetchTables}
                renderItem={({ item }) => <TableCard table={item} onPress={handleTablePress} />}
                ListEmptyComponent={<Text style={styles.empty}>No tables found.</Text>}
                // Performance: provide fixed layout for FlatList
                getItemLayout={(data, index) => ({ length: 120, offset: 120 * index, index })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon },
    qrButton: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    qrButtonText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
    row: { justifyContent: 'space-between' },
    empty: { textAlign: 'center', color: Colors.gray400, marginTop: 48, fontSize: FontSize.base },
});
