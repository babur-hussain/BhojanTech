import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize } from '../../constants/theme';
import { api } from '../../services/api';
import { Endpoints } from '../../constants/api';
import { inrFormat, pctFormat } from '../../utils/formatters';
import KPICard from '../../components/KPICard';
import { useInventory } from '../../hooks/useInventory';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DashboardData {
    todayRevenue: number;
    todayOrders: number;
    avgOrderValue: number;
    vsYesterday: number;
    occupancyRate: number;
    occupiedTables: number;
    totalTables: number;
    activeOrders: number;
}

export default function DashboardScreen() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const { lowStockItems } = useInventory();

    const fetchDashboard = async () => {
        try {
            const res = await api<DashboardData>(Endpoints.ANALYTICS_DASHBOARD);
            setData(res);
        } catch (err) {
            console.warn('Dashboard fetch error:', err);
        }
    };

    useEffect(() => { fetchDashboard(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboard();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.saffron]} />}
            >
                <View style={styles.headerArea}>
                    <View>
                        <Text style={styles.greeting}>Dashboard</Text>
                        <Text style={styles.subtitle}>Real-time business overview</Text>
                    </View>
                    <View style={styles.branchPill}>
                        <Text style={styles.branchPillText}>🏢 Consolidated (All)</Text>
                    </View>
                </View>

                {/* KPI Cards */}
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiHalf}>
                        <KPICard
                            title="Today's Revenue"
                            value={data ? inrFormat(data.todayRevenue) : '—'}
                            subtitle={data ? `${pctFormat(data.vsYesterday)} vs yesterday` : ''}
                            icon="💰"
                            accentColor={Colors.saffron}
                            trend={data?.vsYesterday}
                        />
                    </View>
                    <View style={styles.kpiHalf}>
                        <KPICard
                            title="Orders Today"
                            value={data ? String(data.todayOrders) : '—'}
                            subtitle={data ? `Avg ${inrFormat(data.avgOrderValue)}/order` : ''}
                            icon="🧾"
                            accentColor={Colors.info}
                        />
                    </View>
                    <View style={styles.kpiHalf}>
                        <KPICard
                            title="Table Occupancy"
                            value={data ? `${data.occupancyRate}%` : '—'}
                            subtitle={data ? `${data.occupiedTables} of ${data.totalTables} tables` : ''}
                            icon="🪑"
                            accentColor="#8B5CF6"
                        />
                    </View>
                    <View style={styles.kpiHalf}>
                        <KPICard
                            title="Active Orders"
                            value={data ? String(data.activeOrders) : '—'}
                            subtitle="Being prepared"
                            icon="🔥"
                            accentColor={Colors.warning}
                        />
                    </View>
                </View>

                {/* Animated Chart Section */}
                <View style={styles.chartCard}>
                    <Text style={styles.sectionTitle}>Weekly Revenue Trend</Text>
                    <View style={styles.chartRow}>
                        {[40, 60, 30, 80, 50, 90, 70].map((height, i) => (
                            <View key={i} style={styles.barContainer}>
                                <View style={[styles.bar, { height: `${height}%` }]} />
                                <Text style={styles.barLabel}>{['M','T','W','T','F','S','S'][i]}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Low Inventory Alerts */}
                {lowStockItems.length > 0 && (
                    <View style={styles.alertSection}>
                        <Text style={styles.sectionTitle}>⚠️ Low Inventory Alerts</Text>
                        {lowStockItems.slice(0, 5).map((item) => (
                            <View key={item.id} style={styles.alertItem}>
                                <Text style={styles.alertName}>{item.name}</Text>
                                <Text style={styles.alertQty}>{item.currentQty} {item.unit} left</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.cream },
    scroll: { padding: Spacing.lg },
    greeting: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.maroon },
    subtitle: { fontSize: FontSize.sm, color: Colors.gray400, marginBottom: Spacing.xl },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    kpiHalf: { width: '48%', marginBottom: Spacing.md },
    alertSection: { backgroundColor: Colors.white, borderRadius: 12, padding: Spacing.lg, marginTop: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.warning },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.gray800, marginBottom: Spacing.md },
    alertItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
    alertName: { fontSize: FontSize.base, color: Colors.gray700, fontWeight: '500' },
    alertQty: { fontSize: FontSize.base, color: Colors.error, fontWeight: '700' },
    headerArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
    branchPill: { backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.maroon, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: 16 },
    branchPillText: { fontSize: FontSize.xs, color: Colors.maroon, fontWeight: 'bold' },
    chartCard: { backgroundColor: Colors.white, borderRadius: 12, padding: Spacing.lg, marginTop: Spacing.md },
    chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingTop: Spacing.md },
    barContainer: { alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    bar: { width: 12, backgroundColor: Colors.saffron, borderRadius: 6, marginBottom: Spacing.xs },
    barLabel: { fontSize: FontSize.xs, color: Colors.gray500, fontWeight: '600' }
});
