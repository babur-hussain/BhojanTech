import React, { useState } from 'react';
import { StaffMember, UserRole } from '@restaurant/types';
import { Plus, Phone, Edit2, UserCheck, UserX, ArrowRightLeft } from 'lucide-react';
import { useBranchStore } from '../../store/branchStore';

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  WAITER: 'bg-green-100 text-green-700',
  KITCHEN_STAFF: 'bg-orange-100 text-orange-700',
};

interface Props { staff: (StaffMember & { status: string })[]; }

export default function StaffDirectory({ staff }: Props) {
  const { selectedBranchId } = useBranchStore();
  const isAllBranches = selectedBranchId === 'all';
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [transferStaffId, setTransferStaffId] = useState<string | null>(null);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', role: UserRole.WAITER, salaryType: 'MONTHLY', salaryAmount: '' });

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex gap-3 mb-5">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search staff…"
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-saffron focus:border-saffron"
        />
        <button onClick={() => setShowAdd(true)}
          disabled={isAllBranches}
          title={isAllBranches ? "Select a specific branch to invite staff" : ""}
          className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-maroon hover:bg-opacity-90'}`}>
          <Plus size={16} /> Invite Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <img src={s.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${s.name}`}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" alt={s.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 truncate">{s.name}</h3>
                  {s.isOnDuty
                    ? <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> On Duty</span>
                    : <span className="text-xs text-gray-400">Off Duty</span>
                  }
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600'}`}>
                  {s.role.replace('_', ' ')}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setTransferStaffId(s.id)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Transfer Branch"
                >
                  <ArrowRightLeft size={14} />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-maroon hover:bg-red-50 rounded" title="Edit">
                  <Edit2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <a href={`tel:${s.phone}`} className="flex items-center gap-2 hover:text-blue-600">
                <Phone size={13} /> {s.phone}
              </a>
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                <span>Joined {new Date(s.joiningDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                <span className="font-semibold text-gray-700">
                  ₹{s.salaryType === 'MONTHLY'
                    ? `${(s.salaryAmount / 1000).toFixed(0)}K/mo`
                    : `${s.salaryAmount}/day`}
                </span>
              </div>
              {s.currentShift && (
                <div className="text-xs text-indigo-600 font-medium">
                  Current Shift: {s.currentShift}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-5 py-4 border-b bg-cream rounded-t-xl">
              <h2 className="font-bold text-maroon text-lg">Invite Staff Member</h2>
              <p className="text-xs text-gray-500 mt-0.5">They'll receive an SMS to download the app</p>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Full Name', field: 'name', type: 'text', placeholder: 'Ravi Sharma' },
                { label: 'Phone (+91)', field: 'phone', type: 'tel', placeholder: '9876543210' },
              ].map(f => (
                <div key={f.field}>
                  <label className="label">{f.label}</label>
                  <input type={f.type} className="input w-full" placeholder={f.placeholder}
                    value={(form as any)[f.field]} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="label">Role</label>
                <select className="input w-full" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))}>
                  {[UserRole.WAITER, UserRole.KITCHEN_STAFF, UserRole.MANAGER].map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Salary Type</label>
                  <select className="input w-full" value={form.salaryType} onChange={e => setForm(p => ({ ...p, salaryType: e.target.value }))}>
                    <option value="MONTHLY">Monthly Fixed</option>
                    <option value="DAILY">Daily Wage</option>
                  </select>
                </div>
                <div>
                  <label className="label">{form.salaryType === 'MONTHLY' ? 'Monthly (₹)' : 'Daily (₹)'}</label>
                  <input type="number" className="input w-full" value={form.salaryAmount}
                    onChange={e => setForm(p => ({ ...p, salaryAmount: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={() => setShowAdd(false)} className="px-5 py-2 bg-maroon text-white rounded-lg text-sm font-semibold">
                Send Invite SMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Staff Modal */}
      {transferStaffId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-fade-in">
            <div className="px-5 py-4 border-b flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center">
                <ArrowRightLeft size={16} />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Transfer Staff</h2>
                <p className="text-xs text-gray-500 mt-0.5">Move staff to another branch</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Target Branch</label>
                <select className="input w-full" value={targetBranchId} onChange={e => setTargetBranchId(e.target.value)}>
                  <option value="">Select Branch...</option>
                  <option value="1">Main Branch - CP</option>
                  <option value="2">South Ex Branch</option>
                  <option value="3">Noida Extension</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Transferring will un-assign them from their current shift schedule.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 rounded-b-xl border-t flex justify-end gap-3">
              <button onClick={() => setTransferStaffId(null)} className="px-4 py-2 border bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
              <button
                onClick={() => {
                  alert('Staff transferred successfully');
                  setTransferStaffId(null);
                }}
                disabled={!targetBranchId}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
