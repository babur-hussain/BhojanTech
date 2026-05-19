import React, { useState, useEffect } from 'react';
import { StaffMember, UserRole } from '@restaurant/types';
import {
  Users, Clock, Calendar, DollarSign, TrendingUp,
  UserCheck, UserX,
} from 'lucide-react';
import StaffDirectory from '../components/Staff/StaffDirectory';
import ShiftPlanner from '../components/Staff/ShiftPlanner';
import AttendanceView from '../components/Staff/AttendanceView';
import PayrollView from '../components/Staff/PayrollView';
import PerformanceView from '../components/Staff/PerformanceView';
import { api } from '../utils/api';
import PageLoader from '../components/PageLoader';
import { useBranchStore } from '../store/branchStore';

export type StaffTab = 'directory' | 'shifts' | 'attendance' | 'payroll' | 'performance';

const TABS: { key: StaffTab; label: string; Icon: any }[] = [
  { key: 'directory',   label: 'Staff',       Icon: Users },
  { key: 'shifts',      label: 'Shifts',      Icon: Clock },
  { key: 'attendance',  label: 'Attendance',  Icon: Calendar },
  { key: 'payroll',     label: 'Payroll',     Icon: DollarSign },
  { key: 'performance', label: 'Performance', Icon: TrendingUp },
];

export default function StaffManagement() {
  const [activeTab, setTab] = useState<StaffTab>('directory');
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { selectedBranchId } = useBranchStore();
  const isAllBranches = selectedBranchId === 'all';

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const qs = isAllBranches ? '' : `?branchId=${selectedBranchId}`;
      const res = await api.get(`/staff/duty/today${qs}`);
      setStaff(res.data.map((s: any) => ({ ...s, id: s._id })));
    } catch (e) {
      console.error('Failed to fetch staff directory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [selectedBranchId]);

  if (loading) return <PageLoader />;

  const onDuty  = staff.filter(s => s.isOnDuty).length;
  const offDuty = staff.length - onDuty;
  
  // Calculate a rough monthly bill for active staff
  const monthlyBill = staff.reduce((sum, s) => sum + (s.salaryType === 'MONTHLY' ? s.salaryAmount : (s.salaryAmount * 26)), 0);
  const formattedBill = monthlyBill >= 100000 ? `₹${(monthlyBill/100000).toFixed(2)}L` : `₹${monthlyBill.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPI label="Total Staff" value={String(staff.length)} icon={<Users size={20} className="text-maroon"/>} />
        <KPI label="On Duty Now" value={String(onDuty)} icon={<UserCheck size={20} className="text-green-600"/>} color="text-green-700" />
        <KPI label="Off Duty"    value={String(offDuty)} icon={<UserX size={20} className="text-gray-400"/>}    color="text-gray-600" />
        <KPI label="Monthly Bill" value={formattedBill} icon={<DollarSign size={20} className="text-saffron"/>} color="text-saffron" />
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

      {activeTab === 'directory'   && <StaffDirectory staff={staff} fetchStaff={fetchStaff} />}
      {activeTab === 'shifts'      && <ShiftPlanner staff={staff} />}
      {activeTab === 'attendance'  && <AttendanceView staff={staff} fetchStaff={fetchStaff} />}
      {activeTab === 'payroll'     && <PayrollView staff={staff} />}
      {activeTab === 'performance' && <PerformanceView staff={staff} />}
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
