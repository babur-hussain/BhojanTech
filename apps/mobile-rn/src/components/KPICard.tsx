import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';

interface KPICardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    accentColor?: string;
    trend?: number; // positive = up, negative = down
}

function KPICard({ title, value, subtitle, icon, accentColor = Colors.saffron, trend }: KPICardProps) {
    return (
        <View style={[styles.card, { borderTopColor: accentColor }]}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.icon}>{icon}</Text>
            </View>
            <Text style={styles.value}>{value}</Text>
            {subtitle && (
                <Text style={[styles.subtitle, trend !== undefined && { color: trend >= 0 ? Colors.success : Colors.error }]}>
                    {subtitle}
                </Text>
            )}
        </View>
    );
}

export default React.memo(KPICard);

const styles = StyleSheet.create({
    card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, borderTopWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    title: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
    icon: { fontSize: 20 },
    value: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.gray900 },
    subtitle: { fontSize: FontSize.xs, fontWeight: '500', color: Colors.gray400, marginTop: Spacing.xxs },
});
