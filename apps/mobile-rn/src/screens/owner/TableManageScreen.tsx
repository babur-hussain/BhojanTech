import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { useTablesStore } from '../../store/tablesStore';
import { Table } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const STATUS_CONFIG = {
    AVAILABLE: { bg: Colors.tableAvailable + '15', border: Colors.tableAvailable, label: 'Open', emoji: '🟢' },
    OCCUPIED: { bg: Colors.tableOccupied + '15', border: Colors.tableOccupied, label: 'Active', emoji: '🔴' },
    RESERVED: { bg: Colors.tableReserved + '15', border: Colors.tableReserved, label: 'Reserved', emoji: '🟡' },
};

export default function TableManageScreen() {
    const { tables, isLoading, fetchTables, addTable, editTable, deleteTable, reserveTable, clearTable } = useTablesStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [formNumber, setFormNumber] = useState('');
    const [formCapacity, setFormCapacity] = useState('4');
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchTables(); }, []);

    const handleAdd = async () => {
        if (!formNumber.trim()) { Alert.alert('Error', 'Table number is required'); return; }
        setSaving(true);
        try {
            await addTable(formNumber.trim(), parseInt(formCapacity) || 4);
            ReactNativeHapticFeedback.trigger('notificationSuccess');
            setShowAddModal(false);
            setFormNumber('');
            setFormCapacity('4');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not add table');
        } finally { setSaving(false); }
    };

    const handleEdit = async () => {
        if (!editingTable || !formNumber.trim()) return;
        setSaving(true);
        try {
            await editTable(editingTable.id, { number: formNumber.trim(), capacity: parseInt(formCapacity) || 4 });
            ReactNativeHapticFeedback.trigger('notificationSuccess');
            setEditingTable(null);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not update table');
        } finally { setSaving(false); }
    };

    const handleDelete = (table: Table) => {
        if (table.status === 'OCCUPIED') {
            Alert.alert('Cannot Delete', 'This table has an active order. Please clear it first.');
            return;
        }
        Alert.alert('Delete Table', `Delete Table ${table.number}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await deleteTable(table.id); ReactNativeHapticFeedback.trigger('impactMedium'); }
                    catch (e: any) { Alert.alert('Error', e.message); }
                }
            },
        ]);
    };

    const handleLongPress = (table: Table) => {
        ReactNativeHapticFeedback.trigger('impactMedium');
        const actions: any[] = [];
        if (table.status === 'AVAILABLE') {
            actions.push({ text: '🟡 Reserve', onPress: () => reserveTable(table.id).catch(console.warn) });
        }
        if (table.status === 'OCCUPIED' || table.status === 'RESERVED') {
            actions.push({ text: '🟢 Clear Table', onPress: () => clearTable(table.id).catch(console.warn) });
        }
        actions.push({
            text: '✏️ Edit', onPress: () => {
                setEditingTable(table);
                setFormNumber(table.number);
                setFormCapacity(String(table.capacity));
            }
        });
        actions.push({ text: '🗑️ Delete', style: 'destructive' as const, onPress: () => handleDelete(table) });
        actions.push({ text: 'Cancel', style: 'cancel' as const });
        Alert.alert(`Table ${table.number}`, `Status: ${table.status}`, actions);
    };

    const openCount = tables.filter(t => t.status === 'AVAILABLE').length;
    const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length;
    const reservedCount = tables.filter(t => t.status === 'RESERVED').length;

    const renderFormModal = () => (
        <Modal visible={showAddModal || !!editingTable} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{editingTable ? 'Edit Table' : 'Add New Table'}</Text>

                    <Text style={styles.fieldLabel}>Table Number</Text>
                    <TextInput
                        style={styles.fieldInput}
                        value={formNumber}
                        onChangeText={setFormNumber}
                        placeholder="e.g. 1, A1, VIP-1"
                        placeholderTextColor={Colors.gray400}
                    />

                    <Text style={styles.fieldLabel}>Capacity (Seats)</Text>
                    <TextInput
                        style={styles.fieldInput}
                        value={formCapacity}
                        onChangeText={setFormCapacity}
                        placeholder="4"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="number-pad"
                    />

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); setEditingTable(null); }}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={editingTable ? handleEdit : handleAdd}
                            disabled={saving}
                        >
                            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : editingTable ? 'Update' : 'Add Table'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Table Management</Text>
                    <Text style={styles.subtitle}>{tables.length} tables  •  {openCount} open  •  {occupiedCount} active  •  {reservedCount} reserved</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => { setFormNumber(''); setFormCapacity('4'); setShowAddModal(true); }}>
                    <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={tables}
                numColumns={3}
                columnWrapperStyle={styles.row}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: Spacing.lg }}
                refreshing={isLoading}
                onRefresh={fetchTables}
                renderItem={({ item }) => {
                    const config = STATUS_CONFIG[item.status];
                    return (
                        <TouchableOpacity
                            style={[styles.tableCard, { backgroundColor: config.bg, borderColor: config.border }]}
                            onLongPress={() => handleLongPress(item)}
                            onPress={() => {
                                setEditingTable(item);
                                setFormNumber(item.number);
                                setFormCapacity(String(item.capacity));
                            }}
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
                ListEmptyComponent={<Text style={styles.empty}>No tables. Tap + Add to create.</Text>}
            />

            {renderFormModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon },
    subtitle: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 2 },
    addBtn: { backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
    addBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
    row: { justifyContent: 'flex-start', gap: Spacing.sm },
    tableCard: { width: '31%', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 2, alignItems: 'center', marginBottom: Spacing.sm },
    tableNum: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.gray900 },
    tableCapacity: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
    statusEmoji: { fontSize: 10, marginRight: 3 },
    statusLabel: { fontSize: FontSize.xs, fontWeight: '700' },
    empty: { textAlign: 'center', color: Colors.gray400, marginTop: 48, fontSize: FontSize.base },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xxl },
    modalContent: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl },
    modalTitle: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.maroon, marginBottom: Spacing.xl },
    fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray600, marginBottom: Spacing.xs, marginTop: Spacing.md },
    fieldInput: { backgroundColor: Colors.gray50, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.base, color: Colors.gray900 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xxl },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.gray300, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center', marginRight: Spacing.sm },
    cancelBtnText: { color: Colors.gray600, fontWeight: '600', fontSize: FontSize.base },
    saveBtn: { flex: 1, backgroundColor: Colors.saffron, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center', marginLeft: Spacing.sm },
    saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.base },
});
