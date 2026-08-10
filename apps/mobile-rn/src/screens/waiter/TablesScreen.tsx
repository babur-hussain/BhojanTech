import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useTablesStore } from '../../store/tablesStore';
import { Table } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { onSocketEvent } from '../../services/socket';
import { SocketEvents } from '../../constants/socketEvents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import QRScanner from '../../components/QRScanner';

const STATUS_CONFIG = {
    AVAILABLE: { bg: Colors.tableAvailable + '15', border: Colors.tableAvailable, label: 'Open', emoji: '🟢' },
    OCCUPIED: { bg: Colors.tableOccupied + '15', border: Colors.tableOccupied, label: 'Active', emoji: '🔴' },
    RESERVED: { bg: Colors.tableReserved + '15', border: Colors.tableReserved, label: 'Reserved', emoji: '🟡' },
};

type InteractionMode = 'NONE' | 'TRANSFER' | 'MERGE';

export default function TablesScreen() {
    const { tables, isLoading, fetchTables, transferOrder, mergeTable } = useTablesStore();
    const navigation = useNavigation<any>();
    const [mode, setMode] = useState<InteractionMode>('NONE');
    const [sourceTable, setSourceTable] = useState<Table | null>(null);
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        fetchTables();

        // Real-time table status updates
        const unsub = onSocketEvent(SocketEvents.TABLE_STATUS_CHANGED, (data: { tableId: string; status: Table['status']; orderId?: string }) => {
            useTablesStore.getState().updateTableStatus(data.tableId, data.status, data.orderId);
            ReactNativeHapticFeedback.trigger('impactLight');
        });

        return unsub;
    }, []);

    // ─── Reset mode ─────────────────────────────────────────────────────────
    const resetMode = () => {
        setMode('NONE');
        setSourceTable(null);
    };

    // ─── Table Press Handler ────────────────────────────────────────────────
    const handleTablePress = (table: Table) => {
        // Transfer mode: select target
        if (mode === 'TRANSFER' && sourceTable) {
            if (table.id === sourceTable.id) return;
            if (table.status === 'OCCUPIED') {
                Alert.alert('Cannot Transfer', 'Target table is already occupied.');
                return;
            }
            Alert.alert('Transfer Order', `Move order from Table ${sourceTable.number} to Table ${table.number}?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Transfer', onPress: async () => {
                        try {
                            await transferOrder(sourceTable.currentOrderId!, sourceTable.id, table.id);
                            ReactNativeHapticFeedback.trigger('notificationSuccess');
                            resetMode();
                        } catch (e: any) { Alert.alert('Error', e.message); }
                    }
                },
            ]);
            return;
        }

        // Merge mode: select target occupied table
        if (mode === 'MERGE' && sourceTable) {
            if (table.id === sourceTable.id) return;
            if (table.status !== 'OCCUPIED') {
                Alert.alert('Cannot Merge', 'You can only merge with another occupied table.');
                return;
            }
            Alert.alert(
                'Merge Tables',
                `Merge Table ${sourceTable.number} into Table ${table.number}?\n\nAll items from Table ${sourceTable.number} will be moved to Table ${table.number}'s order.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Merge', onPress: async () => {
                            try {
                                await mergeTable(sourceTable.id, table.id);
                                ReactNativeHapticFeedback.trigger('notificationSuccess');
                                resetMode();
                                Alert.alert('Merged ✅', `Table ${sourceTable.number} merged into Table ${table.number}.`);
                            } catch (e: any) { Alert.alert('Error', e.message); }
                        }
                    },
                ]
            );
            return;
        }

        // Normal mode: navigate to order screen
        if (table.status === 'OCCUPIED' && table.currentOrderId) {
            navigation.navigate('OrderScreen', { tableId: table.id, tableNumber: table.number, orderId: table.currentOrderId });
        } else {
            navigation.navigate('OrderScreen', { tableId: table.id, tableNumber: table.number });
        }
    };

    // ─── Long Press Options ─────────────────────────────────────────────────
    const handleLongPress = (table: Table) => {
        if (table.status !== 'OCCUPIED') return;
        ReactNativeHapticFeedback.trigger('impactMedium');
        Alert.alert(`Table ${table.number}`, 'What would you like to do?', [
            {
                text: '🔄 Transfer Order', onPress: () => {
                    setSourceTable(table);
                    setMode('TRANSFER');
                }
            },
            {
                text: '🤝 Merge with Another', onPress: () => {
                    setSourceTable(table);
                    setMode('MERGE');
                }
            },
            {
                text: '💰 Go to Bill', onPress: () => {
                    navigation.navigate('Billing', { orderId: table.currentOrderId });
                }
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    // ─── QR Scanner ─────────────────────────────────────────────────────────
    const handleScanQR = () => {
        setShowScanner(true);
    };

    const handleQRResult = (data: string) => {
        setShowScanner(false);

        // Parse QR data — expected format: restaurantapp://table?id=T5 or just the table number
        let tableNumber: string | null = null;

        try {
            if (data.includes('table')) {
                const url = new URL(data);
                tableNumber = url.searchParams.get('id') || url.searchParams.get('number');
            }
        } catch {
            // Not a URL — treat raw data as table number
            tableNumber = data.replace(/[^a-zA-Z0-9]/g, '');
        }

        if (!tableNumber) {
            Alert.alert('Invalid QR', 'Could not read a table number from this QR code.');
            return;
        }

        // Find the matching table
        const matched = tables.find(
            (t) => t.number === tableNumber || t.id === tableNumber || `T${t.number}` === tableNumber
        );

        if (!matched) {
            Alert.alert('Table Not Found', `No table matching "${tableNumber}" was found.`);
            return;
        }

        ReactNativeHapticFeedback.trigger('impactLight');

        if (matched.status === 'OCCUPIED' && matched.currentOrderId) {
            navigation.navigate('OrderScreen', { tableId: matched.id, tableNumber: matched.number, orderId: matched.currentOrderId });
        } else {
            navigation.navigate('OrderScreen', { tableId: matched.id, tableNumber: matched.number });
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    const openCount = tables.filter(t => t.status === 'AVAILABLE').length;
    const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length;

    const bannerConfig = {
        TRANSFER: { text: `🔄 Select target table for Table ${sourceTable?.number}`, color: Colors.info },
        MERGE: { text: `🤝 Select occupied table to merge with Table ${sourceTable?.number}`, color: Colors.warning },
        NONE: null,
    };
    const banner = bannerConfig[mode];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>My Tables</Text>
                    <Text style={styles.subtitle}>{openCount} open  •  {occupiedCount} active</Text>
                </View>
                <TouchableOpacity style={styles.qrButton} onPress={handleScanQR}>
                    <Text style={styles.qrButtonText}>📷 Scan QR</Text>
                </TouchableOpacity>
            </View>

            {banner && (
                <View style={[styles.modeBanner, { borderColor: banner.color + '40', backgroundColor: banner.color + '15' }]}>
                    <Text style={[styles.modeText, { color: banner.color }]}>{banner.text}</Text>
                    <TouchableOpacity onPress={resetMode}>
                        <Text style={styles.modeCancel}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={tables}
                numColumns={2}
                columnWrapperStyle={styles.row}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                refreshing={isLoading}
                onRefresh={fetchTables}
                renderItem={({ item }) => {
                    const config = STATUS_CONFIG[item.status];
                    const isTarget = mode !== 'NONE' && item.id !== sourceTable?.id;
                    const highlightTarget =
                        (mode === 'TRANSFER' && isTarget && item.status === 'AVAILABLE') ||
                        (mode === 'MERGE' && isTarget && item.status === 'OCCUPIED');
                    return (
                        <TouchableOpacity
                            style={[
                                styles.tableCard,
                                { backgroundColor: config.bg, borderColor: config.border },
                                highlightTarget && styles.tableCardHighlight,
                            ]}
                            onPress={() => handleTablePress(item)}
                            onLongPress={() => handleLongPress(item)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.tableNum}>T{item.number}</Text>
                            <Text style={styles.tableCapacity}>👤 {item.capacity}</Text>
                            <View style={styles.statusRow}>
                                <Text style={styles.statusEmoji}>{config.emoji}</Text>
                                <Text style={[styles.statusLabel, { color: config.border }]}>{config.label}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={<Text style={styles.empty}>No tables found.</Text>}
            />

            {/* QR Scanner Modal */}
            <Modal visible={showScanner} animationType="slide" presentationStyle="fullScreen">
                <QRScanner
                    onScan={handleQRResult}
                    onClose={() => setShowScanner(false)}
                />
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon },
    subtitle: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
    qrButton: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    qrButtonText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
    modeBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
        borderRadius: Radius.lg,
        borderWidth: 1,
    },
    modeText: { fontSize: FontSize.sm, fontWeight: '600', flex: 1 },
    modeCancel: { color: Colors.error, fontWeight: '700', fontSize: FontSize.sm },
    row: { justifyContent: 'space-between' },
    tableCard: { width: '47%', borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 2, alignItems: 'center', marginBottom: Spacing.md },
    tableCardHighlight: { borderStyle: 'dashed' as any, borderColor: Colors.saffron, borderWidth: 3 },
    tableNum: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.gray900 },
    tableCapacity: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: Spacing.xs },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
    statusEmoji: { fontSize: 12, marginRight: 4 },
    statusLabel: { fontSize: FontSize.xs, fontWeight: '700' },
    empty: { textAlign: 'center', color: Colors.gray400, marginTop: 48, fontSize: FontSize.base },
});
