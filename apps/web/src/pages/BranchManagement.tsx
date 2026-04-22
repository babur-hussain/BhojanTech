import React, { useState, useEffect } from 'react';
import { Plus, Edit2, MapPin, Phone, Building, Save, X } from 'lucide-react';

interface Branch {
    id: string;
    name: string;
    address: string;
    city: string;
    pincode: string;
    phone: string;
    gstin?: string;
    fssaiNumber?: string;
    managerId?: string;
    invoicePrefix: string;
    isActive: boolean;
}

export default function BranchManagement() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Partial<Branch>>({});

    useEffect(() => {
        // Stub: fetch from backend
        setBranches([
            {
                id: '1',
                name: 'Main Branch',
                address: 'Connaught Place',
                city: 'Delhi',
                pincode: '110001',
                phone: '9876543210',
                gstin: '07AAAAA0000A1Z5',
                fssaiNumber: '10012011000000',
                invoicePrefix: 'CP',
                isActive: true,
            }
        ]);
    }, []);

    const handleSave = () => {
        // Stub: save to backend
        if (editingBranch.id) {
            setBranches(branches.map(b => b.id === editingBranch.id ? { ...b, ...editingBranch } as Branch : b));
        } else {
            setBranches([...branches, { ...editingBranch, id: Date.now().toString(), isActive: true } as Branch]);
        }
        setModalOpen(false);
        setEditingBranch({});
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Branch Management</h1>
                    <p className="text-gray-500 mt-1">Manage multiple restaurant locations under this chain.</p>
                </div>
                <button
                    onClick={() => { setEditingBranch({}); setModalOpen(true); }}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                    <Plus size={20} /> Add Branch
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map(branch => (
                    <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                    <Building size={18} className="text-brand-500" /> {branch.name}
                                </h3>
                                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded mt-1 inline-block ${branch.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {branch.isActive ? 'Active' : 'Offline'}
                                </span>
                            </div>
                            <button onClick={() => { setEditingBranch(branch); setModalOpen(true); }} className="text-gray-400 hover:text-brand-600">
                                <Edit2 size={18} />
                            </button>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                            <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5" /> {branch.address}, {branch.city} - {branch.pincode}</p>
                            <p className="flex items-center gap-2"><Phone size={16} /> {branch.phone}</p>
                            <div className="pt-3 mt-3 border-t border-gray-50 flex justify-between">
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Invoice Prefix</p>
                                    <p className="font-semibold text-gray-800">{branch.invoicePrefix}-INV-XXXX</p>
                                </div>
                                {branch.gstin && (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 mb-0.5">GSTIN</p>
                                        <p className="font-semibold text-gray-800">{branch.gstin}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingBranch.id ? 'Edit Branch' : 'Add New Branch'}</h2>
                            <button onClick={() => setModalOpen(false)}><X className="text-gray-400 hover:text-gray-700" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Branch Name</label>
                                    <input type="text" value={editingBranch.name || ''} onChange={e => setEditingBranch({ ...editingBranch, name: e.target.value })} className="w-full border rounded-lg p-2 focus:border-brand-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Prefix</label>
                                    <input type="text" value={editingBranch.invoicePrefix || ''} onChange={e => setEditingBranch({ ...editingBranch, invoicePrefix: e.target.value.toUpperCase() })} className="w-full border rounded-lg p-2 focus:border-brand-500 focus:outline-none" placeholder="e.g. LN" maxLength={4} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Address</label>
                                    <input type="text" value={editingBranch.address || ''} onChange={e => setEditingBranch({ ...editingBranch, address: e.target.value })} className="w-full border rounded-lg p-2 focus:border-brand-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                                    <input type="text" value={editingBranch.city || ''} onChange={e => setEditingBranch({ ...editingBranch, city: e.target.value })} className="w-full border rounded-lg p-2 focus:border-brand-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Pincode</label>
                                    <input type="text" value={editingBranch.pincode || ''} onChange={e => setEditingBranch({ ...editingBranch, pincode: e.target.value })} className="w-full border rounded-lg p-2 focus:border-brand-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                                    <input type="text" value={editingBranch.phone || ''} onChange={e => setEditingBranch({ ...editingBranch, phone: e.target.value })} className="w-full border rounded-lg p-2 focus:border-brand-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Manager</label>
                                    <select value={editingBranch.managerId || ''} onChange={e => setEditingBranch({ ...editingBranch, managerId: e.target.value })} className="w-full border rounded-lg p-2 focus:border-brand-500 focus:outline-none bg-white">
                                        <option value="">Select Manager...</option>
                                        <option value="user1">Rahul Sharma</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">GSTIN (Optional)</label>
                                    <input type="text" value={editingBranch.gstin || ''} onChange={e => setEditingBranch({ ...editingBranch, gstin: e.target.value })} className="w-full border rounded-lg p-2 focus:border-brand-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">FSSAI (Optional)</label>
                                    <input type="text" value={editingBranch.fssaiNumber || ''} onChange={e => setEditingBranch({ ...editingBranch, fssaiNumber: e.target.value })} className="w-full border rounded-lg p-2 focus:border-brand-500 focus:outline-none" />
                                </div>
                            </div>
                            <button onClick={handleSave} className="w-full bg-saffron hover:bg-orange-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 mt-4 transition-colors">
                                <Save size={18} /> Save Branch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
