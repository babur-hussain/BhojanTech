import React, { useState, useEffect } from 'react';
import {
  Calculator, CheckCircle, Download, Plus, X, IndianRupee,
  FileText, CreditCard, Clock, AlertCircle, ChevronDown, ChevronUp, Printer
} from 'lucide-react';
import { api } from '../../utils/api';
import PageLoader from '../PageLoader';

interface Props { staff: any[]; }

export default function PayrollView({ staff }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [rows, setRows]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Advance Payment Modal
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ staffId: '', amount: '', reason: '' });
  const [advanceSaving, setAdvanceSaving] = useState(false);

  // Advance History
  const [showAdvances, setShowAdvances] = useState(false);
  const [allAdvances, setAllAdvances] = useState<any>(null);
  const [advancesLoading, setAdvancesLoading] = useState(false);

  // Salary Slip
  const [slipData, setSlipData] = useState<any>(null);
  const [slipLoading, setSlipLoading] = useState(false);

  // Expanded row for advance details
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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

  const bulkMarkPaid = async () => {
    if (!confirm(`Mark all unpaid records for ${month} as paid?`)) return;
    try {
      await api.post(`/staff/payroll/${month}/bulk-pay`);
      fetchPayroll();
    } catch (e) {
      alert('Failed to mark all as paid');
    }
  };

  const handleGiveAdvance = async () => {
    if (!advanceForm.staffId || !advanceForm.amount) return;
    try {
      setAdvanceSaving(true);
      await api.post('/staff/advance', {
        staffId: advanceForm.staffId,
        amount: Number(advanceForm.amount),
        reason: advanceForm.reason,
      });
      setShowAdvanceModal(false);
      setAdvanceForm({ staffId: '', amount: '', reason: '' });
      // Refresh data
      fetchPayroll();
      if (showAdvances) fetchAllAdvances();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to give advance');
    } finally {
      setAdvanceSaving(false);
    }
  };

  const fetchAllAdvances = async () => {
    try {
      setAdvancesLoading(true);
      const res = await api.get('/staff/advances/all');
      setAllAdvances(res.data);
    } catch (e) {
      console.error('Failed to fetch advances:', e);
    } finally {
      setAdvancesLoading(false);
    }
  };

  const cancelAdvance = async (advanceId: string) => {
    if (!confirm('Cancel this advance? The amount will be restored.')) return;
    try {
      await api.patch(`/staff/advance/${advanceId}/cancel`, { reason: 'Cancelled by manager' });
      fetchAllAdvances();
      fetchPayroll();
    } catch (e) {
      alert('Failed to cancel advance');
    }
  };

  const viewSalarySlip = async (staffId: string) => {
    try {
      setSlipLoading(true);
      const res = await api.get(`/staff/payroll/${month}/${staffId}/slip`);
      setSlipData(res.data);
    } catch (e) {
      alert('Salary slip not available. Calculate payroll first.');
    } finally {
      setSlipLoading(false);
    }
  };

  const printSlip = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !slipData) return;
    const { staff: s, salary: sal, advanceDeductions } = slipData;
    printWindow.document.write(`
      <html>
      <head><title>Salary Slip — ${s.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 18px; margin-bottom: 5px; }
        h2 { font-size: 14px; color: #666; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        td, th { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .total { font-weight: bold; font-size: 16px; background: #f0f0f0; }
        .section-title { font-weight: 600; font-size: 13px; color: #333; margin-top: 20px; margin-bottom: 5px; }
        .paid-badge { color: green; font-weight: bold; }
        .pending-badge { color: orange; font-weight: bold; }
        hr { border: none; border-top: 2px solid #333; margin: 20px 0; }
      </style>
      </head>
      <body>
        <h1>SALARY SLIP</h1>
        <h2>Month: ${sal.month} | Generated: ${new Date().toLocaleDateString('en-IN')}</h2>
        <hr/>
        <table>
          <tr><td>Employee Name</td><td><strong>${s.name}</strong></td></tr>
          <tr><td>Designation</td><td>${s.designation}</td></tr>
          <tr><td>Employee ID</td><td>${String(s.employeeId).slice(-8).toUpperCase()}</td></tr>
          <tr><td>Joining Date</td><td>${new Date(s.joiningDate).toLocaleDateString('en-IN')}</td></tr>
          ${s.bankDetails ? `<tr><td>Bank</td><td>${s.bankDetails.bankName} — ${s.bankDetails.accountNumber}</td></tr>` : ''}
        </table>
        <p class="section-title">EARNINGS</p>
        <table>
          <tr><th>Description</th><th>Amount (₹)</th></tr>
          <tr><td>Base Salary (${sal.salaryType})</td><td>${sal.baseSalary.toLocaleString('en-IN')}</td></tr>
          <tr><td>Working Days</td><td>${sal.totalWorkingDays}</td></tr>
          <tr><td>Present Days</td><td>${sal.presentDays} ${sal.halfDays > 0 ? `(+${sal.halfDays} half)` : ''}</td></tr>
        </table>
        <p class="section-title">DEDUCTIONS</p>
        <table>
          <tr><th>Description</th><th>Amount (₹)</th></tr>
          <tr><td>Absence Deductions (${sal.absentDays} days)</td><td>${sal.deductions.toLocaleString('en-IN')}</td></tr>
          <tr><td>Advance Deductions</td><td>${sal.advances.toLocaleString('en-IN')}</td></tr>
          ${advanceDeductions.map((a: any) => `<tr><td style="padding-left:30px;color:#888">↳ ${new Date(a.date).toLocaleDateString('en-IN')} — ${a.reason || 'Advance'}</td><td style="color:#888">${a.amount.toLocaleString('en-IN')}</td></tr>`).join('')}
        </table>
        <table>
          <tr class="total"><td>NET PAYABLE</td><td>₹${sal.netPayable.toLocaleString('en-IN')}</td></tr>
        </table>
        <p>Status: <span class="${sal.isPaid ? 'paid-badge' : 'pending-badge'}">${sal.isPaid ? 'PAID' : 'PENDING'}</span>
        ${sal.isPaid ? ` | Paid on: ${new Date(sal.paidDate).toLocaleDateString('en-IN')}` : ''}</p>
        <hr/>
        <p style="font-size:11px;color:#999;text-align:center">This is a computer-generated salary slip and does not require a signature.</p>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const totalPayable = rows.reduce((s, r) => s + r.netPayable, 0);
  const totalPaid    = rows.filter(r => r.isPaid).reduce((s, r) => s + r.netPayable, 0);
  const totalPending = totalPayable - totalPaid;
  const totalAdvances = rows.reduce((s, r) => s + (r.advances || 0), 0);
  const unpaidCount  = rows.filter(r => !r.isPaid).length;

  if (loading && rows.length === 0) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron" />
          <button onClick={handleCalculate} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-maroon text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            <Calculator size={15}/> {loading ? 'Calculating...' : 'Calculate Payroll'}
          </button>
          <button onClick={() => setShowAdvanceModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600">
            <Plus size={15} /> Give Advance
          </button>
          <button onClick={() => { setShowAdvances(!showAdvances); if (!showAdvances) fetchAllAdvances(); }}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium ${showAdvances ? 'bg-orange-50 border-orange-300 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <CreditCard size={14} /> {showAdvances ? 'Hide' : 'View'} Advances
          </button>
        </div>
        {unpaidCount > 0 && rows.length > 0 && (
          <button onClick={bulkMarkPaid}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">
            <CheckCircle size={14} /> Mark All Paid ({unpaidCount})
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Payable', value: `₹${totalPayable.toLocaleString('en-IN')}`, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Pending', value: `₹${totalPending.toLocaleString('en-IN')}`, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Advances Deducted', value: `₹${totalAdvances.toLocaleString('en-IN')}`, color: 'bg-orange-50 text-orange-700 border-orange-200' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-3 ${c.color}`}>
            <p className="text-xs opacity-70">{c.label}</p>
            <p className="text-lg font-black mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Advance History Panel */}
      {showAdvances && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-orange-200 flex items-center justify-between">
            <h3 className="font-bold text-orange-800 text-sm flex items-center gap-2">
              <CreditCard size={15} /> All Advance Payments
              {allAdvances && <span className="text-xs font-normal text-orange-600">
                (Active: ₹{allAdvances.totalActiveAmount?.toLocaleString('en-IN') || 0})
              </span>}
            </h3>
          </div>
          {advancesLoading ? (
            <div className="p-8 text-center text-orange-400 text-sm">Loading advances...</div>
          ) : allAdvances?.advances?.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-orange-100/50 text-xs text-orange-700 uppercase">
                <tr>
                  {['Staff', 'Amount', 'Reason', 'Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {allAdvances.advances.map((a: any) => (
                  <tr key={a._id} className="hover:bg-orange-50/50">
                    <td className="px-4 py-2 font-medium text-gray-800">{a.staffName}</td>
                    <td className="px-4 py-2 font-bold text-orange-700">₹{a.amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{a.reason || '—'}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{new Date(a.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        a.status === 'ACTIVE' ? 'bg-orange-200 text-orange-800' :
                        a.status === 'DEDUCTED' ? 'bg-green-200 text-green-800' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {a.status}
                        {a.deductedInMonth && ` (${a.deductedInMonth})`}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {a.status === 'ACTIVE' && (
                        <button onClick={() => cancelAdvance(a._id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-orange-400 text-sm">No advance payments recorded yet.</div>
          )}
        </div>
      )}

      {/* Payroll Table */}
      <div className={`bg-white rounded-xl border overflow-x-auto transition-opacity ${loading ? 'opacity-50' : ''}`}>
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <tr>
              {['Staff','Present','Absent','Half','Base Salary','Deductions','Advances','Net Payable','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(r => (
              <React.Fragment key={r._id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${r.staffName}`}
                        className="w-8 h-8 rounded-full" alt=""/>
                      <div>
                        <p className="font-medium">{r.staffName}</p>
                        <p className="text-[10px] text-gray-400">{r.salaryType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-green-600 font-semibold">{r.presentDays + (r.halfDays * 0.5)}</td>
                  <td className="px-4 py-3 text-red-500">{r.absentDays}</td>
                  <td className="px-4 py-3 text-blue-500">{r.halfDays}</td>
                  <td className="px-4 py-3">₹{r.baseSalary.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-red-500">{r.deductions > 0 ? `-₹${r.deductions.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-4 py-3">
                    {r.advances > 0 ? (
                      <button onClick={() => setExpandedRow(expandedRow === r._id ? null : r._id)}
                        className="flex items-center gap-1 text-orange-600 font-semibold hover:text-orange-800">
                        -₹{r.advances.toLocaleString('en-IN')}
                        {expandedRow === r._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-black text-lg">₹{r.netPayable.toLocaleString('en-IN')}</td>
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
                      <button onClick={() => viewSalarySlip(r.staffId)}
                        className="text-xs px-2 py-1 border rounded text-gray-600 flex items-center gap-1 hover:bg-gray-50">
                        <FileText size={11}/> Slip
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Expanded advance details */}
                {expandedRow === r._id && r.advances > 0 && (
                  <tr className="bg-orange-50">
                    <td colSpan={10} className="px-6 py-3">
                      <p className="text-xs font-semibold text-orange-700 mb-1">Advance Deductions for {r.staffName}:</p>
                      <p className="text-xs text-gray-500">Total ₹{r.advances.toLocaleString('en-IN')} deducted from salary this month</p>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  No payroll records for this month. Click "Calculate Payroll" to generate.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={7} className="px-4 py-3 font-bold text-gray-600 text-right">Total</td>
                <td className="px-4 py-3 font-black text-maroon text-lg">₹{totalPayable.toLocaleString('en-IN')}</td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Give Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdvanceModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex justify-center items-center">
                <IndianRupee size={18} />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Give Advance Payment</h2>
                <p className="text-xs text-gray-500 mt-0.5">This amount will be deducted from their next salary</p>
              </div>
              <button onClick={() => setShowAdvanceModal(false)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Staff Member</label>
                <select className="input w-full" value={advanceForm.staffId}
                  onChange={e => setAdvanceForm(p => ({ ...p, staffId: e.target.value }))}>
                  <option value="">Select Staff…</option>
                  {staff.map(s => (
                    <option key={s.id || s._id} value={s.id || s._id}>{s.name} — {s.role.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" className="input w-full" placeholder="5000"
                  value={advanceForm.amount} onChange={e => setAdvanceForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Reason (Optional)</label>
                <input type="text" className="input w-full" placeholder="Medical emergency, festival, etc."
                  value={advanceForm.reason} onChange={e => setAdvanceForm(p => ({ ...p, reason: e.target.value }))} />
              </div>
              {advanceForm.staffId && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">This advance will be automatically deducted when payroll is calculated.</p>
                    <p className="mt-1">Current outstanding advances for this staff: ₹{
                      (staff.find(s => (s.id || s._id) === advanceForm.staffId)?.totalAdvances || 0).toLocaleString('en-IN')
                    }</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setShowAdvanceModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={handleGiveAdvance}
                disabled={advanceSaving || !advanceForm.staffId || !advanceForm.amount}
                className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-orange-600">
                {advanceSaving ? 'Recording...' : 'Give Advance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {slipData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSlipData(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-maroon" />
                <h2 className="font-bold text-gray-800 text-lg">Salary Slip</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={printSlip}
                  className="flex items-center gap-1 px-3 py-1.5 bg-maroon text-white rounded-lg text-xs font-semibold hover:bg-opacity-90">
                  <Printer size={13} /> Print
                </button>
                <button onClick={() => setSlipData(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Employee Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Name:</span> <span className="font-semibold">{slipData.staff.name}</span></div>
                  <div><span className="text-gray-500">Designation:</span> <span className="font-semibold">{slipData.staff.designation}</span></div>
                  <div><span className="text-gray-500">Month:</span> <span className="font-semibold">{slipData.salary.month}</span></div>
                  <div><span className="text-gray-500">Emp ID:</span> <span className="font-semibold font-mono text-xs">{String(slipData.staff.employeeId).slice(-8).toUpperCase()}</span></div>
                  {slipData.staff.bankDetails && (
                    <>
                      <div><span className="text-gray-500">Bank:</span> <span className="font-semibold">{slipData.staff.bankDetails.bankName}</span></div>
                      <div><span className="text-gray-500">A/C:</span> <span className="font-semibold">{slipData.staff.bankDetails.accountNumber}</span></div>
                    </>
                  )}
                </div>
              </div>

              {/* Earnings */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Earnings</h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr><td className="py-2 text-gray-600">Base Salary ({slipData.salary.salaryType})</td>
                      <td className="py-2 text-right font-semibold">₹{slipData.salary.baseSalary.toLocaleString('en-IN')}</td></tr>
                    <tr><td className="py-2 text-gray-600">Working Days</td>
                      <td className="py-2 text-right">{slipData.salary.totalWorkingDays}</td></tr>
                    <tr><td className="py-2 text-gray-600">Present Days</td>
                      <td className="py-2 text-right text-green-600 font-semibold">{slipData.salary.presentDays}{slipData.salary.halfDays > 0 ? ` (+${slipData.salary.halfDays} half)` : ''}</td></tr>
                    <tr><td className="py-2 text-gray-600">Absent Days</td>
                      <td className="py-2 text-right text-red-500">{slipData.salary.absentDays}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Deductions</h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr><td className="py-2 text-gray-600">Absence Deduction</td>
                      <td className="py-2 text-right text-red-500 font-semibold">-₹{slipData.salary.deductions.toLocaleString('en-IN')}</td></tr>
                    <tr><td className="py-2 text-gray-600">Advance Deductions</td>
                      <td className="py-2 text-right text-orange-500 font-semibold">-₹{slipData.salary.advances.toLocaleString('en-IN')}</td></tr>
                    {slipData.advanceDeductions?.map((a: any, i: number) => (
                      <tr key={i} className="text-xs">
                        <td className="py-1.5 pl-6 text-gray-400">↳ {new Date(a.date).toLocaleDateString('en-IN')} — {a.reason || 'Advance'}</td>
                        <td className="py-1.5 text-right text-gray-400">₹{a.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Net Payable */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">NET PAYABLE</span>
                  <span className="text-2xl font-black text-green-700">₹{slipData.salary.netPayable.toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {slipData.salary.isPaid ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-semibold bg-green-100 px-2 py-0.5 rounded-full">
                      <CheckCircle size={11} /> Paid on {new Date(slipData.salary.paidDate).toLocaleDateString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">Payment Pending</span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-gray-400 text-center">This is a computer-generated salary slip and does not require a signature.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
