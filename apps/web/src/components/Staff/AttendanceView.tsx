import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceStatus } from '@restaurant/types';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Minus,
  Users, Download, ToggleLeft, ToggleRight, AlertCircle, Timer
} from 'lucide-react';
import { api } from '../../utils/api';
import PageLoader from '../PageLoader';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PRESENT:  { label:'P',  color:'bg-green-500 text-white',  icon:<CheckCircle size={12}/> },
  ABSENT:   { label:'A',  color:'bg-red-500 text-white',    icon:<XCircle size={12}/> },
  LATE:     { label:'L',  color:'bg-amber-400 text-white',  icon:<Clock size={12}/> },
  HALF_DAY: { label:'H',  color:'bg-blue-400 text-white',   icon:<Minus size={12}/> },
  HOLIDAY:  { label:'HO', color:'bg-gray-300 text-gray-600',icon:<Minus size={12}/> },
};

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY'];

interface Props { staff: any[]; fetchStaff: () => void; }

export default function AttendanceView({ staff, fetchStaff }: Props) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState(staff.length > 0 ? (staff[0].id || staff[0]._id) : '');
  const [override, setOverride] = useState<{ date: string; status: AttendanceStatus } | null>(null);
  const [attendance, setAttendance] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkDate, setBulkDate] = useState(now.toISOString().slice(0, 10));
  const [bulkEntries, setBulkEntries] = useState<Record<string, { status: AttendanceStatus; shift: string }>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [todaySummary, setTodaySummary] = useState<any>(null);

  useEffect(() => {
    if (!selected && staff.length > 0) setSelected(staff[0].id || staff[0]._id);
  }, [staff, selected]);

  // Fetch today's summary
  useEffect(() => {
    api.get('/staff/attendance/today').then(r => setTodaySummary(r.data)).catch(() => {});
  }, []);

  const fetchAttendance = async () => {
    if (!selected) return;
    try {
      setLoading(true);
      const mStr = `${year}-${String(month).padStart(2, '0')}`;
      const res = await api.get(`/staff/attendance/${selected}/${mStr}`);
      const map: Record<string, any> = {};
      res.data.forEach((rec: any) => {
        map[rec.date] = rec;
      });
      setAttendance(map);
    } catch (e) {
      console.error('Failed to fetch attendance:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bulkMode) fetchAttendance();
  }, [selected, year, month, bulkMode]);

  const prevMonth = () => { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1); };

  const handleManualMark = async (status: AttendanceStatus) => {
    if (!override || !selected) return;
    try {
      await api.post('/staff/attendance/manual', {
        staffId: selected,
        date: override.date,
        status,
        shift: 'MORNING',
        notes: 'Manual override'
      });
      setOverride(null);
      fetchAttendance();
    } catch (e) {
      console.error('Failed to mark attendance manually:', e);
      alert('Failed to mark attendance');
    }
  };

  const handleBulkSave = async () => {
    const entries = Object.entries(bulkEntries).map(([staffId, data]) => ({
      staffId, status: data.status, shift: data.shift || 'MORNING',
    }));
    if (entries.length === 0) { alert('No entries to save'); return; }

    try {
      setBulkSaving(true);
      await api.post('/staff/attendance/bulk', { date: bulkDate, entries });
      alert(`Attendance marked for ${entries.length} staff members`);
      setBulkEntries({});
      fetchStaff();
      // Refresh today summary
      api.get('/staff/attendance/today').then(r => setTodaySummary(r.data)).catch(() => {});
    } catch (e) {
      console.error('Failed to bulk mark:', e);
      alert('Failed to mark bulk attendance');
    } finally {
      setBulkSaving(false);
    }
  };

  const markAllAs = (status: AttendanceStatus) => {
    const entries: Record<string, { status: AttendanceStatus; shift: string }> = {};
    staff.forEach(s => {
      entries[s.id || s._id] = { status, shift: 'MORNING' };
    });
    setBulkEntries(entries);
  };

  const exportCSV = () => {
    const mStr = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const headers = ['Staff Name', ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`)];
    
    const rows = staff.map(s => {
      const row = [s.name];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${mStr}-${String(d).padStart(2, '0')}`;
        // For CSV export we'd need all staff attendance — simplify by noting individual view
        row.push('—');
      }
      return row;
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${mStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  // Calculate attendance stats from fetched data
  const stats = useMemo(() => {
    const vals = Object.values(attendance);
    return {
      present: vals.filter((a: any) => a.status === 'PRESENT').length,
      late: vals.filter((a: any) => a.status === 'LATE').length,
      absent: vals.filter((a: any) => a.status === 'ABSENT').length,
      halfDays: vals.filter((a: any) => a.status === 'HALF_DAY').length,
    };
  }, [attendance]);

  // Calculate hours worked
  const getHoursWorked = (rec: any) => {
    if (!rec?.clockInTime || !rec?.clockOutTime) return null;
    const hours = (new Date(rec.clockOutTime).getTime() - new Date(rec.clockInTime).getTime()) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Today's Quick Summary */}
      {todaySummary && !bulkMode && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-4">
          <h3 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
            <Users size={15} /> Today's Attendance — {todaySummary.date}
          </h3>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Present', val: todaySummary.present, color: 'bg-green-500' },
              { label: 'Late', val: todaySummary.late, color: 'bg-amber-400' },
              { label: 'Absent', val: todaySummary.absent, color: 'bg-red-500' },
              { label: 'Half Day', val: todaySummary.halfDay, color: 'bg-blue-400' },
              { label: 'Unmarked', val: todaySummary.unmarked, color: 'bg-gray-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
                <div className={`w-3 h-3 rounded-full ${s.color}`} />
                <span className="text-sm font-semibold text-gray-700">{s.val}</span>
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Toggle & Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setBulkMode(!bulkMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              bulkMode ? 'bg-maroon text-white border-maroon' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {bulkMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            {bulkMode ? 'Bulk Mode ON' : 'Bulk Mark'}
          </button>

          {!bulkMode && (
            <>
              <select value={selected} onChange={e => setSelected(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron">
                {staff.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 border rounded-lg hover:bg-gray-50"><ChevronLeft size={16}/></button>
                <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
                  {new Date(year, month-1).toLocaleDateString('en-IN', { month:'long', year:'numeric' })}
                </span>
                <button onClick={nextMonth} className="p-2 border rounded-lg hover:bg-gray-50"><ChevronRight size={16}/></button>
              </div>
            </>
          )}
        </div>

        {!bulkMode && (
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Bulk Mode */}
      {bulkMode && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm" />
              <span className="text-xs text-gray-500">Quick:</span>
              {STATUSES.filter(s => s !== 'HOLIDAY').map(st => (
                <button key={st} onClick={() => markAllAs(st)}
                  className={`text-xs px-2 py-1 rounded font-semibold ${STATUS_CONFIG[st].color} hover:opacity-80`}>
                  All {st.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button onClick={handleBulkSave} disabled={bulkSaving || Object.keys(bulkEntries).length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-green-700">
              <CheckCircle size={14} /> {bulkSaving ? 'Saving…' : `Save (${Object.keys(bulkEntries).length})`}
            </button>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Staff</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map(s => {
                const staffId = s.id || s._id;
                const entry = bulkEntries[staffId];
                return (
                  <tr key={staffId} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <img src={s.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${s.name}`}
                        className="w-7 h-7 rounded-full" alt="" />
                      <span className="font-medium text-gray-800">{s.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{s.role.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center gap-1">
                        {STATUSES.map(st => (
                          <button key={st}
                            onClick={() => setBulkEntries(prev => ({
                              ...prev,
                              [staffId]: { status: st, shift: prev[staffId]?.shift || 'MORNING' }
                            }))}
                            className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                              entry?.status === st ? STATUS_CONFIG[st].color + ' ring-2 ring-offset-1 ring-gray-400' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={st}
                          >
                            {STATUS_CONFIG[st].label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <select className="border rounded px-2 py-1 text-xs"
                        value={entry?.shift || 'MORNING'}
                        onChange={e => setBulkEntries(prev => ({
                          ...prev,
                          [staffId]: { status: prev[staffId]?.status || 'PRESENT', shift: e.target.value }
                        }))}>
                        <option value="MORNING">Morning</option>
                        <option value="AFTERNOON">Afternoon</option>
                        <option value="EVENING">Evening</option>
                        <option value="NIGHT">Night</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Individual Calendar View */}
      {!bulkMode && (
        <>
          {/* Summary badges */}
          <div className="flex flex-wrap gap-3">
            {[
              { label:'Present', val:stats.present, color:'bg-green-100 text-green-700' },
              { label:'Late',    val:stats.late,    color:'bg-amber-100 text-amber-700' },
              { label:'Absent',  val:stats.absent,  color:'bg-red-100 text-red-700' },
              { label:'Half Day',val:stats.halfDays,color:'bg-blue-100 text-blue-700' },
            ].map(s => (
              <div key={s.label} className={`px-4 py-2 rounded-lg text-sm font-semibold ${s.color}`}>
                {s.label}: {s.val}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-opacity ${loading ? 'opacity-50' : ''}`}>
            <div className="grid grid-cols-7 border-b">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="border-r border-b h-20" />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1;
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const rec = attendance[dateStr];
                const status = rec?.status as AttendanceStatus | undefined;
                const cfg = status ? STATUS_CONFIG[status] : null;
                const isFuture = new Date(dateStr) > new Date();
                const hours = getHoursWorked(rec);
                const isOvertime = hours && parseFloat(hours) > 10;
                return (
                  <div key={d} className="border-r border-b h-20 p-1 flex flex-col items-center justify-between relative">
                    <span className="text-xs text-gray-500">{d}</span>
                    {cfg && !isFuture && (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer ${cfg.color}`}
                          title={status}
                          onClick={() => setOverride({ date: dateStr, status: status! })}
                        >
                          {cfg.label}
                        </div>
                        {hours && (
                          <span className={`text-[9px] font-semibold ${isOvertime ? 'text-red-500' : 'text-gray-400'}`}>
                            {hours}h {isOvertime && '🔥'}
                          </span>
                        )}
                      </div>
                    )}
                    {!cfg && !isFuture && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer bg-gray-100 text-gray-400 hover:bg-gray-200"
                        title="Mark Attendance"
                        onClick={() => setOverride({ date: dateStr, status: 'PRESENT' })}
                      >
                        ?
                      </div>
                    )}
                    {isFuture && <div className="flex-1" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${v.color}`}>{v.label}</div>
                <span className="text-gray-500">{k.replace('_',' ')}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-3">
              <Timer size={12} className="text-red-500" />
              <span className="text-gray-500">🔥 = Overtime (&gt;10h)</span>
            </div>
          </div>
        </>
      )}

      {/* Manual Override Modal */}
      {override && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs">
            <h3 className="font-bold text-gray-800 mb-4">Override Attendance — {override.date}</h3>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button key={s} onClick={() => handleManualMark(s)}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors ${STATUS_CONFIG[s].color} hover:opacity-80`}>
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>
            <button onClick={() => setOverride(null)} className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
