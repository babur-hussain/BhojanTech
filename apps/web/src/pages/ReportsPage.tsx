import React, { useState, useEffect } from 'react';
import { Download, Filter, Share2, ChevronDown, Activity } from 'lucide-react';
import { inrFormat } from '../utils/format';
import { api } from '../utils/api';
import PageLoader from '../components/PageLoader';

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#16a34a', CARD: '#3b82f6', UPI: '#8b5cf6', SPLIT: '#f59e0b',
};

type ReportTab = 'sales' | 'gst';

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('sales');

  // Sales State
  const [fromDate, setFrom] = useState(new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [toDate, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [salesData, setSalesData] = useState<any>(null);

  // GST State
  const [gstMonth, setGstMonth] = useState(new Date().toISOString().slice(0, 7));
  const [gstData, setGstData] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const TABS: { key: ReportTab; label: string }[] = [
    { key: 'sales', label: 'Sales Report' },
    { key: 'gst', label: 'GST Report' },
  ];

  const fetchSales = async () => {
    try {
      setLoading(true); setError(false);
      const res = await api.get(`/analytics/sales-report?from=${fromDate}&to=${toDate}`);
      setSalesData(res.data);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchGST = async () => {
    try {
      setLoading(true); setError(false);
      const res = await api.get(`/analytics/gst-report?month=${gstMonth}`);
      setGstData(res.data);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'sales') fetchSales();
    if (tab === 'gst') fetchGST();
  }, [tab, gstMonth]);

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

      {loading && !salesData && !gstData ? (
        <PageLoader />
      ) : error ? (
        <div className="p-8 text-center text-red-500">Failed to load report data. Please try again.</div>
      ) : (
        <>
          {/* ── Sales Report ── */}
          {tab === 'sales' && salesData && (
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
                <button onClick={fetchSales} className="px-4 py-1.5 bg-maroon text-white rounded-lg text-sm font-semibold">Apply</button>
                <a href={`/api/analytics/sales-report?from=${fromDate}&to=${toDate}&format=excel`}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-white">
                  <Download size={14} /> Export Excel
                </a>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', val: inrFormat(salesData.totalRevenue) },
                  { label: 'Total Orders', val: salesData.totalOrders },
                  { label: 'Avg Bill Value', val: inrFormat(salesData.avgBillValue) },
                  { label: 'Total Discounts', val: inrFormat(0) }, // Add discounts to API if needed later
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
                {Object.entries(salesData.paymentModeSplit).filter(([_, amount]) => Number(amount) > 0).length === 0 ? (
                  <p className="text-gray-400 text-sm">No payment data found for this period.</p>
                ) : (
                  Object.entries(salesData.paymentModeSplit)
                    .filter(([_, amount]) => Number(amount) > 0)
                    .map(([mode, amount]) => {
                      const numAmount = Number(amount);
                      const pct = salesData.totalRevenue > 0 ? (numAmount / salesData.totalRevenue * 100).toFixed(1) : 0;
                      return (
                        <div key={mode} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-semibold" style={{ color: PAYMENT_COLORS[mode] || '#64748b' }}>{mode}</span>
                            <span className="text-gray-600">{inrFormat(numAmount)} ({pct}%)</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: PAYMENT_COLORS[mode] || '#64748b' }} />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Top / Bottom Items */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-green-50 px-4 py-3 border-b font-bold text-green-800">🏆 Top 10 Selling Items</div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-500 bg-gray-50 border-b">
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                    </tr></thead>
                    <tbody className="divide-y">
                      {salesData.top10Items.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">No items sold</td></tr>
                      ) : (
                        salesData.top10Items.map((i: any) => (
                          <tr key={i.name} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-700">{i.name}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{i.qty}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{inrFormat(i.revenue)}</td>
                          </tr>
                        ))
                      )}
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
                      {salesData.bottom10Items.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">No items sold</td></tr>
                      ) : (
                        salesData.bottom10Items.map((i: any) => (
                          <tr key={i.name} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-700">{i.name}</td>
                            <td className="px-4 py-2.5 text-right text-red-500">{i.qty}</td>
                            <td className="px-4 py-2.5 text-right text-red-500">{inrFormat(i.revenue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── GST Report ── */}
          {tab === 'gst' && gstData && (
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
                  { label: 'Total Base Revenue', val: inrFormat(gstData.totalRevenue - gstData.totalGST), sub: 'Before GST', color: 'text-gray-700' },
                  { label: 'Total CGST', val: inrFormat(gstData.totalCGST), sub: 'Central Tax', color: 'text-blue-700' },
                  { label: 'Total SGST', val: inrFormat(gstData.totalSGST), sub: 'State Tax', color: 'text-purple-700' },
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
                    <th className="px-4 py-3 text-right">Taxable Value</th>
                    <th className="px-4 py-3 text-right">CGST</th>
                    <th className="px-4 py-3 text-right">SGST</th>
                    <th className="px-4 py-3 text-right">Total GST</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {gstData.slabBreakup.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-400">No GST billed this month</td></tr>
                    ) : (
                      gstData.slabBreakup.map((g: any) => (
                        <tr key={g.slab} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold">@{g.slab}%</td>
                          <td className="px-4 py-3 text-right">{inrFormat(g.taxable)}</td>
                          <td className="px-4 py-3 text-right text-blue-600">{inrFormat(g.cgst)}</td>
                          <td className="px-4 py-3 text-right text-purple-600">{inrFormat(g.sgst)}</td>
                          <td className="px-4 py-3 text-right font-bold">{inrFormat(g.cgst + g.sgst)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {gstData.slabBreakup.length > 0 && (
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td className="px-4 py-3 font-bold">Total</td>
                        <td className="px-4 py-3 text-right font-bold">{inrFormat(gstData.slabBreakup.reduce((s: number, g: any) => s + g.taxable, 0))}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{inrFormat(gstData.totalCGST)}</td>
                        <td className="px-4 py-3 text-right font-bold text-purple-700">{inrFormat(gstData.totalSGST)}</td>
                        <td className="px-4 py-3 text-right font-black text-maroon">{inrFormat(gstData.totalGST)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
