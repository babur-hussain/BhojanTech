import React, { useState, useEffect } from 'react';
import { StaffMember } from '@restaurant/types';
import { Calculator, CheckCircle, Download } from 'lucide-react';
import { api } from '../../utils/api';
import PageLoader from '../PageLoader';

interface Props { staff: (StaffMember & { id: string })[]; }

export default function PayrollView({ staff }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [rows, setRows]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/staff/payroll/${month}`);
      setRows(res.data);
    } catch (e) {
      console.error('Failed to fetch payroll:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month]);

  const handleCalculate = async () => {
    try {
      setLoading(true);
      await api.post(`/staff/payroll/${month}/calculate`);
      fetchPayroll();
      alert('Payroll calculated successfully for ' + month);
    } catch (e) {
      console.error('Failed to calculate payroll:', e);
      alert('Failed to calculate payroll');
      setLoading(false);
    }
  };

  const markPaid = async (recordId: string) => {
    try {
      await api.patch(`/staff/payroll/${recordId}/paid`);
      fetchPayroll();
    } catch (e) {
      console.error('Failed to mark as paid:', e);
      alert('Failed to mark as paid');
    }
  };

  const totalPayable = rows.reduce((s, r) => s + r.netPayable, 0);
  const totalPaid    = rows.filter(r => r.isPaid).reduce((s, r) => s + r.netPayable, 0);

  if (loading && rows.length === 0) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron" />
          <button onClick={handleCalculate} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-maroon text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            <Calculator size={15}/> {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="bg-blue-50 px-3 py-2 rounded-lg">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-blue-700 ml-2">₹{totalPayable.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-green-50 px-3 py-2 rounded-lg">
            <span className="text-gray-500">Paid</span>
            <span className="font-bold text-green-700 ml-2">₹{totalPaid.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-xl border overflow-x-auto transition-opacity ${loading ? 'opacity-50' : ''}`}>
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <tr>
              {['Staff','Present','Absent','Base','Deductions','Advances','Net Payable','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(r => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${r.staffName}`}
                      className="w-8 h-8 rounded-full" alt=""/>
                    <div>
                      <p className="font-medium">{r.staffName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-green-600 font-semibold">{r.presentDays + (r.halfDays * 0.5)}</td>
                <td className="px-4 py-3 text-red-500">{r.absentDays}</td>
                <td className="px-4 py-3">₹{r.baseSalary.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-red-500">-₹{r.deductions.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-orange-500">{r.advances ? `-₹${r.advances}` : '—'}</td>
                <td className="px-4 py-3 font-black">₹{r.netPayable.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  {r.isPaid
                    ? <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle size={12}/> Paid</span>
                    : <span className="text-xs text-amber-600 font-semibold">Pending</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {!r.isPaid && (
                      <button onClick={() => markPaid(r._id)}
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Mark Paid</button>
                    )}
                    <button className="text-xs px-2 py-1 border rounded text-gray-600 flex items-center gap-1 hover:bg-gray-50">
                      <Download size={11}/> Slip
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No payroll records for this month. Click "Calculate" to generate.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={6} className="px-4 py-3 font-bold text-gray-600 text-right">Total</td>
                <td className="px-4 py-3 font-black text-maroon text-lg">₹{totalPayable.toLocaleString('en-IN')}</td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
