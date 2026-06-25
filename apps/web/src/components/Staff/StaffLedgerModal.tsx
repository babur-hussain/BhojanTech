import React, { useState, useEffect } from 'react';
import { X, IndianRupee, ArrowDownRight, ArrowUpRight, Plus, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';

interface LedgerEvent {
  date: string;
  type: 'ADVANCE' | 'SALARY_EARNED' | 'SALARY_PAID';
  description: string;
  amount: number;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerResponse {
  currentBalance: number;
  totalAdvances: number;
  ledger: LedgerEvent[];
}

export default function StaffLedgerModal({ staff, onClose }: { staff: any, onClose: () => void }) {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [savingAdvance, setSavingAdvance] = useState(false);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/staff/ledger/${staff._id || staff.id}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) fetchLedger();
  }, [staff]);

  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceAmount || isNaN(+advanceAmount) || +advanceAmount <= 0) return;
    
    try {
      setSavingAdvance(true);
      await api.post('/staff/advance', {
        staffId: staff._id || staff.id,
        amount: +advanceAmount,
        reason: advanceReason
      });
      setShowAddAdvance(false);
      setAdvanceAmount('');
      setAdvanceReason('');
      await fetchLedger();
    } catch (err) {
      console.error('Failed to add advance', err);
    } finally {
      setSavingAdvance(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-maroon to-red-800 p-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <IndianRupee size={20} />
              Salary Ledger
            </h2>
            <p className="text-sm text-white/80 mt-0.5">{staff.name} — {staff.role}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-2">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Loader2 size={32} className="animate-spin mb-3 text-maroon" />
              <p>Loading ledger...</p>
            </div>
          ) : data ? (
            <div className="space-y-5">
              
              {/* Balance Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Balance</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl font-black ${data.currentBalance < 0 ? 'text-orange-600' : data.currentBalance > 0 ? 'text-green-600' : 'text-gray-800'}`}>
                      {data.currentBalance < 0 ? '-' : ''}₹{Math.abs(data.currentBalance).toLocaleString('en-IN')}
                    </span>
                    {data.currentBalance < 0 && (
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        Advance Due
                      </span>
                    )}
                    {data.currentBalance > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        Salary Payable
                      </span>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowAddAdvance(!showAddAdvance)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} /> Give Advance
                </button>
              </div>

              {/* Add Advance Form */}
              {showAddAdvance && (
                <form onSubmit={handleAddAdvance} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">Record New Advance Payment</h4>
                  <div className="flex gap-3">
                    <div className="w-1/3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹)</label>
                      <input 
                        type="number" 
                        required min="1"
                        value={advanceAmount}
                        onChange={e => setAdvanceAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g. 5000"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Reason / Note (Optional)</label>
                      <input 
                        type="text" 
                        value={advanceReason}
                        onChange={e => setAdvanceReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g. Medical emergency"
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        type="submit" 
                        disabled={savingAdvance}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 h-[38px]"
                      >
                        {savingAdvance ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Ledger Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Description</th>
                        <th className="p-4 font-medium text-right text-orange-600">Debit (Out)</th>
                        <th className="p-4 font-medium text-right text-green-600">Credit (In)</th>
                        <th className="p-4 font-medium text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.ledger.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400">
                            No ledger history found for this staff member.
                          </td>
                        </tr>
                      ) : (
                        data.ledger.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-4 text-gray-600 font-medium">
                              {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="p-4">
                              <span className="font-medium text-gray-800">{entry.description}</span>
                              {entry.type === 'ADVANCE' && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase">Advance</span>}
                              {entry.type === 'SALARY_EARNED' && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">Earned</span>}
                              {entry.type === 'SALARY_PAID' && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Paid</span>}
                            </td>
                            <td className="p-4 text-right">
                              {entry.debit > 0 ? (
                                <span className="text-orange-600 font-medium flex items-center justify-end gap-1">
                                  <ArrowDownRight size={14} /> ₹{entry.debit.toLocaleString('en-IN')}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="p-4 text-right">
                              {entry.credit > 0 ? (
                                <span className="text-green-600 font-medium flex items-center justify-end gap-1">
                                  <ArrowUpRight size={14} /> ₹{entry.credit.toLocaleString('en-IN')}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="p-4 text-right font-bold text-gray-900">
                              <span className={entry.balance < 0 ? 'text-orange-600' : ''}>
                                {entry.balance < 0 ? '-' : ''}₹{Math.abs(entry.balance).toLocaleString('en-IN')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-red-500 font-medium">
              Failed to load ledger data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
