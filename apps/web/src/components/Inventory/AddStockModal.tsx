import React, { useState } from 'react';
import { InventoryItem } from '@restaurant/types';
import { X, Package } from 'lucide-react';

interface Props { item: InventoryItem & { status: any }; onClose: () => void; onSave: (qty: number, cpu: number, supplierName?: string, invoiceNumber?: string) => void; }

export default function AddStockModal({ item, onClose, onSave }: Props) {
  const [qty, setQty]               = useState('');
  const [cpu, setCpu]               = useState(String(item.costPerUnit));
  const [supplier, setSupplier]     = useState(item.supplierName ?? '');
  const [invNum, setInvNum]         = useState('');
  const totalCost = qty && cpu ? +(+qty * +cpu).toFixed(2) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex justify-between items-center px-5 py-4 border-b bg-green-50 rounded-t-xl">
          <h2 className="font-bold text-green-800 text-lg flex items-center gap-2"><Package size={18}/> Add Stock — {item.name}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-500"/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Quantity Added ({item.unit})</label>
            <input type="number" min={0.001} step={0.001} className="input w-full" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" autoFocus />
          </div>
          <div>
            <label className="label">Cost per {item.unit} (₹)</label>
            <input type="number" min={0} step={0.01} className="input w-full" value={cpu} onChange={e => setCpu(e.target.value)} />
          </div>
          <div>
            <label className="label">Supplier Name</label>
            <input className="input w-full" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" />
          </div>
          <div>
            <label className="label">Invoice # (optional)</label>
            <input className="input w-full" value={invNum} onChange={e => setInvNum(e.target.value)} placeholder="INV-xxxx" />
          </div>
          {totalCost > 0 && (
            <div className="bg-green-50 rounded-lg p-3 text-green-800 text-sm font-semibold text-center">
              Total Purchase Cost: ₹{totalCost.toLocaleString('en-IN')}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSave(+qty, +cpu, supplier, invNum)} disabled={!qty || +qty <= 0} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">Save Stock</button>
        </div>
      </div>
    </div>
  );
}
