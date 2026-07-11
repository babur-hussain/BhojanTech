import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, FileText,
  Download, Filter, Loader2, Plus, Send, Receipt, AlertTriangle, TrendingUp
} from 'lucide-react';
import RecordPaymentModal from '../components/Ledger/RecordPaymentModal';
import CreditNoteModal from '../components/Ledger/CreditNoteModal';
import AdvanceDepositModal from '../components/Ledger/AdvanceDepositModal';
import AdjustmentModal from '../components/Ledger/AdjustmentModal';

export default function CustomerLedger() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  useEffect(() => { fetchSummary(); }, [customerId]);
  useEffect(() => { fetchLedger(); }, [customerId, page, dateFrom, dateTo, typeFilter]);

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/customer-ledger/${customerId}/summary`);
      setSummary(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '30');
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (typeFilter) params.append('type', typeFilter);

      const res = await api.get(`/customer-ledger/${customerId}?${params.toString()}`);
      setEntries(res.data.entries || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const refreshAll = () => { fetchSummary(); fetchLedger(); };

  const typeLabels: Record<string, string> = {
    INVOICE: 'Invoice', PAYMENT: 'Payment', REFUND: 'Refund', CREDIT_NOTE: 'Credit Note',
    ADVANCE_DEPOSIT: 'Advance', ADVANCE_USED: 'Advance Used', LOYALTY_REDEEM: 'Loyalty',
    OPENING_BALANCE: 'Opening Bal', ADJUSTMENT: 'Adjustment',
  };
  const typeColors: Record<string, string> = {
    INVOICE: 'bg-red-100 text-red-700', PAYMENT: 'bg-green-100 text-green-700',
    REFUND: 'bg-blue-100 text-blue-700', CREDIT_NOTE: 'bg-purple-100 text-purple-700',
    ADVANCE_DEPOSIT: 'bg-teal-100 text-teal-700', ADVANCE_USED: 'bg-orange-100 text-orange-700',
    LOYALTY_REDEEM: 'bg-yellow-100 text-yellow-700', OPENING_BALANCE: 'bg-gray-100 text-gray-700',
    ADJUSTMENT: 'bg-amber-100 text-amber-700',
  };

  const downloadCSV = () => {
    if (!entries.length) return;
    const headers = ['Date', 'Type', 'Direction', 'Amount (₹)', 'Balance After (₹)', 'Invoice #', 'Notes'];
    const rows = entries.map(e => [
      new Date(e.createdAt).toLocaleDateString('en-IN'),
      typeLabels[e.type] || e.type,
      e.direction,
      e.amountINR.toFixed(2),
      e.balanceAfter.toFixed(2),
      e.invoiceNumber || '',
      (e.notes || '').replace(/,/g, ' '),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ledger_${summary?.customer?.name || 'customer'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {summary?.customer?.name || 'Customer'} — Ledger
            </h1>
            <p className="text-sm text-gray-500">
              {summary?.customer?.phone} · {summary?.customer?.tier} · {summary?.customer?.segment}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`rounded-2xl p-5 border shadow-sm ${summary.outstanding > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className={summary.outstanding > 0 ? 'text-red-500' : 'text-green-500'} />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Outstanding</span>
            </div>
            <p className={`text-3xl font-black ${summary.outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>
              ₹{(summary.outstanding || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={18} className="text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Credit Balance</span>
            </div>
            <p className="text-3xl font-black text-blue-700">₹{(summary.creditBalance || 0).toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-gray-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Invoices</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{summary.totalInvoices || 0}</p>
            <p className="text-xs text-gray-500 mt-1">₹{(summary.totalInvoiceAmount || 0).toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-green-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Payments</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{summary.totalPayments || 0}</p>
            <p className="text-xs text-gray-500 mt-1">₹{(summary.totalPaymentAmount || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Aging Analysis */}
      {summary?.aging && summary.outstanding > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">Aging Analysis</h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">Current (0–7d)</p>
              <p className="text-xl font-black text-green-700">₹{(summary.aging.current || 0).toLocaleString()}</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">Overdue (7–30d)</p>
              <p className="text-xl font-black text-yellow-700">₹{(summary.aging.overdue7to30 || 0).toLocaleString()}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">Overdue (30–60d)</p>
              <p className="text-xl font-black text-orange-700">₹{(summary.aging.overdue30to60 || 0).toLocaleString()}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl border border-red-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">Bad Debt (60d+)</p>
              <p className="text-xl font-black text-red-700">₹{(summary.aging.overdue60plus || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition shadow-sm">
          <Plus size={16} /> Record Payment
        </button>
        <button onClick={() => setShowCreditNoteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition shadow-sm">
          <Receipt size={16} /> Credit Note
        </button>
        <button onClick={() => setShowAdvanceModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm transition shadow-sm">
          <DollarSign size={16} /> Advance Deposit
        </button>
        <button onClick={() => setShowAdjustmentModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition shadow-sm">
          <FileText size={16} /> Adjustment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</label>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Types</option>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button onClick={() => { setDateFrom(''); setDateTo(''); setTypeFilter(''); setPage(1); }}
          className="text-sm text-gray-500 hover:text-gray-800 underline pb-2">
          Clear Filters
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Description</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Debit (₹)</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Credit (₹)</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <Loader2 size={24} className="animate-spin text-gray-400 mx-auto" />
                </td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-500">No ledger entries found.</td></tr>
              ) : entries.map(e => (
                <tr key={e._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <div className="text-xs text-gray-400">
                      {new Date(e.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${typeColors[e.type] || 'bg-gray-100 text-gray-700'}`}>
                      {typeLabels[e.type] || e.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {e.notes || '—'}
                    {e.invoiceNumber && <span className="ml-2 text-xs text-gray-400">#{e.invoiceNumber}</span>}
                    {e.createdByName && <div className="text-xs text-gray-400">by {e.createdByName}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {e.direction === 'DEBIT' ? (
                      <span className="text-red-600 font-bold flex items-center justify-end gap-1">
                        <ArrowUpRight size={14} /> {e.amountINR.toLocaleString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {e.direction === 'CREDIT' ? (
                      <span className="text-green-600 font-bold flex items-center justify-end gap-1">
                        <ArrowDownRight size={14} /> {e.amountINR.toLocaleString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    <span className={e.balanceAfter > 0 ? 'text-red-700' : e.balanceAfter < 0 ? 'text-green-700' : 'text-gray-700'}>
                      {e.balanceAfter > 0 ? '' : e.balanceAfter < 0 ? '-' : ''}₹{Math.abs(e.balanceAfter).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-500">{total} entries total</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm bg-white border rounded-lg disabled:opacity-50">
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm bg-white border rounded-lg disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPaymentModal && (
        <RecordPaymentModal customerId={customerId!} onClose={() => setShowPaymentModal(false)} onSuccess={refreshAll} />
      )}
      {showCreditNoteModal && (
        <CreditNoteModal customerId={customerId!} onClose={() => setShowCreditNoteModal(false)} onSuccess={refreshAll} />
      )}
      {showAdvanceModal && (
        <AdvanceDepositModal customerId={customerId!} onClose={() => setShowAdvanceModal(false)} onSuccess={refreshAll} />
      )}
      {showAdjustmentModal && (
        <AdjustmentModal customerId={customerId!} onClose={() => setShowAdjustmentModal(false)} onSuccess={refreshAll} />
      )}
    </div>
  );
}
