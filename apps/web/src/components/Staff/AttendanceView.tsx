import React, { useState } from 'react';
import { StaffMember, AttendanceStatus } from '@restaurant/types';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Minus } from 'lucide-react';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PRESENT:  { label:'P',  color:'bg-green-500 text-white',  icon:<CheckCircle size={12}/> },
  ABSENT:   { label:'A',  color:'bg-red-500 text-white',    icon:<XCircle size={12}/> },
  LATE:     { label:'L',  color:'bg-amber-400 text-white',  icon:<Clock size={12}/> },
  HALF_DAY: { label:'H',  color:'bg-blue-400 text-white',   icon:<Minus size={12}/> },
  HOLIDAY:  { label:'HO', color:'bg-gray-300 text-gray-600',icon:<Minus size={12}/> },
};

// Generate mock attendance for a month
function mockAttendance(staffId: string, year: number, month: number): Record<string, AttendanceStatus> {
  const days = new Date(year, month, 0).getDate();
  const out: Record<string, AttendanceStatus> = {};
  for (let d = 1; d <= days; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt > new Date()) continue;
    const key = dt.toISOString().slice(0, 10);
    const rand = Math.random();
    if (dt.getDay() === 0) out[key] = 'HOLIDAY';
    else if (rand > 0.88) out[key] = 'ABSENT';
    else if (rand > 0.78) out[key] = 'LATE';
    else if (rand > 0.72) out[key] = 'HALF_DAY';
    else out[key] = 'PRESENT';
  }
  return out;
}

interface Props { staff: StaffMember[]; }

export default function AttendanceView({ staff }: Props) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState(staff[0]?.id ?? '');
  const [override, setOverride] = useState<{ date: string; status: AttendanceStatus } | null>(null);

  const prevMonth = () => { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1); };

  const attendance = mockAttendance(selected, year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const present  = Object.values(attendance).filter(s => s === 'PRESENT').length;
  const late     = Object.values(attendance).filter(s => s === 'LATE').length;
  const absent   = Object.values(attendance).filter(s => s === 'ABSENT').length;
  const halfDays = Object.values(attendance).filter(s => s === 'HALF_DAY').length;

  const selectedStaff = staff.find(s => s.id === selected);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron flex-1">
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 border rounded-lg hover:bg-gray-50"><ChevronLeft size={16}/></button>
          <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
            {new Date(year, month-1).toLocaleDateString('en-IN', { month:'long', year:'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-2 border rounded-lg hover:bg-gray-50"><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        {[
          { label:'Present', val:present, color:'bg-green-100 text-green-700' },
          { label:'Late',    val:late,    color:'bg-amber-100 text-amber-700' },
          { label:'Absent',  val:absent,  color:'bg-red-100 text-red-700' },
          { label:'Half Day',val:halfDays,color:'bg-blue-100 text-blue-700' },
        ].map(s => (
          <div key={s.label} className={`px-4 py-2 rounded-lg text-sm font-semibold ${s.color}`}>
            {s.label}: {s.val}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="border-r border-b h-14" />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const status = attendance[dateStr];
            const cfg = status ? STATUS_CONFIG[status] : null;
            const isFuture = new Date(dateStr) > new Date();
            return (
              <div key={d} className="border-r border-b h-14 p-1 flex flex-col items-center justify-between">
                <span className="text-xs text-gray-500">{d}</span>
                {cfg && !isFuture && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer ${cfg.color}`}
                    title={status}
                    onClick={() => setOverride({ date: dateStr, status: status! })}
                  >
                    {cfg.label}
                  </div>
                )}
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
      </div>

      {/* Manual Override Modal */}
      {override && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs">
            <h3 className="font-bold text-gray-800 mb-4">Override Attendance — {override.date}</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(s => (
                <button key={s} onClick={() => { setOverride(null); }}
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
