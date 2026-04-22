import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';

const { width: W } = Dimensions.get('window');

const MOCK_KPI = {
  todayRevenue: 84500, todayOrders: 47, avgOrder: 1798,
  vsYesterday: 12.4, occupancy: 68, activeOrders: 8,
};

const TREND = [
  { d:'15', r:72 }, { d:'16', r:88 }, { d:'17', r:65 },
  { d:'18', r:94 }, { d:'19', r:78 }, { d:'20', r:75 }, { d:'21', r:84 },
];

function inr(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

export default function MobileDashboardScreen() {
  const { user }   = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [kpi, setKpi]               = useState(MOCK_KPI);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Real: const data = await fetch('/api/analytics/dashboard').then(r => r.json()); setKpi(data);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const shareWhatsApp = () => {
    const msg =
      `📊 *Saffron Palace — ${new Date().toLocaleDateString('en-IN')}*\n\n` +
      `💰 Revenue: ${inr(kpi.todayRevenue)}\n` +
      `🧾 Orders: ${kpi.todayOrders}\n` +
      `📈 vs Yesterday: +${kpi.vsYesterday}%\n` +
      `🪑 Occupancy: ${kpi.occupancy}%`;
    // In React Native: Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
    console.log('Share:', msg);
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#800000"/>}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Good morning,</Text>
          <Text style={s.ownerName}>{user?.name ?? 'Owner'} 🙏</Text>
          <Text style={s.date}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</Text>
        </View>
        <TouchableOpacity style={s.shareBtn} onPress={shareWhatsApp}>
          <Text style={s.shareBtnText}>📤 Share</Text>
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {/* Revenue Hero */}
        <View style={s.heroCard}>
          <Text style={s.heroLabel}>Today's Revenue</Text>
          <Text style={s.heroValue}>{inr(kpi.todayRevenue)}</Text>
          <View style={s.heroRow}>
            <View style={[s.badge, { backgroundColor: kpi.vsYesterday >= 0 ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[s.badgeText, { color: kpi.vsYesterday >= 0 ? '#16a34a' : '#dc2626' }]}>
                {kpi.vsYesterday >= 0 ? '▲' : '▼'} {Math.abs(kpi.vsYesterday)}% vs yesterday
              </Text>
            </View>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={s.kpiGrid}>
          {[
            { label:'Orders',       val:String(kpi.todayOrders), color:'#3b82f6' },
            { label:'Avg Bill',     val:inr(kpi.avgOrder),       color:'#8b5cf6' },
            { label:'Occupancy',    val:`${kpi.occupancy}%`,     color:'#f59e0b' },
            { label:'Active Orders',val:String(kpi.activeOrders),color:'#ef4444' },
          ].map(k => (
            <View key={k.label} style={s.kpiCard}>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.val}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* 7-Day Trend (simplified bar chart using View widths) */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>7-Day Revenue Trend (₹K)</Text>
          <View style={s.barChart}>
            {TREND.map((d, i) => {
              const max = Math.max(...TREND.map(x => x.r));
              const h   = Math.round((d.r / max) * 80);
              return (
                <View key={i} style={s.barCol}>
                  <Text style={s.barVal}>{d.r}</Text>
                  <View style={[s.bar, { height: h, backgroundColor: i === TREND.length-1 ? '#800000' : '#fca5a5' }]}/>
                  <Text style={s.barLabel}>{d.d}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Links */}
        <Text style={s.sectionTitle}>Quick Reports</Text>
        <View style={s.quickLinks}>
          {[
            { label:'📊 Sales Report',  path:'/reports/sales' },
            { label:'🧾 GST Report',   path:'/reports/gst' },
            { label:'📦 Inventory',    path:'/inventory' },
            { label:'👥 Staff',        path:'/staff' },
          ].map(q => (
            <TouchableOpacity key={q.label} style={s.quickBtn}>
              <Text style={s.quickBtnText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.refreshHint}>↓ Pull to refresh live data</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:'#FFF8F0' },
  header:     { paddingTop:60, paddingHorizontal:16, paddingBottom:20, backgroundColor:'#800000', flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  greeting:   { color:'rgba(255,255,255,0.7)', fontSize:13 },
  ownerName:  { color:'#FFF', fontSize:22, fontWeight:'900', marginBottom:2 },
  date:       { color:'rgba(255,255,255,0.6)', fontSize:12 },
  shareBtn:   { backgroundColor:'rgba(255,255,255,0.2)', paddingHorizontal:12, paddingVertical:6, borderRadius:20, marginTop:8 },
  shareBtnText:{ color:'#FFF', fontSize:13, fontWeight:'600' },
  body:       { padding:16, marginTop:-16 },
  heroCard:   { backgroundColor:'#FFF', borderRadius:16, padding:20, marginBottom:12, elevation:4, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:8 },
  heroLabel:  { fontSize:13, color:'#9ca3af', marginBottom:4 },
  heroValue:  { fontSize:36, fontWeight:'900', color:'#800000' },
  heroRow:    { flexDirection:'row', marginTop:8 },
  badge:      { paddingHorizontal:10, paddingVertical:4, borderRadius:20 },
  badgeText:  { fontSize:12, fontWeight:'700' },
  kpiGrid:    { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:16 },
  kpiCard:    { backgroundColor:'#FFF', borderRadius:12, padding:14, width:(W-48)/2, elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4 },
  kpiValue:   { fontSize:22, fontWeight:'900' },
  kpiLabel:   { fontSize:11, color:'#9ca3af', marginTop:3 },
  chartCard:  { backgroundColor:'#FFF', borderRadius:16, padding:16, marginBottom:16, elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4 },
  chartTitle: { fontWeight:'bold', color:'#374151', fontSize:14, marginBottom:16 },
  barChart:   { flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between', height:120 },
  barCol:     { alignItems:'center', flex:1 },
  bar:        { width:20, borderRadius:4, marginVertical:4 },
  barVal:     { fontSize:8, color:'#6b7280', marginBottom:2 },
  barLabel:   { fontSize:9, color:'#9ca3af' },
  sectionTitle:{ fontSize:15, fontWeight:'bold', color:'#374151', marginBottom:10 },
  quickLinks: { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 },
  quickBtn:   { backgroundColor:'#FFF', borderRadius:12, paddingHorizontal:16, paddingVertical:12, borderWidth:1, borderColor:'#e5e7eb', elevation:1 },
  quickBtnText:{ fontSize:13, fontWeight:'600', color:'#374151' },
  refreshHint:{ textAlign:'center', color:'#d1d5db', fontSize:12 },
});
