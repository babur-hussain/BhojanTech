import React, { useState, useEffect } from 'react';
import { ShiftType } from '@restaurant/types';
import { ChevronLeft, ChevronRight, Send, AlertCircle, Save, Plus, X, UserPlus } from 'lucide-react';
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

interface ShiftSlot {
  staffId: string;
  staffName: string;
  role: string;
}

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

type SlotMap = Record<string, Record<ShiftType, ShiftSlot[]>>;

interface Props { staff: any[]; }

export default function ShiftPlanner({ staff }: Props) {
  const [weekStart, setWeekStart] = useState(getMondayOf(new Date()));
  const [slots, setSlots]         = useState<SlotMap>({});
  const [published, setPublished] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  // Click-to-assign state
  const [assignTarget, setAssignTarget] = useState<{ date: string; shift: ShiftType } | null>(null);

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
              MORNING: normalizeSlots(day.MORNING || []),
              AFTERNOON: normalizeSlots(day.AFTERNOON || []),
              EVENING: normalizeSlots(day.EVENING || []),
              NIGHT: normalizeSlots(day.NIGHT || []),
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

  // Normalize slots: handle both old format (string IDs) and new format (ShiftSlot objects)
  const normalizeSlots = (arr: any[]): ShiftSlot[] => {
    return arr.map(item => {
      if (typeof item === 'string') {
        const s = staff.find(st => (st.id || st._id) === item);
        return { staffId: item, staffName: s?.name || 'Unknown', role: s?.role || '' };
      }
      return {
        staffId: item.staffId || item._id,
        staffName: item.staffName || item.name || 'Unknown',
        role: item.role || '',
      };
    });
  };

  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d, 7));

  const assignStaff = (date: string, shift: ShiftType, staffId: string) => {
    const s = staff.find(st => (st.id || st._id) === staffId);
    if (!s) return;

    setSlots(prev => {
      const day = prev[date] ?? { MORNING:[], AFTERNOON:[], EVENING:[], NIGHT:[] };
      const list = day[shift];
      
      // Check if already assigned
      if (list.some(slot => slot.staffId === staffId)) return prev;

      const newSlot: ShiftSlot = {
        staffId,
        staffName: s.name,
        role: s.role,
      };

      return { ...prev, [date]: { ...day, [shift]: [...list, newSlot] } };
    });
    setAssignTarget(null);
  };

  const removeStaff = (date: string, shift: ShiftType, staffId: string) => {
    setSlots(prev => {
      const day = prev[date] ?? { MORNING:[], AFTERNOON:[], EVENING:[], NIGHT:[] };
      return {
        ...prev,
        [date]: { ...day, [shift]: day[shift].filter(slot => slot.staffId !== staffId) }
      };
    });
  };

  // Check for conflicts (same staff in overlapping shifts on same day)
  const getConflicts = (): string[] => {
    const conflicts: string[] = [];
    days.forEach(d => {
      const key = dateKey(d);
      const daySlots = slots[key];
      if (!daySlots) return;

      const overlapping: [ShiftType, ShiftType][] = [
        ['MORNING', 'AFTERNOON'],
        ['AFTERNOON', 'EVENING'],
        ['EVENING', 'NIGHT'],
      ];

      overlapping.forEach(([s1, s2]) => {
        const staff1 = daySlots[s1] || [];
        const staff2 = daySlots[s2] || [];
        staff1.forEach(slot => {
          if (staff2.some(s => s.staffId === slot.staffId)) {
            conflicts.push(`${slot.staffName} is in overlapping shifts (${s1} & ${s2}) on ${key}`);
          }
        });
      });
    });
    return conflicts;
  };

  const conflicts = getConflicts();

  // Get staff already assigned on a specific day to help with assignment
  const getAssignedOnDay = (date: string): Set<string> => {
    const daySlots = slots[date];
    if (!daySlots) return new Set();
    const ids = new Set<string>();
    SHIFTS.forEach(sh => {
      (daySlots[sh] || []).forEach(slot => ids.add(slot.staffId));
    });
    return ids;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      await handleSave();
      await api.post(`/staff/schedule/${weekStartStr}/publish`);
      setPublished(true);
      alert('Schedule published! Staff will be notified.');
    } catch (e) {
      console.error('Failed to publish schedule:', e);
      alert('Failed to publish schedule');
    }
  };

  // Days with no staff assigned
  const unassignedDays = days.filter(d => {
    const daySlots = slots[dateKey(d)];
    if (!daySlots) return true;
    return SHIFTS.every(sh => (daySlots[sh] || []).length === 0);
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

      {/* Warnings */}
      {unassignedDays.length > 0 && !loading && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700 text-sm">
          <AlertCircle size={16}/> {unassignedDays.length} day(s) have no staff assigned yet.
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-700 text-sm">
          <p className="font-semibold flex items-center gap-1.5 mb-1"><AlertCircle size={14} /> Shift Conflicts Detected:</p>
          {conflicts.map((c, i) => (
            <p key={i} className="text-xs ml-5">• {c}</p>
          ))}
        </div>
      )}

      {/* Staff Pool */}
      <div className="bg-gray-50 rounded-xl border p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Staff Pool — Click a cell, then pick a staff member</p>
        <div className="flex flex-wrap gap-2">
          {staff.map(s => (
            <div key={s.id || s._id}
              className="flex items-center gap-1.5 bg-white border rounded-lg px-2 py-1 text-xs font-medium shadow-sm"
            >
              <img src={s.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${s.name}`}
                className="w-5 h-5 rounded-full" alt={s.name}/>
              {s.name.split(' ')[0]}
              <span className="text-gray-400 text-[10px]">{s.role.replace('_', ' ')}</span>
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
                  const isTarget = assignTarget?.date === key && assignTarget?.shift === shift;
                  const assignedOnDay = getAssignedOnDay(key);
                  
                  return (
                    <td key={key}
                      className={`p-1 border-l align-top min-h-[60px] cursor-pointer transition-colors ${
                        isTarget ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : 'hover:bg-gray-50'
                      } ${SHIFT_COLORS[shift]} bg-opacity-20`}
                      onClick={() => {
                        if (isTarget) {
                          setAssignTarget(null);
                        } else {
                          setAssignTarget({ date: key, shift });
                        }
                      }}
                    >
                      <div className="flex flex-wrap gap-1 p-1">
                        {assigned.map(slot => (
                          <span key={slot.staffId}
                            onClick={e => { e.stopPropagation(); removeStaff(key, shift, slot.staffId); }}
                            className="bg-white border border-gray-300 shadow-sm rounded px-1.5 py-0.5 text-xs cursor-pointer hover:bg-red-50 hover:border-red-300 flex items-center gap-0.5 group">
                            {slot.staffName.split(' ')[0]}
                            <X size={10} className="text-gray-300 group-hover:text-red-500" />
                          </span>
                        ))}
                        {assigned.length === 0 && !isTarget && (
                          <span className="text-gray-300 text-xs p-1 flex items-center gap-1">
                            <Plus size={10} /> assign
                          </span>
                        )}
                      </div>

                      {/* Inline staff picker when this cell is the target */}
                      {isTarget && (
                        <div className="mt-1 p-1 bg-white border border-blue-200 rounded-lg shadow-lg max-h-[120px] overflow-y-auto"
                          onClick={e => e.stopPropagation()}>
                          {staff
                            .filter(s => !assigned.some(a => a.staffId === (s.id || s._id)))
                            .map(s => {
                              const sId = s.id || s._id;
                              const alreadyOnDay = assignedOnDay.has(sId);
                              return (
                                <button key={sId}
                                  onClick={() => assignStaff(key, shift, sId)}
                                  className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-blue-50 flex items-center gap-1.5 ${
                                    alreadyOnDay ? 'text-gray-400' : 'text-gray-700'
                                  }`}
                                >
                                  <UserPlus size={10} className="text-blue-400" />
                                  {s.name.split(' ')[0]}
                                  {alreadyOnDay && <span className="text-[9px] text-amber-500 ml-auto">already today</span>}
                                </button>
                              );
                            })}
                          {staff.filter(s => !assigned.some(a => a.staffId === (s.id || s._id))).length === 0 && (
                            <p className="text-[10px] text-gray-400 px-2 py-1">All staff assigned</p>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <Save size={15}/> {saving ? 'Saving...' : 'Save Draft'}
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
