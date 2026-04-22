import React, { useState } from 'react';
import { Download, Filter, Share2, ChevronDown } from 'lucide-react';
import { inrFormat } from '../utils/format';

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#16a34a', CARD: '#3b82f6', UPI: '#8b5cf6', SPLIT: '#f59e0b',
};

const TOP_ITEMS = [
  { name: 'Butter Chicken (Full)', qty: 312, revenue: 187200 },
  { name: 'Paneer Tikka (Half)', qty: 278, revenue: 83400 },
  { name: 'Dal Makhani', qty: 245, revenue: 61250 },
  { name: 'Biryani (Full)', qty: 198, revenue: 138600 },
  { name: 'Naan', qty: 542, revenue: 48780 },
];

const BOTTOM_ITEMS = [
  { name: 'Fish Curry', qty: 4, revenue: 2000 },
  { name: 'Prawn Masala', qty: 6, revenue: 3600 },
  { name: 'Mushroom Soup', qty: 8, revenue: 2400 },
];

type ReportTab = 'sales' | 'gst' | 'inventory' | 'staff' | 'table' | 'payouts';

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('sales');
  const [fromDate, setFrom] = useState(new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [toDate, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [gstMonth, setGstMonth] = useState(new Date().toISOString().slice(0, 7));

  const TABS: { key: ReportTab; label: string }[] = [
    { key: 'sales', label: 'Sales Report' },
    { key: 'gst', label: 'GST Report' },
    { key: 'inventory', label: 'Purchase/Wastage' },
    { key: 'staff', label: 'Staff Performance' },
    { key: 'table', label: 'Table Analytics' },
    { key: 'payouts', label: 'Platform Payouts' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-maroon">Reports</h1>
      </div>

      {/* Tab Nav */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-maroon text-maroon' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Sales Report ── */}
      {tab === 'sales' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-center bg-gray-50 rounded-xl p-4 border">
            <div className="flex items-center gap-2 text-sm">
              <Filter size={14} className="text-gray-400" />
              <span className="text-gray-600 font-medium">Date Range:</span>
            </div>
            <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm" />
            <span className="text-gray-400">to</span>
            <input type="date" value={toDate} onChange={e => setTo(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm" />
            <button className="px-4 py-1.5 bg-maroon text-white rounded-lg text-sm font-semibold">Apply</button>
            <a href={`/api/analytics/sales-report?from=${fromDate}&to=${toDate}&format=excel`}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-white">
              <Download size={14} /> Export Excel
            </a>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', val: inrFormat(84500) },
              { label: 'Total Orders', val: '47' },
              { label: 'Avg Bill Value', val: inrFormat(1798) },
              { label: 'Total Discounts', val: inrFormat(1200) },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className="text-xl font-black text-gray-800">{c.val}</p>
              </div>
            ))}
          </div>

          {/* Payment Mode Split */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-3">Payment Mode Split</h3>
            {[
              { mode: 'CASH', amount: 32000, pct: 37.9 },
              { mode: 'UPI', amount: 28500, pct: 33.7 },
              { mode: 'CARD', amount: 24000, pct: 28.4 },
            ].map(pm => (
              <div key={pm.mode} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold" style={{ color: PAYMENT_COLORS[pm.mode] }}>{pm.mode}</span>
                  <span className="text-gray-600">{inrFormat(pm.amount)} ({pm.pct}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pm.pct}%`, backgroundColor: PAYMENT_COLORS[pm.mode] }} />
                </div>
              </div>
            ))}
          </div>

          {/* Top / Bottom Items */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-green-50 px-4 py-3 border-b font-bold text-green-800">🏆 Top 5 Selling Items</div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                </tr></thead>
                <tbody className="divide-y">
                  {TOP_ITEMS.map(i => (
                    <tr key={i.name} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{i.name}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{i.qty}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{inrFormat(i.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b font-bold text-red-700">⚠️ Slow-Moving Items</div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                </tr></thead>
                <tbody className="divide-y">
                  {BOTTOM_ITEMS.map(i => (
                    <tr key={i.name} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{i.name}</td>
                      <td className="px-4 py-2.5 text-right text-red-500">{i.qty}</td>
                      <td className="px-4 py-2.5 text-right text-red-500">{inrFormat(i.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-red-50 border-t">
                <p className="text-xs text-red-600">💡 Consider removing these from the menu to reduce waste.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GST Report ── */}
      {tab === 'gst' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-center bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div>
              <p className="text-sm font-bold text-amber-800">🧾 GSTR-1 Ready Report</p>
              <p className="text-xs text-amber-600">This format can be filed directly on the GST portal or handed to your CA.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input type="month" value={gstMonth} onChange={e => setGstMonth(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm" />
              <a href={`/api/analytics/gst-report/excel?month=${gstMonth}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">
                <Download size={14} /> Export GSTR-1 Excel
              </a>
            </div>
          </div>

          {/* GST Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Taxable Value', val: inrFormat(78055), sub: 'Before GST', color: 'text-gray-700' },
              { label: 'Total CGST (2.5%/6%/9%)', val: inrFormat(3202), sub: 'Central Tax', color: 'text-blue-700' },
              { label: 'Total SGST (2.5%/6%/9%)', val: inrFormat(3202), sub: 'State Tax', color: 'text-purple-700' },
            ].map(c => (
              <div key={c.label} className="bg-white border rounded-xl p-5 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className={`text-2xl font-black ${c.color}`}>{c.val}</p>
                <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Slab Breakup */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b font-bold text-gray-700">GST Slab-wise Breakup</div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 bg-gray-50 border-b uppercase">
                <th className="px-4 py-3 text-left">GST Slab</th>
                <th className="px-4 py-3 text-left">HSN/SAC</th>
                <th className="px-4 py-3 text-right">Taxable Value</th>
                <th className="px-4 py-3 text-right">CGST</th>
                <th className="px-4 py-3 text-right">SGST</th>
                <th className="px-4 py-3 text-right">Total GST</th>
              </tr></thead>
              <tbody className="divide-y">
                {[
                  { slab: '5%  (CGST 2.5% + SGST 2.5%)', taxable: 57143, cgst: 1429, sgst: 1429 },
                  { slab: '12% (CGST 6% + SGST 6%)', taxable: 16786, cgst: 1007, sgst: 1007 },
                  { slab: '18% (CGST 9% + SGST 9%)', taxable: 4126, cgst: 372, sgst: 372 },
                ].map(g => (
                  <tr key={g.slab} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">@{g.slab}</td>
                    <td className="px-4 py-3 text-gray-500">9963</td>
                    <td className="px-4 py-3 text-right">{inrFormat(g.taxable)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{inrFormat(g.cgst)}</td>
                    <td className="px-4 py-3 text-right text-purple-600">{inrFormat(g.sgst)}</td>
                    <td className="px-4 py-3 text-right font-bold">{inrFormat(g.cgst + g.sgst)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-bold">Total</td>
                  <td className="px-4 py-3 text-right font-bold">{inrFormat(78055)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{inrFormat(2808)}</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-700">{inrFormat(2808)}</td>
                  <td className="px-4 py-3 text-right font-black text-maroon">{inrFormat(5616)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Inventory Report ── */}
      {tab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: 'Total Purchases This Month', val: inrFormat(42000), color: 'text-blue-700' },
              { label: 'Total Wastage Cost', val: inrFormat(3200), color: 'text-red-600' },
              { label: 'Est. Food Cost %', val: '28.4%', color: 'text-orange-600' },
            ].map(c => (
              <div key={c.label} className="bg-white border rounded-xl p-5 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className={`text-2xl font-black ${c.color}`}>{c.val}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Detailed inventory reports are available in the Inventory module →</p>
            <a href="/inventory" className="mt-2 inline-block text-maroon text-sm font-semibold hover:underline">Go to Inventory Reports</a>
          </div>
        </div>
      )}

      {/* ── Staff Performance ── */}
      {tab === 'staff' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
              <tr>
                {['Waiter', 'Orders', 'Revenue', 'Avg Bill', 'Attendance'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { name: 'Rahul Sharma', orders: 142, revenue: 84200, avg: 593, att: '24/26' },
                { name: 'Amit Kumar', orders: 108, revenue: 61500, avg: 569, att: '22/26' },
                { name: 'Sunita Devi', orders: 96, revenue: 58000, avg: 604, att: '26/26' },
              ].map(s => (
                <tr key={s.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{s.name}</td>
                  <td className="px-4 py-3">{s.orders}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">{inrFormat(s.revenue)}</td>
                  <td className="px-4 py-3">{inrFormat(s.avg)}</td>
                  <td className="px-4 py-3">{s.att}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Table Analytics ── */}
      {tab === 'table' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b font-bold text-gray-700">Table Performance</div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 bg-gray-50 border-b">
                <th className="px-4 py-2 text-left">Table</th>
                <th className="px-4 py-2 text-right">Avg Turn Time</th>
                <th className="px-4 py-2 text-right">Orders</th>
                <th className="px-4 py-2 text-right">Revenue</th>
              </tr></thead>
              <tbody className="divide-y">
                {[
                  { no: '1', turn: '48 min', orders: 9, rev: 16200 },
                  { no: '7', turn: '62 min', orders: 11, rev: 22000 },
                  { no: '12', turn: '35 min', orders: 7, rev: 12600 },
                ].map(t => (
                  <tr key={t.no} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-bold text-maroon">Table {t.no}</td>
                    <td className="px-4 py-2.5 text-right">{t.turn}</td>
                    <td className="px-4 py-2.5 text-right">{t.orders}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{inrFormat(t.rev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-3">Peak Occupancy Hours</h3>
            {[{ h: '12–2PM', pct: 92 }, { h: '7–10PM', pct: 88 }, { h: '6–7PM', pct: 65 }].map(p => (
              <div key={p.h} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{p.h}</span>
                  <span className="text-maroon font-bold">{p.pct}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-maroon rounded-full" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Platform Payouts & Reconciliation ── */}
      {tab === 'payouts' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-center bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div>
              <p className="text-sm font-bold text-blue-800">📊 Integration Payout Reconciliation</p>
              <p className="text-xs text-blue-600">Track third-party deliveries, estimated commissions, and net payouts.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input type="month" value={gstMonth} onChange={e => setGstMonth(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm" />
              <a href={`/api/integrations/reconciliation/report/export?month=${gstMonth}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                <Download size={14} /> Export Reconciliation
              </a>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Platform</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Gross Revenue</th>
                  <th className="px-4 py-3 text-right">Est. Commission (20%)</th>
                  <th className="px-4 py-3 text-right text-blue-700 font-bold">Net Payout</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { platform: 'ZOMATO', orders: 145, grossRevenue: 45000, estimatedCommission: 9000, netPayout: 36000, status: 'Reconciled' },
                  { platform: 'SWIGGY', orders: 112, grossRevenue: 38000, estimatedCommission: 7600, netPayout: 30400, status: 'Reconciled' },
                  { platform: 'ONDC', orders: 45, grossRevenue: 15000, estimatedCommission: 750, netPayout: 14250, status: 'Processing' },
                ].map(p => (
                  <tr key={p.platform} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-800">{p.platform}</td>
                    <td className="px-4 py-3 text-right">{p.orders}</td>
                    <td className="px-4 py-3 text-right">{inrFormat(p.grossRevenue)}</td>
                    <td className="px-4 py-3 text-right text-red-600">-{inrFormat(p.estimatedCommission)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{inrFormat(p.netPayout)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                        ${p.status === 'Reconciled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr>
                  <td className="px-4 py-3 font-bold uppercase text-gray-600">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">302</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{inrFormat(98000)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">-{inrFormat(17350)}</td>
                  <td className="px-4 py-3 text-right font-black text-blue-700 text-base">{inrFormat(80650)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-2 border-b pb-2">Report Discrepancies</h3>
            <p className="text-sm text-gray-600 mb-4">If the actual payout received in your bank account differs from the expected Net Payout shown above, you can log a discrepancy issue with BhojanTech support and the respective platform partner.</p>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-semibold hover:bg-gray-50 text-gray-700 shadow-sm transition">
              Log Discrepancy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
