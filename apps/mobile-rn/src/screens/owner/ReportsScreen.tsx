import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { api } from '../../services/api';
import { Endpoints } from '../../constants/api';
import { inrFormat, shortInr } from '../../utils/formatters';
import { SafeAreaView } from 'react-native-safe-area-context';
// In production: import { LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface TrendPoint {
    date: string;
    revenue: number;
    orders: number;
}

export default function ReportsScreen() {
    const [trend, setTrend] = useState<TrendPoint[]>([]);

    useEffect(() => {
        api<TrendPoint[]>(Endpoints.ANALYTICS_REVENUE_TREND)
            .then(setTrend)
            .catch(() => {
                // Fallback mock for dev
                setTrend([
                    { date: 'Apr 15', revenue: 72000, orders: 38 },
                    { date: 'Apr 16', revenue: 88000, orders: 51 },
                    { date: 'Apr 17', revenue: 65000, orders: 34 },
                    { date: 'Apr 18', revenue: 94000, orders: 56 },
                    { date: 'Apr 19', revenue: 78000, orders: 42 },
                    { date: 'Apr 20', revenue: 75000, orders: 40 },
                    { date: 'Apr 21', revenue: 84500, orders: 47 },
                ]);
            });
    }, []);

    const totalRevenue = trend.reduce((sum, t) => sum + t.revenue, 0);
    const totalOrders = trend.reduce((sum, t) => sum + t.orders, 0);
    const avgRevenue = trend.length > 0 ? totalRevenue / trend.length : 0;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>Reports & Analytics</Text>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>7-Day Revenue</Text>
                        <Text style={styles.summaryValue}>{inrFormat(totalRevenue)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Total Orders</Text>
                        <Text style={styles.summaryValue}>{totalOrders}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Avg/Day</Text>
                        <Text style={styles.summaryValue}>{shortInr(avgRevenue)}</Text>
                    </View>
                </View>

                {/* Chart placeholder — use react-native-chart-kit or Victory in production */}
                <View style={styles.chartBox}>
                    <Text style={styles.chartTitle}>7-Day Revenue Trend</Text>
                    <View style={styles.chartPlaceholder}>
                        {trend.map((t, idx) => (
                            <View key={idx} style={styles.bar}>
                                <View style={[styles.barFill, { height: `${(t.revenue / 100000) * 100}%` }]} />
                                <Text style={styles.barLabel}>{t.date.split(' ')[1]}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Revenue table */}
                <View style={styles.tableBox}>
                    <Text style={styles.chartTitle}>Daily Breakdown</Text>
                    {trend.map((t, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.tableDate}>{t.date}</Text>
                            <Text style={styles.tableOrders}>{t.orders} orders</Text>
                            <Text style={styles.tableRevenue}>{inrFormat(t.revenue)}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    scroll: { padding: Spacing.lg },
    title: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.maroon, marginBottom: Spacing.lg },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
    summaryCard: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, marginHorizontal: 4, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    summaryLabel: { fontSize: FontSize.xs, color: Colors.gray500, fontWeight: '600' },
    summaryValue: { fontSize: FontSize.md, fontWeight: '900', color: Colors.gray900, marginTop: 4 },
    chartBox: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    chartTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.gray800, marginBottom: Spacing.md },
    chartPlaceholder: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
    bar: { alignItems: 'center', flex: 1 },
    barFill: { width: 20, backgroundColor: Colors.saffron, borderRadius: 4, minHeight: 4 },
    barLabel: { fontSize: 9, color: Colors.gray400, marginTop: 4 },
    tableBox: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
    tableDate: { fontSize: FontSize.sm, color: Colors.gray600, flex: 1 },
    tableOrders: { fontSize: FontSize.sm, color: Colors.gray500, flex: 1, textAlign: 'center' },
    tableRevenue: { fontSize: FontSize.sm, color: Colors.maroon, fontWeight: '700', flex: 1, textAlign: 'right' },
});
