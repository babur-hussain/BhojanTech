import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';

interface Props { customerId: string; onClose: () => void; onSuccess: () => void; }

export default function RecordPaymentModal({ customerId, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return alert('Enter a valid amount');
    try {
      setSubmitting(true);
      await api.post('/customer-ledger/payment', { customerId, amountINR: Number(amount), paymentMode: mode, notes });
      onSuccess();
      onClose();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-green-50">
          <h2 className="font-bold text-lg text-green-800">Record Payment</h2>
          <button onClick={onClose} className="p-1 hover:bg-green-100 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-bold focus:ring-green-500 focus:border-green-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Payment Mode</label>
            <select value={mode} onChange={e => setMode(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm">
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Partial payment for last month"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />} Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}
