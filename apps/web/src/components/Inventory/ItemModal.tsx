import React, { useState } from 'react';
import { InventoryItem, InventoryUnit } from '@restaurant/types';
import { X } from 'lucide-react';

const UNITS: InventoryUnit[] = ['kg','grams','litres','ml','pieces','dozen','packets'];
const CATEGORIES = ['Dairy','Vegetables','Spices','Grains','Oil','Proteins','Beverages','Other'];

interface Props {
  item: (InventoryItem & { status: any }) | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function ItemModal({ item, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name:         item?.name        ?? '',
    category:     item?.category    ?? 'Other',
    unit:         item?.unit        ?? 'kg',
    currentQty:   item?.currentQty  ?? 0,
    minThreshold: item?.minThreshold?? 0,
    reorderQty:   item?.reorderQty  ?? 0,
    costPerUnit:  item?.costPerUnit  ?? 0,
  });

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.type === 'number' ? +e.target.value : e.target.value }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center px-5 py-4 border-b bg-cream rounded-t-xl">
          <h2 className="font-bold text-maroon text-lg">{item ? 'Edit Item' : 'Add Inventory Item'}</h2>
          <button onClick={onClose}><X size={22} className="text-gray-500"/></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Item Name</label>
              <input className="input" value={form.name} onChange={f('name')} placeholder="e.g. Paneer" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={f('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit} onChange={f('unit')}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Current Qty</label>
              <input type="number" min={0} step={0.01} className="input" value={form.currentQty} onChange={f('currentQty')} />
            </div>
            <div>
              <label className="label">Min Threshold</label>
              <input type="number" min={0} step={0.01} className="input" value={form.minThreshold} onChange={f('minThreshold')} />
            </div>
            <div>
              <label className="label">Reorder Qty</label>
              <input type="number" min={0} step={0.01} className="input" value={form.reorderQty} onChange={f('reorderQty')} />
            </div>
            <div>
              <label className="label">Cost / Unit (₹)</label>
              <input type="number" min={0} step={0.01} className="input" value={form.costPerUnit} onChange={f('costPerUnit')} />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.name} className="px-5 py-2 bg-maroon text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  );
}
