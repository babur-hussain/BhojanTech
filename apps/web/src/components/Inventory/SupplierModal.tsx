import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Props { onClose: () => void; onSave: () => void; }

export default function SupplierModal({ onClose, onSave }: Props) {
  const [form, setForm] = useState({ name:'', contactName:'', phone:'', email:'', address:'', notes:'' });
  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center px-5 py-4 border-b bg-cream rounded-t-xl">
          <h2 className="font-bold text-maroon text-lg">Add Supplier</h2>
          <button onClick={onClose}><X size={22} className="text-gray-500"/></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="label">Supplier Name *</label><input className="input w-full" value={form.name} onChange={f('name')} /></div>
          <div><label className="label">Contact Person</label><input className="input w-full" value={form.contactName} onChange={f('contactName')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input type="tel" className="input w-full" value={form.phone} onChange={f('phone')} /></div>
            <div><label className="label">Email</label><input type="email" className="input w-full" value={form.email} onChange={f('email')} /></div>
          </div>
          <div><label className="label">Address</label><textarea className="input w-full" rows={2} value={form.address} onChange={f('address') as any} /></div>
          <div><label className="label">Notes</label><input className="input w-full" value={form.notes} onChange={f('notes')} /></div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={onSave} disabled={!form.name} className="px-5 py-2 bg-maroon text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  );
}
