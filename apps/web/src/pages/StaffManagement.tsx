import React, { useState } from 'react';
import { StaffMember, AttendanceStatus, ShiftType, UserRole } from '@restaurant/types';
import {
  Users, Clock, Calendar, DollarSign, TrendingUp,
  Plus, Phone, UserCheck, UserX, Search,
} from 'lucide-react';
import StaffDirectory from '../components/Staff/StaffDirectory';
import ShiftPlanner from '../components/Staff/ShiftPlanner';
import AttendanceView from '../components/Staff/AttendanceView';
import PayrollView from '../components/Staff/PayrollView';
import PerformanceView from '../components/Staff/PerformanceView';

export type StaffTab = 'directory' | 'shifts' | 'attendance' | 'payroll' | 'performance';

// ── Shared Mock Data (used across sub-components) ────────────────────────────
export const MOCK_STAFF: (StaffMember & { status: 'ON_DUTY' | 'OFF_DUTY' })[] = [
  { id:'s1', restaurantId:'r1', userId:'u1', name:'Rahul Sharma',  phone:'+91 9876543210', role:UserRole.WAITER,        joiningDate:new Date('2024-01-15'), salaryType:'MONTHLY', salaryAmount:18000, isOnDuty:true,  currentShift:'MORNING',   isActive:true, photoUrl:'https://api.dicebear.com/7.x/initials/svg?seed=RS', createdAt:new Date(), status:'ON_DUTY' },
  { id:'s2', restaurantId:'r1', userId:'u2', name:'Amit Kumar',    phone:'+91 8765432109', role:UserRole.WAITER,        joiningDate:new Date('2024-03-01'), salaryType:'MONTHLY', salaryAmount:16000, isOnDuty:false, isActive:true, photoUrl:'https://api.dicebear.com/7.x/initials/svg?seed=AK', createdAt:new Date(), status:'OFF_DUTY' },
  { id:'s3', restaurantId:'r1', userId:'u3', name:'Priya Singh',   phone:'+91 7654321098', role:UserRole.KITCHEN_STAFF, joiningDate:new Date('2023-11-20'), salaryType:'MONTHLY', salaryAmount:20000, isOnDuty:true,  currentShift:'MORNING',   isActive:true, photoUrl:'https://api.dicebear.com/7.x/initials/svg?seed=PS', createdAt:new Date(), status:'ON_DUTY' },
  { id:'s4', restaurantId:'r1', userId:'u4', name:'Deepak Verma',  phone:'+91 6543210987', role:UserRole.KITCHEN_STAFF, joiningDate:new Date('2024-02-10'), salaryType:'DAILY',   salaryAmount:700,   isOnDuty:false, isActive:true, photoUrl:'https://api.dicebear.com/7.x/initials/svg?seed=DV', createdAt:new Date(), status:'OFF_DUTY' },
  { id:'s5', restaurantId:'r1', userId:'u5', name:'Sunita Devi',   phone:'+91 5432109876', role:UserRole.MANAGER,       joiningDate:new Date('2023-06-01'), salaryType:'MONTHLY', salaryAmount:35000, isOnDuty:true,  currentShift:'AFTERNOON', isActive:true, photoUrl:'https://api.dicebear.com/7.x/initials/svg?seed=SD', createdAt:new Date(), status:'ON_DUTY' },
];

const TABS: { key: StaffTab; label: string; Icon: any }[] = [
  { key: 'directory',   label: 'Staff',       Icon: Users },
  { key: 'shifts',      label: 'Shifts',      Icon: Clock },
  { key: 'attendance',  label: 'Attendance',  Icon: Calendar },
  { key: 'payroll',     label: 'Payroll',     Icon: DollarSign },
  { key: 'performance', label: 'Performance', Icon: TrendingUp },
];

export default function StaffManagement() {
  const [activeTab, setTab] = useState<StaffTab>('directory');

  const onDuty  = MOCK_STAFF.filter(s => s.isOnDuty).length;
  const offDuty = MOCK_STAFF.length - onDuty;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPI label="Total Staff" value={String(MOCK_STAFF.length)} icon={<Users size={20} className="text-maroon"/>} />
        <KPI label="On Duty Now" value={String(onDuty)} icon={<UserCheck size={20} className="text-green-600"/>} color="text-green-700" />
        <KPI label="Off Duty"    value={String(offDuty)} icon={<UserX size={20} className="text-gray-400"/>}    color="text-gray-600" />
        <KPI label="Monthly Bill" value="₹1.32L" icon={<DollarSign size={20} className="text-saffron"/>} color="text-saffron" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === key ? 'border-maroon text-maroon' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16}/> {label}
          </button>
        ))}
      </div>

      {activeTab === 'directory'   && <StaffDirectory staff={MOCK_STAFF} />}
      {activeTab === 'shifts'      && <ShiftPlanner staff={MOCK_STAFF} />}
      {activeTab === 'attendance'  && <AttendanceView staff={MOCK_STAFF} />}
      {activeTab === 'payroll'     && <PayrollView staff={MOCK_STAFF} />}
      {activeTab === 'performance' && <PerformanceView />}
    </div>
  );
}

function KPI({ label, value, icon, color = 'text-maroon' }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <p className={`text-xl font-black ${color}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
