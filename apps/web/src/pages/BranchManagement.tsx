import React, { useState, useEffect } from 'react';
import { Plus, Edit2, MapPin, Phone, Building, Save, X } from 'lucide-react';
import { api } from '../utils/api';
import PageLoader from '../components/PageLoader';

interface Branch {
    _id?: string;
    id?: string;
    name: string;
    address: string;
    city: string;
    pincode: string;
    phone: string;
    gstin?: string;
    fssaiNumber?: string;
    managerId?: any; // object when populated
    invoicePrefix: string;
    isActive: boolean;
}

interface Staff {
    _id: string;
    name: string;
    role: string;
}

export default function BranchManagement() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Partial<Branch>>({});

    // UI State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true); setError('');
            const [bRes, sRes] = await Promise.all([
                api.get('/branches'),
                api.get('/staff')
            ]);
            setBranches(bRes.data);
            setStaffList(sRes.data);
        } catch (e: any) {
            console.error('Failed to load branches', e);
            setError('Failed to load branch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async () => {
        try {
            setSaving(true);
            const branchId = editingBranch._id || editingBranch.id;

            // Clean up the managerId payload since it might be an object if populated previously
            const payload = { ...editingBranch };
            if (payload.managerId && typeof payload.managerId === 'object') {
                payload.managerId = payload.managerId._id;
            }

            if (branchId) {
                await api.put(`/branches/${branchId}`, payload);
            } else {
                await api.post('/branches', payload);
            }

            setModalOpen(false);
            setEditingBranch({});
            await fetchData();
        } catch (e: any) {
            console.error('Failed to save branch', e);
            alert(e.response?.data?.error || 'Failed to save branch');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Branch Management</h1>
                    <p className="text-gray-500 mt-1">Manage multiple restaurant locations under this chain.</p>
                </div>
                <button
                    onClick={() => { setEditingBranch({ isActive: true }); setModalOpen(true); }}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                    <Plus size={20} /> Add Branch
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 border border-red-200 rounded-lg mb-6 shadow-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <Building size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-gray-500 text-lg">No branches found</p>
                        <p className="text-sm">Click "Add Branch" to set up your first location.</p>
                    </div>
                ) : (
                    branches.map(branch => {
                        const branchId = branch._id || branch.id;
                        return (
                            <div key={branchId} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 group hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                            <Building size={18} className="text-brand-500" /> {branch.name}
                                        </h3>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded mt-1 inline-block ${branch.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {branch.isActive ? 'Active' : 'Offline'}
                                        </span>
                                    </div>
                                    <button onClick={() => { setEditingBranch(branch); setModalOpen(true); }} className="text-gray-400 hover:text-brand-600 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-50 rounded-md">
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 flex-shrink-0" /> <span className="line-clamp-2">{branch.address}, {branch.city} - {branch.pincode}</span></p>
                                    <p className="flex items-center gap-2"><Phone size={16} className="flex-shrink-0" /> {branch.phone}</p>

                                    {branch.managerId && branch.managerId.name && (
                                        <p className="flex items-center gap-2 text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <span className="font-semibold text-gray-700">Manager:</span> {branch.managerId.name}
                                        </p>
                                    )}

                                    <div className="pt-3 mt-3 border-t border-gray-50 flex gap-4">
                                        <div className="flex-1 bg-gray-50 p-2 rounded text-center">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">Prefix</p>
                                            <p className="font-semibold text-brand-700">{branch.invoicePrefix}</p>
                                        </div>
                                        <div className="flex-1 bg-gray-50 p-2 rounded text-center">
                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">GSTIN</p>
                                            <p className="font-semibold text-gray-700 text-xs mt-0.5">{branch.gstin || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                                {editingBranch._id || editingBranch.id ? 'Edit Branch' : 'Add New Location'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="text-gray-400" size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 tracking-wide">Branch Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={editingBranch.name || ''} onChange={e => setEditingBranch({ ...editingBranch, name: e.target.value })} className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium" placeholder="E.g. South Extension" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 tracking-wide">Invoice Prefix <span className="text-red-500">*</span></label>
                                    <input type="text" value={editingBranch.invoicePrefix || ''} onChange={e => setEditingBranch({ ...editingBranch, invoicePrefix: e.target.value.toUpperCase() })} className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-bold uppercase placeholder-gray-300" placeholder="e.g. SE" maxLength={4} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 tracking-wide">Full Address <span className="text-red-500">*</span></label>
                                    <input type="text" value={editingBranch.address || ''} onChange={e => setEditingBranch({ ...editingBranch, address: e.target.value })} className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 tracking-wide">City <span className="text-red-500">*</span></label>
                                    <input type="text" value={editingBranch.city || ''} onChange={e => setEditingBranch({ ...editingBranch, city: e.target.value })} className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 tracking-wide">Pincode <span className="text-red-500">*</span></label>
                                    <input type="text" value={editingBranch.pincode || ''} onChange={e => setEditingBranch({ ...editingBranch, pincode: e.target.value })} className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 tracking-wide">Phone <span className="text-red-500">*</span></label>
                                    <input type="text" value={editingBranch.phone || ''} onChange={e => setEditingBranch({ ...editingBranch, phone: e.target.value })} className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 tracking-wide">Manager</label>
                                    <select
                                        value={(editingBranch.managerId && typeof editingBranch.managerId === 'object' ? editingBranch.managerId._id : editingBranch.managerId) || ''}
                                        onChange={e => setEditingBranch({ ...editingBranch, managerId: e.target.value })}
                                        className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all bg-white"
                                    >
                                        <option value="">-- No Manager Assigned --</option>
                                        {staffList.filter(s => s.role === 'MANAGER' || s.role === 'BRANCH_MANAGER' || s.role === 'OWNER').map(s => (
                                            <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2 my-2 border-t border-dashed border-gray-200" />

                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 tracking-wide">GSTIN <span className="text-gray-400 font-normal lowercase">(Optional)</span></label>
                                    <input type="text" value={editingBranch.gstin || ''} onChange={e => setEditingBranch({ ...editingBranch, gstin: e.target.value })} className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 tracking-wide">FSSAI <span className="text-gray-400 font-normal lowercase">(Optional)</span></label>
                                    <input type="text" value={editingBranch.fssaiNumber || ''} onChange={e => setEditingBranch({ ...editingBranch, fssaiNumber: e.target.value })} className="w-full border-gray-200 border rounded-xl p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-mono" />
                                </div>

                                <div className="col-span-2 flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={editingBranch.isActive ?? true} onChange={e => setEditingBranch({ ...editingBranch, isActive: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Branch is Active</p>
                                        <p className="text-xs text-gray-500">Turn off to temporarily disable orders and access to this branch.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button disabled={saving} onClick={handleSave} className="bg-saffron hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 px-8 rounded-xl flex justify-center items-center gap-2 transition-all shadow-sm shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-0.5">
                                {saving ? <PageLoader /> : <Save size={18} />}
                                {saving ? 'Saving...' : 'Save Branch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
