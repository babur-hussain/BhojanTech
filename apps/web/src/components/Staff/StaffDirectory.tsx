import React, { useState, useEffect } from 'react';
import { UserRole } from '@restaurant/types';
import {
  Plus, Phone, Edit2, ArrowRightLeft, Trash2, X, Search, Filter,
  Mail, MapPin, Shield, CreditCard, Heart, Clock, ChevronRight,
  IndianRupee, Calendar, User, AlertCircle, CheckCircle
} from 'lucide-react';
import { useBranchStore } from '../../store/branchStore';
import { api } from '../../utils/api';
import StaffLedgerModal from './StaffLedgerModal';

const ROLE_COLORS: Record<string, string> = {
  SUPER_OWNER: 'bg-purple-100 text-purple-700',
  OWNER: 'bg-purple-100 text-purple-700',
  BRANCH_MANAGER: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  WAITER: 'bg-green-100 text-green-700',
  KITCHEN_STAFF: 'bg-orange-100 text-orange-700',
  ACCOUNTANT: 'bg-cyan-100 text-cyan-700',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_OWNER: 'Super Owner',
  OWNER: 'Owner',
  BRANCH_MANAGER: 'Branch Manager',
  MANAGER: 'Manager',
  WAITER: 'Waiter',
  KITCHEN_STAFF: 'Kitchen Staff',
  ACCOUNTANT: 'Accountant',
};

interface Props { staff: any[]; fetchStaff: () => void; }

export default function StaffDirectory({ staff, fetchStaff }: Props) {
  const { selectedBranchId } = useBranchStore();
  const isAllBranches = selectedBranchId === 'all';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'joiningDate' | 'salary'>('name');

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [detailStaff, setDetailStaff] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [transferStaffId, setTransferStaffId] = useState<string | null>(null);
  const [showLedgerModal, setShowLedgerModal] = useState<boolean>(false);
  const [transferStaffName, setTransferStaffName] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: '', phone: '', role: 'WAITER' as string, salaryType: 'MONTHLY',
    salaryAmount: '', designation: '', email: '', address: '', joiningDate: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    bankAccountName: '', bankAccountNumber: '', bankIfsc: '', bankName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'salary' | 'emergency' | 'bank'>('basic');

  // Fetch branches for transfer
  useEffect(() => {
    api.get('/branches').then(r => setBranches(r.data || [])).catch(() => {});
  }, []);

  const filtered = staff
    .filter(s =>
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase()) ||
        (s.designation || '').toLowerCase().includes(search.toLowerCase())) &&
      (roleFilter === 'ALL' || s.role === roleFilter)
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'joiningDate') return new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime();
      return (b.salaryAmount || 0) - (a.salaryAmount || 0);
    });

  const openAddModal = () => {
    setForm({
      name: '', phone: '', role: 'WAITER', salaryType: 'MONTHLY',
      salaryAmount: '', designation: '', email: '', address: '', joiningDate: '',
      emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
      bankAccountName: '', bankAccountNumber: '', bankIfsc: '', bankName: '',
    });
    setEditingStaffId(null);
    setActiveFormTab('basic');
    setShowAdd(true);
  };

  const openEditModal = (s: any) => {
    setForm({
      name: s.name,
      phone: s.phone,
      role: s.role,
      salaryType: s.salaryType || 'MONTHLY',
      salaryAmount: String(s.salaryAmount || ''),
      designation: s.designation || '',
      email: s.email || '',
      address: s.address || '',
      joiningDate: s.joiningDate ? new Date(s.joiningDate).toISOString().slice(0, 10) : '',
      emergencyContactName: s.emergencyContact?.name || '',
      emergencyContactPhone: s.emergencyContact?.phone || '',
      emergencyContactRelation: s.emergencyContact?.relation || '',
      bankAccountName: s.bankDetails?.accountName || '',
      bankAccountNumber: s.bankDetails?.accountNumber || '',
      bankIfsc: s.bankDetails?.ifscCode || '',
      bankName: s.bankDetails?.bankName || '',
    });
    setEditingStaffId(s.id || s._id);
    setActiveFormTab('basic');
    setShowAdd(true);
  };

  const openDetailPanel = async (s: any) => {
    try {
      setDetailLoading(true);
      setDetailStaff(s); // show immediately with basic data
      const res = await api.get(`/staff/detail/${s.id || s._id}`);
      setDetailStaff({ ...s, ...res.data });
    } catch (e) {
      console.error('Failed to fetch staff detail:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const payload: any = {
        name: form.name,
        phone: form.phone,
        role: form.role,
        salaryType: form.salaryType,
        salaryAmount: Number(form.salaryAmount) || 0,
        designation: form.designation || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        joiningDate: form.joiningDate || undefined,
      };

      if (form.emergencyContactName) {
        payload.emergencyContact = {
          name: form.emergencyContactName,
          phone: form.emergencyContactPhone,
          relation: form.emergencyContactRelation,
        };
      }

      if (form.bankAccountNumber) {
        payload.bankDetails = {
          accountName: form.bankAccountName,
          accountNumber: form.bankAccountNumber,
          ifscCode: form.bankIfsc,
          bankName: form.bankName,
        };
      }

      if (editingStaffId) {
        await api.put(`/staff/${editingStaffId}`, payload);
      } else {
        await api.post('/staff', payload);
      }

      setShowAdd(false);
      fetchStaff();
    } catch (e: any) {
      console.error('Failed to save staff:', e);
      alert(e.response?.data?.error || 'Failed to save staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member? They will be deactivated.')) return;
    try {
      await api.delete(`/staff/${id}`);
      fetchStaff();
      if (detailStaff && (detailStaff.id === id || detailStaff._id === id)) setDetailStaff(null);
    } catch (e) {
      console.error('Failed to delete staff:', e);
    }
  };

  const handleTransfer = async () => {
    if (!transferStaffId || !targetBranchId) return;
    try {
      await api.post(`/staff/${transferStaffId}/transfer`, { targetBranchId });
      setTransferStaffId(null);
      setTargetBranchId('');
      fetchStaff();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to transfer');
    }
  };

  const uniqueRoles = Array.from(new Set(staff.map(s => s.role)));

  return (
    <div className="flex gap-4">
      {/* Main List */}
      <div className={`flex-1 ${detailStaff ? 'max-w-[calc(100%-380px)]' : ''}`}>
        {/* Search & Controls */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role, designation…"
              className="w-full border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-saffron focus:border-saffron"
            />
          </div>
          <select
            value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron"
          >
            <option value="ALL">All Roles</option>
            {uniqueRoles.map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
            ))}
          </select>
          <select
            value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron"
          >
            <option value="name">Sort: Name</option>
            <option value="joiningDate">Sort: Newest First</option>
            <option value="salary">Sort: Highest Salary</option>
          </select>
          <button onClick={openAddModal}
            disabled={isAllBranches}
            title={isAllBranches ? "Select a specific branch to create staff" : ""}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-maroon hover:bg-opacity-90'}`}>
            <Plus size={16} /> Create Staff
          </button>
        </div>

        {/* Staff Count */}
        <p className="text-xs text-gray-500 mb-3">Showing {filtered.length} of {staff.length} staff members</p>

        {/* Staff Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id || s._id}
              className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${detailStaff && (detailStaff.id === s.id || detailStaff._id === s._id) ? 'ring-2 ring-maroon border-maroon' : ''}`}
              onClick={() => openDetailPanel(s)}
            >
              <div>
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
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[s.role] || s.role.replace('_', ' ')}
                      </span>
                      {s.designation && (
                        <span className="text-xs text-gray-500 italic">{s.designation}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setTransferStaffId(s.id || s._id); setTransferStaffName(s.name); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Transfer Branch"
                    >
                      <ArrowRightLeft size={14} />
                    </button>
                    <button onClick={() => openEditModal(s)} className="p-1.5 text-gray-400 hover:text-maroon hover:bg-red-50 rounded" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id || s._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <a href={`tel:${s.phone}`} className="flex items-center gap-2 hover:text-blue-600" onClick={e => e.stopPropagation()}>
                    <Phone size={13} /> {s.phone}
                  </a>
                  {s.email && (
                    <a href={`mailto:${s.email}`} className="flex items-center gap-2 hover:text-blue-600 text-xs" onClick={e => e.stopPropagation()}>
                      <Mail size={12} /> {s.email}
                    </a>
                  )}
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
                  {(s.totalAdvances > 0) && (
                    <div className="text-xs text-orange-600 font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> Advance: ₹{s.totalAdvances.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <User size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No staff members found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {detailStaff && (
        <div className="w-[370px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto max-h-[calc(100vh-200px)] sticky top-4">
          <div className="p-4 border-b bg-gradient-to-r from-maroon to-red-800 text-white rounded-t-xl relative">
            <button onClick={() => setDetailStaff(null)} className="absolute top-3 right-3 text-white/70 hover:text-white">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <img src={detailStaff.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${detailStaff.name}`}
                className="w-14 h-14 rounded-full border-2 border-white/30" alt="" />
              <div>
                <h3 className="font-bold text-lg">{detailStaff.name}</h3>
                <p className="text-sm text-white/80">{detailStaff.designation || ROLE_LABELS[detailStaff.role] || detailStaff.role}</p>
                {detailStaff.isOnDuty && (
                  <span className="flex items-center gap-1 text-xs text-green-300 font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> On Duty — {detailStaff.currentShift}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Contact */}
            <DetailSection title="Contact" icon={<Phone size={14} />}>
              <DetailRow label="Phone" value={detailStaff.phone} />
              {detailStaff.email && <DetailRow label="Email" value={detailStaff.email} />}
              {detailStaff.address && <DetailRow label="Address" value={detailStaff.address} />}
            </DetailSection>

            {/* Employment */}
            <DetailSection title="Employment" icon={<Shield size={14} />}>
              <DetailRow label="Role" value={ROLE_LABELS[detailStaff.role] || detailStaff.role} />
              {detailStaff.designation && <DetailRow label="Designation" value={detailStaff.designation} />}
              <DetailRow label="Joined" value={new Date(detailStaff.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
              <DetailRow label="Salary" value={`₹${detailStaff.salaryAmount?.toLocaleString('en-IN')} / ${detailStaff.salaryType === 'MONTHLY' ? 'month' : 'day'}`} />
            </DetailSection>

            {/* Attendance Summary */}
            {detailStaff.attendanceSummary && (
              <DetailSection title="Attendance (This Month)" icon={<Calendar size={14} />}>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {[
                    { label: 'P', val: detailStaff.attendanceSummary.present, color: 'bg-green-100 text-green-700' },
                    { label: 'L', val: detailStaff.attendanceSummary.late, color: 'bg-amber-100 text-amber-700' },
                    { label: 'A', val: detailStaff.attendanceSummary.absent, color: 'bg-red-100 text-red-700' },
                    { label: 'H', val: detailStaff.attendanceSummary.halfDay, color: 'bg-blue-100 text-blue-700' },
                    { label: 'HO', val: detailStaff.attendanceSummary.holiday, color: 'bg-gray-100 text-gray-500' },
                  ].map(a => (
                    <div key={a.label} className={`rounded-lg py-2 ${a.color}`}>
                      <p className="text-lg font-black">{a.val}</p>
                      <p className="text-[10px] font-semibold">{a.label}</p>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* Advance Balance / Ledger */}
            {detailStaff.advanceBalance !== undefined && (
              <DetailSection title="Ledger & Advances" icon={<IndianRupee size={14} />}>
                <div className={`rounded-lg p-3 text-center ${detailStaff.advanceBalance > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className={`text-2xl font-black ${detailStaff.advanceBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    ₹{detailStaff.advanceBalance.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {detailStaff.advanceBalance > 0 ? 'Outstanding Advance Balance' : 'No Active Advances'}
                  </p>
                </div>
                <button
                  onClick={() => setShowLedgerModal(true)}
                  className="w-full mt-2 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                >
                  View Full Salary Ledger <ChevronRight size={14} />
                </button>
              </DetailSection>
            )}

            {/* Emergency Contact */}
            {detailStaff.staff?.emergencyContact?.name && (
              <DetailSection title="Emergency Contact" icon={<Heart size={14} />}>
                <DetailRow label="Name" value={detailStaff.staff.emergencyContact.name} />
                <DetailRow label="Phone" value={detailStaff.staff.emergencyContact.phone} />
                <DetailRow label="Relation" value={detailStaff.staff.emergencyContact.relation} />
              </DetailSection>
            )}

            {/* Bank Details */}
            {detailStaff.staff?.bankDetails?.bankName && (
              <DetailSection title="Bank Details" icon={<CreditCard size={14} />}>
                <DetailRow label="Bank" value={detailStaff.staff.bankDetails.bankName} />
                <DetailRow label="Account" value={detailStaff.staff.bankDetails.accountNumber ? `XXXX${detailStaff.staff.bankDetails.accountNumber.slice(-4)}` : '—'} />
                <DetailRow label="IFSC" value={detailStaff.staff.bankDetails.ifscCode || '—'} />
              </DetailSection>
            )}

            {/* Salary History */}
            {detailStaff.salaryHistory?.length > 0 && (
              <DetailSection title="Recent Salary" icon={<Clock size={14} />}>
                {detailStaff.salaryHistory.map((s: any) => (
                  <div key={s._id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700 font-medium">{s.month}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">₹{s.netPayable.toLocaleString('en-IN')}</span>
                      {s.isPaid
                        ? <span className="text-green-600"><CheckCircle size={12} /></span>
                        : <span className="text-amber-500 text-[10px] font-medium">Pending</span>
                      }
                    </div>
                  </div>
                ))}
              </DetailSection>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button onClick={() => openEditModal(detailStaff)} className="flex-1 text-sm py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium flex items-center justify-center gap-1.5">
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={() => { setTransferStaffId(detailStaff.id || detailStaff._id); setTransferStaffName(detailStaff.name); }}
                className="flex-1 text-sm py-2 border rounded-lg text-blue-600 hover:bg-blue-50 font-medium flex items-center justify-center gap-1.5"
              >
                <ArrowRightLeft size={13} /> Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b bg-cream rounded-t-xl flex items-center justify-between">
              <div>
                <h2 className="font-bold text-maroon text-lg">{editingStaffId ? 'Edit Staff Member' : 'Create Staff Member'}</h2>
                {!editingStaffId && <p className="text-xs text-gray-500 mt-0.5">They'll receive an SMS to download the app</p>}
              </div>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {/* Form Tabs */}
            <div className="flex border-b text-xs">
              {[
                { key: 'basic', label: 'Basic Info', icon: <User size={12} /> },
                { key: 'salary', label: 'Salary & Role', icon: <IndianRupee size={12} /> },
                { key: 'emergency', label: 'Emergency', icon: <Heart size={12} /> },
                { key: 'bank', label: 'Bank Details', icon: <CreditCard size={12} /> },
              ].map(t => (
                <button key={t.key}
                  onClick={() => setActiveFormTab(t.key as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-semibold transition-colors ${
                    activeFormTab === t.key ? 'text-maroon border-b-2 border-maroon' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {activeFormTab === 'basic' && (
                <>
                  <FormField label="Full Name" type="text" placeholder="Ravi Sharma" value={form.name}
                    onChange={v => setForm(p => ({ ...p, name: v }))} required />
                  <FormField label="Phone (+91)" type="tel" placeholder="9876543210" value={form.phone}
                    onChange={v => setForm(p => ({ ...p, phone: v }))} required />
                  <FormField label="Email" type="email" placeholder="ravi@example.com" value={form.email}
                    onChange={v => setForm(p => ({ ...p, email: v }))} />
                  <FormField label="Address" type="text" placeholder="123 Main Street, Delhi" value={form.address}
                    onChange={v => setForm(p => ({ ...p, address: v }))} />
                  <FormField label="Joining Date" type="date" value={form.joiningDate}
                    onChange={v => setForm(p => ({ ...p, joiningDate: v }))} />
                </>
              )}

              {activeFormTab === 'salary' && (
                <>
                  <div>
                    <label className="label">Role</label>
                    <select className="input w-full" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                      <option value="WAITER">Waiter</option>
                      <option value="KITCHEN_STAFF">Kitchen Staff</option>
                      <option value="BRANCH_MANAGER">Branch Manager</option>
                      <option value="ACCOUNTANT">Accountant</option>
                    </select>
                  </div>
                  <FormField label="Designation (Optional)" type="text" placeholder="Head Chef, Senior Waiter…" value={form.designation}
                    onChange={v => setForm(p => ({ ...p, designation: v }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Salary Type</label>
                      <select className="input w-full" value={form.salaryType} onChange={e => setForm(p => ({ ...p, salaryType: e.target.value }))}>
                        <option value="MONTHLY">Monthly Fixed</option>
                        <option value="DAILY">Daily Wage</option>
                      </select>
                    </div>
                    <FormField label={form.salaryType === 'MONTHLY' ? 'Monthly (₹)' : 'Daily (₹)'} type="number"
                      value={form.salaryAmount} onChange={v => setForm(p => ({ ...p, salaryAmount: v }))} />
                  </div>
                </>
              )}

              {activeFormTab === 'emergency' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    Emergency contact information is optional but recommended for safety.
                  </div>
                  <FormField label="Contact Name" type="text" placeholder="Suresh Sharma" value={form.emergencyContactName}
                    onChange={v => setForm(p => ({ ...p, emergencyContactName: v }))} />
                  <FormField label="Contact Phone" type="tel" placeholder="9876543210" value={form.emergencyContactPhone}
                    onChange={v => setForm(p => ({ ...p, emergencyContactPhone: v }))} />
                  <div>
                    <label className="label">Relation</label>
                    <select className="input w-full" value={form.emergencyContactRelation}
                      onChange={e => setForm(p => ({ ...p, emergencyContactRelation: e.target.value }))}>
                      <option value="">Select…</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </>
              )}

              {activeFormTab === 'bank' && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
                    <CreditCard size={14} className="mt-0.5 flex-shrink-0" />
                    Bank details are encrypted at rest and used only for salary disbursement.
                  </div>
                  <FormField label="Account Holder Name" type="text" placeholder="Ravi Sharma" value={form.bankAccountName}
                    onChange={v => setForm(p => ({ ...p, bankAccountName: v }))} />
                  <FormField label="Account Number" type="text" placeholder="1234567890123456" value={form.bankAccountNumber}
                    onChange={v => setForm(p => ({ ...p, bankAccountNumber: v }))} />
                  <FormField label="IFSC Code" type="text" placeholder="SBIN0001234" value={form.bankIfsc}
                    onChange={v => setForm(p => ({ ...p, bankIfsc: v }))} />
                  <FormField label="Bank Name" type="text" placeholder="State Bank of India" value={form.bankName}
                    onChange={v => setForm(p => ({ ...p, bankName: v }))} />
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t flex justify-between items-center bg-gray-50">
              <div className="flex gap-1">
                {['basic', 'salary', 'emergency', 'bank'].map((t, i) => (
                  <div key={t} className={`w-2 h-2 rounded-full ${activeFormTab === t ? 'bg-maroon' : 'bg-gray-300'}`} />
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
                <button onClick={handleSave} disabled={isSubmitting || !form.name || !form.phone}
                  className="px-5 py-2 bg-maroon text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : (editingStaffId ? 'Save Changes' : 'Create Staff')}
                </button>
              </div>
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
                <p className="text-xs text-gray-500 mt-0.5">Transfer <strong>{transferStaffName}</strong> to another branch</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Target Branch</label>
                <select className="input w-full" value={targetBranchId} onChange={e => setTargetBranchId(e.target.value)}>
                  <option value="">Select Branch...</option>
                  {branches.map((b: any) => (
                    <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Transferring will un-assign them from their current shift schedule.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 rounded-b-xl border-t flex justify-end gap-3">
              <button onClick={() => { setTransferStaffId(null); setTargetBranchId(''); }}
                className="px-4 py-2 border bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
              <button
                onClick={handleTransfer}
                disabled={!targetBranchId}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && detailStaff && (
        <StaffLedgerModal staff={detailStaff} onClose={() => setShowLedgerModal(false)} />
      )}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{icon} {title}</h4>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium text-right max-w-[180px] truncate">{value}</span>
    </div>
  );
}

function FormField({ label, type, placeholder, value, onChange, required }: {
  label: string; type: string; placeholder?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} className="input w-full" placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}
