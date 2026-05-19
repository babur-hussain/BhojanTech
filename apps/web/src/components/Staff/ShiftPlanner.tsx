import React, { useState, useEffect } from 'react';
import { StaffMember, ShiftType } from '@restaurant/types';
import { ChevronLeft, ChevronRight, Send, AlertCircle, Save } from 'lucide-react';
import { api } from '../../utils/api';

const SHIFTS: ShiftType[] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
const SHIFT_TIMES: Record<ShiftType, string> = {
  MORNING:   '7AM – 3PM',
  AFTERNOON: '12PM – 8PM',
  EVENING:   '4PM – 12AM',
  NIGHT:     '9PM – 5AM',
};
const SHIFT_COLORS: Record<ShiftType, string> = {
  MORNING:   'bg-amber-50 border-amber-300',
  AFTERNOON: 'bg-blue-50 border-blue-300',
  EVENING:   'bg-purple-50 border-purple-300',
  NIGHT:     'bg-gray-800 border-gray-600',
};
const SHIFT_TEXT: Record<ShiftType, string> = {
  MORNING: 'text-amber-800', AFTERNOON: 'text-blue-800',
  EVENING: 'text-purple-800', NIGHT: 'text-gray-100',
};

function getMondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

const dateKey = (d: Date) => d.toISOString().slice(0, 10);

type SlotMap = Record<string, Record<ShiftType, string[]>>; // date → shift → [staffId]

interface Props { staff: (StaffMember & { id: string })[]; }

export default function ShiftPlanner({ staff }: Props) {
  const [weekStart, setWeekStart] = useState(getMondayOf(new Date()));
  const [slots, setSlots]         = useState<SlotMap>({});
  const [published, setPublished] = useState(false);
  const [dragging, setDragging]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekStartStr = dateKey(weekStart);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/staff/schedule/${weekStartStr}`);
        const schedule = res.data;
        
        const newSlots: SlotMap = {};
        if (schedule && schedule.days) {
          schedule.days.forEach((day: any) => {
            newSlots[day.date] = {
              MORNING: day.MORNING || [],
              AFTERNOON: day.AFTERNOON || [],
              EVENING: day.EVENING || [],
              NIGHT: day.NIGHT || []
            };
          });
          setPublished(schedule.isPublished || false);
        } else {
          setPublished(false);
        }
        setSlots(newSlots);
      } catch (e) {
        console.error('Failed to fetch schedule:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [weekStartStr]);

  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d, 7));

  const toggleSlot = (date: string, shift: ShiftType, staffId: string) => {
    setSlots(prev => {
      const day = prev[date] ?? { MORNING:[], AFTERNOON:[], EVENING:[], NIGHT:[] };
      const list = day[shift];
      const updated = list.includes(staffId) ? list.filter(id => id !== staffId) : [...list, staffId];
      return { ...prev, [date]: { ...day, [shift]: updated } };
    });
  };

  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name ?? id;

  const handleSave = async () => {
    try {
      const daysPayload = days.map(d => {
        const k = dateKey(d);
        const daySlots = slots[k] || { MORNING: [], AFTERNOON: [], EVENING: [], NIGHT: [] };
        return { date: k, ...daySlots };
      });
      await api.put(`/staff/schedule/${weekStartStr}`, { days: daysPayload });
      alert('Schedule saved successfully');
    } catch (e) {
      console.error('Failed to save schedule:', e);
      alert('Failed to save schedule');
    }
  };

  const handlePublish = async () => {
    try {
      await handleSave(); // Ensure saved before publishing
      await api.post(`/staff/schedule/${weekStartStr}/publish`);
      setPublished(true);
      alert('Schedule published successfully!');
    } catch (e) {
      console.error('Failed to publish schedule:', e);
      alert('Failed to publish schedule');
    }
  };

  // Check for days with no staff assigned
  const unassignedDays = days.filter(d => {
    const daySlots = slots[dateKey(d)];
    if (!daySlots) return true;
    return SHIFTS.every(sh => daySlots[sh].length === 0);
  });

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="p-2 rounded-lg border hover:bg-gray-50"><ChevronLeft size={18}/></button>
        <div className="text-center">
          <p className="font-bold text-gray-800">
            Week of {weekStart.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
          </p>
          {published && <span className="text-xs text-green-600 font-semibold">✓ Published — Staff notified</span>}
        </div>
        <button onClick={nextWeek} className="p-2 rounded-lg border hover:bg-gray-50"><ChevronRight size={18}/></button>
      </div>

      {unassignedDays.length > 0 && !loading && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700 text-sm">
          <AlertCircle size={16}/> {unassignedDays.length} day(s) have no staff assigned yet.
        </div>
      )}

      {/* Staff Roster (drag source) */}
      <div className="bg-gray-50 rounded-xl border p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Staff — click a shift cell to toggle</p>
        <div className="flex flex-wrap gap-2">
          {staff.map(s => (
            <div key={s.id}
              className="flex items-center gap-1.5 bg-white border rounded-lg px-2 py-1 text-xs font-medium cursor-pointer hover:border-maroon hover:text-maroon select-none shadow-sm"
              onMouseDown={() => setDragging(s.id)}
              onMouseUp={() => setDragging(null)}
            >
              <img src={s.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${s.name}`}
                className="w-5 h-5 rounded-full" alt={s.name}/>
              {s.name.split(' ')[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Planner Grid */}
      <div className={`overflow-x-auto rounded-xl border border-gray-200 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        <table className="w-full min-w-[700px] border-collapse bg-white text-sm">
          <thead>
            <tr>
              <th className="w-28 p-2 text-left text-xs text-gray-500 uppercase font-semibold bg-gray-50 border-b">Shift</th>
              {days.map(d => (
                <th key={dateKey(d)} className="p-2 text-center text-xs font-semibold text-gray-700 bg-gray-50 border-b border-l">
                  <p>{d.toLocaleDateString('en-IN', { weekday:'short' })}</p>
                  <p className="text-gray-400 font-normal">{d.getDate()}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHIFTS.map(shift => (
              <tr key={shift} className="border-b">
                <td className={`p-2 border-r text-xs font-bold ${SHIFT_TEXT[shift]} ${SHIFT_COLORS[shift]}`}>
                  {shift}
                  <p className={`font-normal ${SHIFT_TEXT[shift]} opacity-70`}>{SHIFT_TIMES[shift]}</p>
                </td>
                {days.map(d => {
                  const key = dateKey(d);
                  const assigned = slots[key]?.[shift] ?? [];
                  return (
                    <td key={key}
                      className={`p-1 border-l align-top min-h-[60px] cursor-pointer transition-colors hover:bg-gray-50 ${SHIFT_COLORS[shift]} bg-opacity-20`}
                      onClick={() => dragging && toggleSlot(key, shift, dragging)}
                    >
                      <div className="flex flex-wrap gap-1 p-1">
                        {assigned.map(id => (
                          <span key={id}
                            onClick={e => { e.stopPropagation(); toggleSlot(key, shift, id); }}
                            className="bg-white border border-gray-300 shadow-sm rounded px-1.5 py-0.5 text-xs cursor-pointer hover:bg-red-50 hover:border-red-300">
                            {getStaffName(id).split(' ')[0]} ✕
                          </span>
                        ))}
                        {assigned.length === 0 && (
                          <span className="text-gray-300 text-xs p-1">empty</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          <Save size={15}/> Save Draft
        </button>
        <button
          onClick={handlePublish}
          className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
        >
          <Send size={15}/> Publish Schedule
        </button>
      </div>
    </div>
  );
}
