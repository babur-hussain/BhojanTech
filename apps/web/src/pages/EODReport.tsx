import React, { useState } from 'react';
import { EODSummary } from '@restaurant/types';
import { TrendingUp, Banknote, CreditCard, Smartphone, Receipt, Tag, Download } from 'lucide-react';

const MOCK_EOD: EODSummary = {
  date: new Date().toISOString().slice(0, 10),
  restaurantId: 'r1',
  totalOrders: 47,
  totalRevenue: 84500,
  cashCollected: 32000,
  cardCollected: 28500,
  upiCollected: 24000,
  totalGSTCollected: 4023.81,
  cgstCollected: 2011.90,
  sgstCollected: 2011.91,
  totalDiscounts: 1200,
  invoices: [
    { invoiceNumber: 'INV-20260421-0001', grandTotal: 1140, mode: 'CASH' },
    { invoiceNumber: 'INV-20260421-0002', grandTotal: 2380, mode: 'UPI' },
    { invoiceNumber: 'INV-20260421-0003', grandTotal: 850,  mode: 'CARD' },
  ],
};

export default function EODReport() {
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [eod, setEOD]       = useState<EODSummary>(MOCK_EOD);
  const [loading, setLoading] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    // Real: const r = await fetch(`/api/billing/eod?date=${date}`); setEOD(await r.json());
    setTimeout(() => { setEOD({ ...MOCK_EOD, date }); setLoading(false); }, 500);
  };

  const pct = (v: number) => eod.totalRevenue ? ((v / eod.totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-maroon">End-of-Day Report</h1>
          <p className="text-gray-500 text-sm">Daily sales, GST, and payment breakdown</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron focus:border-saffron"
          />
          <button
            onClick={fetch_}
            disabled={loading}
            className="px-4 py-2 bg-maroon text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
          <button className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<TrendingUp size={22} className="text-saffron" />}
          label="Total Revenue"
          value={`₹${eod.totalRevenue.toLocaleString('en-IN')}`}
          sub={`${eod.totalOrders} orders`}
          bg="bg-orange-50 border-saffron"
        />
        <KPICard
          icon={<Banknote size={22} className="text-green-600" />}
          label="Cash"
          value={`₹${eod.cashCollected.toLocaleString('en-IN')}`}
          sub={`${pct(eod.cashCollected)}%`}
          bg="bg-green-50 border-green-400"
        />
        <KPICard
          icon={<CreditCard size={22} className="text-blue-600" />}
          label="Card"
          value={`₹${eod.cardCollected.toLocaleString('en-IN')}`}
          sub={`${pct(eod.cardCollected)}%`}
          bg="bg-blue-50 border-blue-400"
        />
        <KPICard
          icon={<Smartphone size={22} className="text-purple-600" />}
          label="UPI"
          value={`₹${eod.upiCollected.toLocaleString('en-IN')}`}
          sub={`${pct(eod.upiCollected)}%`}
          bg="bg-purple-50 border-purple-400"
        />
      </div>

      {/* Revenue Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-bold text-gray-700 mb-4">Payment Breakdown</h2>
        <div className="h-8 rounded-full overflow-hidden flex">
          <div className="bg-green-500 transition-all" style={{ width: `${pct(eod.cashCollected)}%` }} title={`Cash ${pct(eod.cashCollected)}%`} />
          <div className="bg-blue-500 transition-all"  style={{ width: `${pct(eod.cardCollected)}%` }} title={`Card ${pct(eod.cardCollected)}%`} />
          <div className="bg-purple-500 transition-all" style={{ width: `${pct(eod.upiCollected)}%` }} title={`UPI ${pct(eod.upiCollected)}%`} />
        </div>
        <div className="flex gap-6 mt-3 text-sm">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Cash {pct(eod.cashCollected)}%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>Card {pct(eod.cardCollected)}%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500" /><span>UPI {pct(eod.upiCollected)}%</span></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* GST Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold text-gray-700">
            GST Collected (for Accounting)
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Total GST</span>
              <span className="font-bold text-xl text-maroon">₹{eod.totalGSTCollected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-600 font-medium">CGST (2.5% / 6% / 9%)</span>
              <span className="font-semibold">₹{eod.cgstCollected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-600 font-medium">SGST (2.5% / 6% / 9%)</span>
              <span className="font-semibold">₹{eod.sgstCollected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="flex items-center gap-1 text-gray-500"><Tag size={14} /> Discounts given</span>
              <span className="font-semibold text-orange-600">₹{eod.totalDiscounts.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold text-gray-700 flex justify-between items-center">
            <span>Today's Invoices</span>
            <span className="bg-maroon text-white text-xs px-2 py-0.5 rounded-full">{eod.totalOrders}</span>
          </div>
          <div className="overflow-y-auto max-h-64 divide-y divide-gray-50">
            {eod.invoices.map((inv, i) => (
              <div key={i} className="px-4 py-2.5 flex justify-between items-center hover:bg-gray-50 text-sm">
                <div className="flex items-center gap-2">
                  <Receipt size={14} className="text-gray-400" />
                  <span className="font-mono text-xs text-gray-500">{inv.invoiceNumber}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium
                    ${inv.mode === 'CASH' ? 'bg-green-100 text-green-700' : ''}
                    ${inv.mode === 'CARD' ? 'bg-blue-100 text-blue-700' : ''}
                    ${inv.mode === 'UPI'  ? 'bg-purple-100 text-purple-700' : ''}
                    ${inv.mode === 'SPLIT'? 'bg-orange-100 text-orange-700' : ''}
                  `}>{inv.mode}</span>
                  <span className="font-semibold">₹{inv.grandTotal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, sub, bg }: { icon: React.ReactNode; label: string; value: string; sub: string; bg: string }) {
  return (
    <div className={`rounded-xl border-2 p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm font-medium text-gray-600">{label}</span></div>
      <div className="text-2xl font-black text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}
