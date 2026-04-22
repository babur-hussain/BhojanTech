import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';

const SHIFTS = [
  { key:'MORNING',   label:'Morning',   time:'7AM – 3PM',  color:'#f59e0b' },
  { key:'AFTERNOON', label:'Afternoon', time:'12PM – 8PM', color:'#3b82f6' },
  { key:'EVENING',   label:'Evening',   time:'4PM – 12AM', color:'#8b5cf6' },
  { key:'NIGHT',     label:'Night',     time:'9PM – 5AM',  color:'#1f2937' },
];

const STATUS_COLORS: Record<string, string> = {
  PRESENT:'#16a34a', ABSENT:'#dc2626', LATE:'#d97706', HALF_DAY:'#3b82f6', HOLIDAY:'#9ca3af',
};

const MOCK_SCHEDULE = [
  { date:'Mon, Apr 21', shift:'MORNING',   time:'7AM – 3PM' },
  { date:'Tue, Apr 22', shift:'AFTERNOON', time:'12PM – 8PM' },
  { date:'Wed, Apr 23', shift:'MORNING',   time:'7AM – 3PM' },
  { date:'Thu, Apr 24', shift:'OFF',       time:'Day Off' },
  { date:'Fri, Apr 25', shift:'EVENING',   time:'4PM – 12AM' },
  { date:'Sat, Apr 26', shift:'MORNING',   time:'7AM – 3PM' },
  { date:'Sun, Apr 27', shift:'OFF',       time:'Day Off' },
];

const MOCK_ATTENDANCE = [
  { date:'2026-04-20', status:'PRESENT', clockIn:'07:02', clockOut:'15:15' },
  { date:'2026-04-19', status:'LATE',    clockIn:'07:48', clockOut:'15:00' },
  { date:'2026-04-18', status:'PRESENT', clockIn:'06:58', clockOut:'15:10' },
  { date:'2026-04-17', status:'ABSENT',  clockIn:'—',     clockOut:'—'     },
];

export default function StaffDashboardScreen() {
  const { user } = useAuth();
  const [activeTab, setTab] = useState<'schedule'|'attendance'|'salary'>('schedule');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockTime, setClockTime]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to clock in.');
        setLoading(false); return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      // Real: POST /api/staff/attendance/clock-in { staffId, shift: 'MORNING', lat, lng }
      const now = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
      setIsClockedIn(true);
      setClockTime(now);
      Alert.alert('Clocked In ✓', `Recorded at ${now}`);
    } catch {
      Alert.alert('Error', 'Could not get location. Try again.');
    }
    setLoading(false);
  };

  const handleClockOut = () => {
    const now = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    setIsClockedIn(false);
    Alert.alert('Clocked Out', `See you tomorrow! (${now})`);
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Good {greet()},</Text>
          <Text style={s.name}>{user?.name ?? 'Staff'}</Text>
        </View>
        <View style={[s.dutyBadge, isClockedIn ? s.badgeGreen : s.badgeGray]}>
          <Text style={s.dutyText}>{isClockedIn ? '● On Duty' : '○ Off Duty'}</Text>
        </View>
      </View>

      {/* Clock In / Out Button */}
      <View style={s.clockSection}>
        <TouchableOpacity
          style={[s.clockBtn, isClockedIn ? s.clockBtnOut : s.clockBtnIn]}
          onPress={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.clockBtnText}>{isClockedIn ? '⏹  Clock Out' : '▶  Clock In'}</Text>
          }
        </TouchableOpacity>
        {clockTime && <Text style={s.clockTime}>Clocked in at {clockTime}</Text>}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['schedule','attendance','salary'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.tab, activeTab===t && s.tabActive]}>
            <Text style={[s.tabText, activeTab===t && s.tabTextActive]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {activeTab === 'schedule' && (
          <View>
            <Text style={s.sectionTitle}>This Week's Schedule</Text>
            {MOCK_SCHEDULE.map((item, i) => {
              const shift = SHIFTS.find(sh => sh.key === item.shift);
              return (
                <View key={i} style={[s.scheduleRow, { borderLeftColor: shift?.color ?? '#e5e7eb' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.scheduleDate}>{item.date}</Text>
                    <Text style={s.scheduleShift}>{item.shift === 'OFF' ? 'Day Off 🏖' : `${shift?.label} Shift`}</Text>
                  </View>
                  <Text style={[s.scheduleTime, { color: shift?.color ?? '#9ca3af' }]}>{item.time}</Text>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'attendance' && (
          <View>
            <Text style={s.sectionTitle}>Recent Attendance</Text>
            {MOCK_ATTENDANCE.map((a, i) => (
              <View key={i} style={s.attRow}>
                <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[a.status] }]}/>
                <View style={{ flex: 1 }}>
                  <Text style={s.attDate}>{a.date}</Text>
                  <Text style={s.attTime}>In: {a.clockIn}  ·  Out: {a.clockOut}</Text>
                </View>
                <Text style={[s.attStatus, { color: STATUS_COLORS[a.status] }]}>{a.status}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'salary' && (
          <View>
            <Text style={s.sectionTitle}>Salary — {new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</Text>
            {[
              { label:'Base Salary',    val:'₹18,000' },
              { label:'Present Days',   val:'24 / 26' },
              { label:'Deductions',     val:'-₹1,385' },
              { label:'Advance Taken',  val:'—' },
              { label:'Net Payable',    val:'₹16,615', bold:true },
              { label:'Payment Status', val:'Pending', warn:true },
            ].map(row => (
              <View key={row.label} style={s.salaryRow}>
                <Text style={s.salaryLabel}>{row.label}</Text>
                <Text style={[s.salaryVal, row.bold && s.bold, row.warn && { color:'#d97706' }]}>{row.val}</Text>
              </View>
            ))}
            <TouchableOpacity style={s.downloadBtn}>
              <Text style={s.downloadBtnText}>⬇ Download Salary Slip</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning'; if (h < 17) return 'Afternoon'; return 'Evening';
}

const s = StyleSheet.create({
  container:      { flex:1, backgroundColor:'#FFF8F0' },
  header:         { paddingTop:60, paddingHorizontal:16, paddingBottom:16, backgroundColor:'#800000', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  greeting:       { color:'rgba(255,255,255,0.7)', fontSize:13 },
  name:           { color:'#FFF', fontSize:22, fontWeight:'900' },
  dutyBadge:      { paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
  badgeGreen:     { backgroundColor:'rgba(22,163,74,0.3)' },
  badgeGray:      { backgroundColor:'rgba(255,255,255,0.15)' },
  dutyText:       { color:'#FFF', fontSize:13, fontWeight:'600' },
  clockSection:   { backgroundColor:'#fff', padding:20, alignItems:'center', borderBottomWidth:1, borderBottomColor:'#f3f4f6' },
  clockBtn:       { width:'80%', paddingVertical:16, borderRadius:12, alignItems:'center', elevation:4 },
  clockBtnIn:     { backgroundColor:'#16a34a' },
  clockBtnOut:    { backgroundColor:'#dc2626' },
  clockBtnText:   { color:'#fff', fontWeight:'900', fontSize:18, letterSpacing:0.5 },
  clockTime:      { marginTop:8, color:'#9ca3af', fontSize:13 },
  tabRow:         { flexDirection:'row', backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#e5e7eb' },
  tab:            { flex:1, paddingVertical:12, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent' },
  tabActive:      { borderBottomColor:'#800000' },
  tabText:        { fontSize:13, color:'#6b7280', fontWeight:'600' },
  tabTextActive:  { color:'#800000' },
  content:        { padding:16, paddingBottom:40 },
  sectionTitle:   { fontSize:16, fontWeight:'bold', color:'#1f2937', marginBottom:12 },
  scheduleRow:    { backgroundColor:'#fff', borderRadius:10, padding:14, marginBottom:8, borderLeftWidth:4, flexDirection:'row', alignItems:'center', elevation:1 },
  scheduleDate:   { fontWeight:'bold', color:'#374151', fontSize:14 },
  scheduleShift:  { color:'#6b7280', fontSize:12, marginTop:2 },
  scheduleTime:   { fontSize:13, fontWeight:'700' },
  attRow:         { backgroundColor:'#fff', borderRadius:10, padding:12, marginBottom:8, flexDirection:'row', alignItems:'center', gap:12, elevation:1 },
  statusDot:      { width:10, height:10, borderRadius:5 },
  attDate:        { fontWeight:'bold', color:'#374151', fontSize:13 },
  attTime:        { color:'#9ca3af', fontSize:11, marginTop:2 },
  attStatus:      { fontSize:12, fontWeight:'700' },
  salaryRow:      { flexDirection:'row', justifyContent:'space-between', paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#f3f4f6' },
  salaryLabel:    { color:'#6b7280', fontSize:14 },
  salaryVal:      { color:'#1f2937', fontSize:14, fontWeight:'600' },
  bold:           { fontWeight:'900', color:'#800000', fontSize:16 },
  downloadBtn:    { marginTop:20, backgroundColor:'#800000', padding:14, borderRadius:12, alignItems:'center' },
  downloadBtnText:{ color:'#fff', fontWeight:'bold', fontSize:15 },
});
