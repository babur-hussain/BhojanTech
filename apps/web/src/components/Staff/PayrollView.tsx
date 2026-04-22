import React, { useState } from 'react';
import { StaffMember } from '@restaurant/types';
import { Calculator, CheckCircle, Download } from 'lucide-react';

interface PayrollRow {
  staff: StaffMember; present: number; absent: number;
  deductions: number; advances: number; netPayable: number; isPaid: boolean;
}

function buildPayroll(staff: StaffMember[]): PayrollRow[] {
  return staff.map(s => {
    const totalDays = 26;
    const present   = Math.floor(Math.random() * 4) + 22;
    const absent    = totalDays - present;
    const perDay    = s.salaryType === 'MONTHLY' ? s.salaryAmount / totalDays : s.salaryAmount;
    const deductions= +(absent * perDay).toFixed(2);
    const advances  = Math.random() > 0.7 ? 2000 : 0;
    const netPayable= Math.max(0, +(s.salaryAmount - deductions - advances).toFixed(2));
    return { staff: s, present, absent, deductions, advances, netPayable, isPaid: Math.random() > 0.6 };
  });
}

interface Props { staff: StaffMember[]; }

export default function PayrollView({ staff }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [rows, setRows]   = useState<PayrollRow[]>(() => buildPayroll(staff));

  const markPaid = (staffId: string) =>
    setRows(prev => prev.map(r => r.staff.id === staffId ? { ...r, isPaid: true } : r));

  const totalPayable = rows.reduce((s, r) => s + r.netPayable, 0);
  const totalPaid    = rows.filter(r => r.isPaid).reduce((s, r) => s + r.netPayable, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron" />
          <button className="flex items-center gap-1.5 px-4 py-2 bg-maroon text-white rounded-lg text-sm font-semibold">
            <Calculator size={15}/> Calculate
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

      <div className="bg-white rounded-xl border overflow-x-auto">
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
              <tr key={r.staff.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img src={r.staff.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${r.staff.name}`}
                      className="w-8 h-8 rounded-full" alt=""/>
                    <div>
                      <p className="font-medium">{r.staff.name}</p>
                      <p className="text-xs text-gray-400">{r.staff.role.replace('_',' ')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-green-600 font-semibold">{r.present}</td>
                <td className="px-4 py-3 text-red-500">{r.absent}</td>
                <td className="px-4 py-3">₹{r.staff.salaryAmount.toLocaleString('en-IN')}</td>
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
                      <button onClick={() => markPaid(r.staff.id)}
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded">Mark Paid</button>
                    )}
                    <button className="text-xs px-2 py-1 border rounded text-gray-600 flex items-center gap-1">
                      <Download size={11}/> Slip
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t">
            <tr>
              <td colSpan={6} className="px-4 py-3 font-bold text-gray-600">Total</td>
              <td className="px-4 py-3 font-black text-maroon text-lg">₹{totalPayable.toLocaleString('en-IN')}</td>
              <td colSpan={2}/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
