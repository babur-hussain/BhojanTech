import React, { useState } from 'react';
import { InventoryItem, WastageReason } from '@restaurant/types';
import { X, TrendingDown } from 'lucide-react';

const REASONS: { value: WastageReason; label: string }[] = [
  { value: 'SPOILED',    label: '🤢 Spoiled' },
  { value: 'DROPPED',   label: '💧 Dropped' },
  { value: 'OVERCOOKED',label: '🔥 Overcooked' },
  { value: 'EXPIRED',   label: '📅 Expired' },
  { value: 'OTHER',     label: '❓ Other' },
];

interface Props { item: InventoryItem & { status: any }; onClose: () => void; onSave: (qty: number, reason: WastageReason, notes: string) => void; }

export default function WastageModal({ item, onClose, onSave }: Props) {
  const [qty, setQty]         = useState('');
  const [reason, setReason]   = useState<WastageReason>('SPOILED');
  const [notes, setNotes]     = useState('');
  const estCost = qty ? +(+qty * item.costPerUnit).toFixed(2) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex justify-between items-center px-5 py-4 border-b bg-red-50 rounded-t-xl">
          <h2 className="font-bold text-red-800 text-lg flex items-center gap-2"><TrendingDown size={18}/> Log Wastage — {item.name}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-500"/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Quantity Wasted ({item.unit})</label>
            <input type="number" min={0.001} max={item.currentQty} step={0.001} className="input w-full" value={qty} onChange={e => setQty(e.target.value)} autoFocus />
            <p className="text-xs text-gray-400 mt-1">Available: {item.currentQty} {item.unit}</p>
          </div>
          <div>
            <label className="label">Reason</label>
            <div className="grid grid-cols-1 gap-2">
              {REASONS.map(r => (
                <label key={r.value} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${reason === r.value ? 'border-maroon bg-red-50 font-semibold' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" className="sr-only" checked={reason === r.value} onChange={() => setReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input w-full" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details…" />
          </div>
          {estCost > 0 && (
            <div className="bg-red-50 rounded-lg p-3 text-red-800 text-sm font-semibold text-center">
              Estimated Loss: ₹{estCost.toLocaleString('en-IN')}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSave(+qty, reason, notes)} disabled={!qty || +qty <= 0 || +qty > item.currentQty} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">Log Wastage</button>
        </div>
      </div>
    </div>
  );
}
