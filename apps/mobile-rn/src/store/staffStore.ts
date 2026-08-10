import { create } from 'zustand';
import { StaffMember, AttendanceRecord, StaffPerformance } from '../types';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';

interface StaffState {
    staff: StaffMember[];
    isLoading: boolean;
    isClockedIn: boolean;
    todayStats: { ordersHandled: number; revenueGenerated: number } | null;
    attendanceRecords: AttendanceRecord[];
    performanceData: StaffPerformance[];

    fetchStaff: () => Promise<void>;
    inviteStaff: (name: string, phone: string, role: string) => Promise<void>;
    toggleStaffActive: (staffId: string) => Promise<void>;
    clockIn: () => Promise<void>;
    clockOut: () => Promise<void>;
    fetchMyStats: () => Promise<void>;
    fetchAttendanceHistory: (staffId: string) => Promise<void>;
    fetchTodayAttendance: () => Promise<void>;
    fetchPerformance: (month: string) => Promise<void>;
}

export const useStaffStore = create<StaffState>((set, get) => ({
    staff: [],
    isLoading: false,
    isClockedIn: false,
    todayStats: null,
    attendanceRecords: [],
    performanceData: [],

    fetchStaff: async () => {
        set({ isLoading: true });
        try {
            const data = await api<StaffMember[]>(Endpoints.STAFF);
            set({ staff: data, isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    inviteStaff: async (name, phone, role) => {
        await api(Endpoints.AUTH_INVITE_STAFF, {
            method: 'POST',
            body: { name, phone, role },
        });
        // Refresh staff list
        await get().fetchStaff();
    },

    toggleStaffActive: async (staffId) => {
        await api(Endpoints.STAFF_TOGGLE_ACTIVE(staffId), { method: 'PATCH' });
        set((s) => ({
            staff: s.staff.map((m) =>
                m.id === staffId ? { ...m, isActive: !m.isActive } : m,
            ),
        }));
    },

    clockIn: async () => {
        await api(Endpoints.STAFF_CLOCK_IN, { method: 'POST' });
        set({ isClockedIn: true });
    },

    clockOut: async () => {
        await api(Endpoints.STAFF_CLOCK_OUT, { method: 'POST' });
        set({ isClockedIn: false });
    },

    fetchMyStats: async () => {
        try {
            const stats = await api<{ ordersHandled: number; revenueGenerated: number }>(Endpoints.STAFF_MY_STATS);
            set({ todayStats: stats });
        } catch { }
    },

    fetchAttendanceHistory: async (staffId) => {
        try {
            const records = await api<AttendanceRecord[]>(Endpoints.STAFF_ATTENDANCE_HISTORY(staffId));
            set({ attendanceRecords: records });
        } catch { }
    },

    fetchTodayAttendance: async () => {
        try {
            const records = await api<AttendanceRecord[]>(Endpoints.STAFF_ATTENDANCE_TODAY);
            set({ attendanceRecords: records });
        } catch { }
    },

    fetchPerformance: async (month) => {
        try {
            const data = await api<StaffPerformance[]>(Endpoints.STAFF_PERFORMANCE(month));
            set({ performanceData: data });
        } catch { }
    },
}));
