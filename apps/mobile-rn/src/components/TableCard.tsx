import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';
import { Table } from '../types';

interface TableCardProps {
    table: Table;
    onPress: (table: Table) => void;
}

const STATUS_CONFIG = {
    AVAILABLE: { bg: Colors.tableAvailable + '15', border: Colors.tableAvailable, label: 'Open', emoji: '🟢' },
    OCCUPIED: { bg: Colors.tableOccupied + '15', border: Colors.tableOccupied, label: 'Active', emoji: '🔴' },
    RESERVED: { bg: Colors.tableReserved + '15', border: Colors.tableReserved, label: 'Reserved', emoji: '🟡' },
};

function TableCard({ table, onPress }: TableCardProps) {
    const config = STATUS_CONFIG[table.status];

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: config.bg, borderColor: config.border }]}
            onPress={() => onPress(table)}
            activeOpacity={0.7}
        >
            <Text style={styles.number}>T{table.number}</Text>
            <Text style={styles.capacity}>👤 {table.capacity}</Text>
            <View style={styles.statusRow}>
                <Text style={styles.statusEmoji}>{config.emoji}</Text>
                <Text style={[styles.statusText, { color: config.border }]}>{config.label}</Text>
            </View>
        </TouchableOpacity>
    );
}

export default React.memo(TableCard);

const styles = StyleSheet.create({
    card: { width: '47%', borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 2, alignItems: 'center', marginBottom: Spacing.md },
    number: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.gray900 },
    capacity: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: Spacing.xs },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
    statusEmoji: { fontSize: 12, marginRight: 4 },
    statusText: { fontSize: FontSize.xs, fontWeight: '700' },
});
