import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';

interface Props { customerId: string; onClose: () => void; onSuccess: () => void; }

export default function CreditNoteModal({ customerId, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return alert('Enter a valid amount');
    if (!reason.trim()) return alert('Please provide a reason');
    try {
      setSubmitting(true);
      await api.post('/customer-ledger/credit-note', { customerId, amountINR: Number(amount), reason });
      onSuccess();
      onClose();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-purple-50">
          <h2 className="font-bold text-lg text-purple-800">Issue Credit Note</h2>
          <button onClick={onClose} className="p-1 hover:bg-purple-100 rounded-full"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Credit Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-bold focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="e.g., Wrong order served, food complaint..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />} Issue Credit Note
          </button>
        </div>
      </div>
    </div>
  );
}
