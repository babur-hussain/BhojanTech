import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Loader2, Download, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OutstandingReport() {
  const [report, setReport] = useState<any[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer-ledger/reports/outstanding');
      setReport(res.data.report || []);
      setTotalOutstanding(res.data.totalOutstanding || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!report.length) return;
    const headers = ['Customer Name', 'Phone', 'Tier', 'Segment', 'Outstanding (₹)', 'Last Transaction', 'Total Debits (₹)', 'Total Credits (₹)'];
    const rows = report.map(r => [
      r.customerName,
      r.customerPhone,
      r.tier,
      r.segment,
      r.outstanding.toFixed(2),
      new Date(r.lastTransaction).toLocaleDateString('en-IN'),
      r.totalDebits.toFixed(2),
      r.totalCredits.toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `outstanding_report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Outstanding Balances</h1>
          <p className="text-sm text-gray-500 mt-1">Customers who owe money to the restaurant</p>
        </div>
        <button onClick={downloadCSV}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition shadow-md">
          <Download size={18} /> Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-red-500" size={20} />
            <span className="text-sm font-bold uppercase tracking-widest text-red-700">Total Outstanding</span>
          </div>
          <p className="text-4xl font-black text-red-700">₹{totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Customers</div>
            <p className="text-4xl font-black text-gray-900">{report.length}</p>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Tier / Segment</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Last Transaction</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Outstanding</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="py-16 text-center"><Loader2 size={32} className="animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : report.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-gray-500">No outstanding balances found.</td></tr>
              ) : report.map(r => (
                <tr key={r.customerId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-base">{r.customerName}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{r.customerPhone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-700 mr-2">{r.tier}</span>
                    <span className="text-xs text-gray-500">{r.segment}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(r.lastTransaction).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-red-600 font-bold text-lg flex items-center justify-end gap-1">
                      <ArrowUpRight size={16} /> ₹{r.outstanding.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => navigate(`/customer-ledger/${r.customerId}`)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm hover:underline">
                      View Ledger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
