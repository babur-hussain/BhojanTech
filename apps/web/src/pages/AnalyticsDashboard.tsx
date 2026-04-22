import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingBag, Users,
  Table, Activity, RefreshCw, Share2,
} from 'lucide-react';
import { inrFormat, pctFormat, shortInr } from '../utils/format';
import InsightsWidget from '../components/AI/InsightsWidget';
import { useBranchStore } from '../store/branchStore';
import { Building2, Award } from 'lucide-react';

// ─── Mock Data (replace with fetch('/api/analytics/...')) ────────────────────

const MOCK_KPI = {
  todayRevenue: 84500, todayOrders: 47, avgOrderValue: 1798,
  vsYesterday: 12.4, vsLastWeek: -3.2,
  occupancyRate: 68, occupiedTables: 11, totalTables: 16, activeOrders: 8,
  recentOrders: [
    { invoiceNumber: 'INV-20260421-0047', tableNumber: '12', waiterName: 'Rahul', grandTotal: 2380, paymentMode: 'UPI', createdAt: new Date() },
    { invoiceNumber: 'INV-20260421-0046', tableNumber: '7', waiterName: 'Amit', grandTotal: 1140, paymentMode: 'CASH', createdAt: new Date(Date.now() - 5 * 60000) },
    { invoiceNumber: 'INV-20260421-0045', tableNumber: '3', waiterName: 'Rahul', grandTotal: 3200, paymentMode: 'CARD', createdAt: new Date(Date.now() - 12 * 60000) },
  ],
};

const MOCK_TREND = [
  { date: 'Apr 15', revenue: 72000, orders: 38 },
  { date: 'Apr 16', revenue: 88000, orders: 51 },
  { date: 'Apr 17', revenue: 65000, orders: 34 },
  { date: 'Apr 18', revenue: 94000, orders: 56 },
  { date: 'Apr 19', revenue: 78000, orders: 42 },
  { date: 'Apr 20', revenue: 75000, orders: 40 },
  { date: 'Apr 21', revenue: 84500, orders: 47 },
];

const MOCK_HOURLY = [
  { hour: '9AM', orders: 3, revenue: 4200 }, { hour: '10AM', orders: 5, revenue: 7100 },
  { hour: '11AM', orders: 8, revenue: 12500 }, { hour: '12PM', orders: 14, revenue: 23000 },
  { hour: '1PM', orders: 18, revenue: 31000 }, { hour: '2PM', orders: 12, revenue: 19500 },
  { hour: '3PM', orders: 6, revenue: 9200 }, { hour: '4PM', orders: 4, revenue: 6100 },
  { hour: '5PM', orders: 7, revenue: 11000 }, { hour: '6PM', orders: 11, revenue: 18200 },
  { hour: '7PM', orders: 16, revenue: 27500 }, { hour: '8PM', orders: 15, revenue: 24800 },
  { hour: '9PM', orders: 9, revenue: 15200 }, { hour: '10PM', orders: 5, revenue: 8400 },
];

const MOCK_PIE = [
  { name: 'Mains', value: 38000, color: '#800000' },
  { name: 'Starters', value: 18000, color: '#FF9933' },
  { name: 'Drinks', value: 12000, color: '#FFD700' },
  { name: 'Desserts', value: 6500, color: '#4f46e5' },
  { name: 'Breads', value: 10000, color: '#10b981' },
];

const MOCK_MONTHLY = [
  { month: 'Nov', revenue: 182000, orders: 310 },
  { month: 'Dec', revenue: 224000, orders: 378 },
  { month: 'Jan', revenue: 198000, orders: 340 },
  { month: 'Feb', revenue: 215000, orders: 362 },
  { month: 'Mar', revenue: 241000, orders: 401 },
  { month: 'Apr', revenue: 84500, orders: 47 },
].map(m => m); // typing fix below

const MONTHLY_DATA = [
  { month: 'Nov', revenue: 182000 },
  { month: 'Dec', revenue: 224000 },
  { month: 'Jan', revenue: 198000 },
  { month: 'Feb', revenue: 215000 },
  { month: 'Mar', revenue: 241000 },
  { month: 'Apr', revenue: 84500 },
];

const BRANCH_COMPARISON = [
  { name: 'Main Branch - CP', revenue: 47000, orders: 25, occupancy: 75 },
  { name: 'South Ex Branch', revenue: 37500, orders: 22, occupancy: 60 },
];

const MODE_COLORS: Record<string, string> = { CASH: '#16a34a', CARD: '#3b82f6', UPI: '#8b5cf6', SPLIT: '#f59e0b' };

function timeAgo(d: Date) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl px-3 py-2">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'revenue' ? inrFormat(p.value) : `${p.value} orders`}
        </p>
      ))}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const { selectedBranchId } = useBranchStore();
  const [kpi] = useState(MOCK_KPI);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulated Socket.io updates (real: useSocket hook + 'analytics_update' event)
  useEffect(() => {
    const t = setInterval(() => setLastUpdate(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const shareWhatsApp = () => {
    const msg = `📊 *Saffron Palace - Today's Summary*\n\n` +
      `💰 Revenue: ${inrFormat(kpi.todayRevenue)}\n` +
      `🧾 Orders: ${kpi.todayOrders}\n` +
      `📈 vs Yesterday: ${pctFormat(kpi.vsYesterday)}\n` +
      `🪑 Occupancy: ${kpi.occupancyRate}%\n` +
      `⏱ Active Orders: ${kpi.activeOrders}\n\n` +
      `_Generated by Restaurant Management System_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-maroon">Live Dashboard</h1>
          <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
            <Activity size={12} className="text-green-500" /> Live · Updated {timeAgo(lastUpdate)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLastUpdate(new Date())}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={shareWhatsApp}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>

      {/* AI Insights Widget */}
      <InsightsWidget />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={selectedBranchId === 'all' ? "Consolidated Revenue" : "Today's Revenue"}
          value={inrFormat(selectedBranchId === 'all' ? kpi.todayRevenue + 37500 : kpi.todayRevenue)}
          sub={`${pctFormat(kpi.vsYesterday)} vs yesterday`}
          subColor={kpi.vsYesterday >= 0 ? 'text-green-600' : 'text-red-500'}
          icon={<TrendingUp size={22} className="text-saffron" />}
          accent="border-saffron"
        />
        <KPICard
          title="Orders Today"
          value={String(selectedBranchId === 'all' ? kpi.todayOrders + 22 : kpi.todayOrders)}
          sub={`Avg ${inrFormat(kpi.avgOrderValue)} / order`}
          icon={<ShoppingBag size={22} className="text-blue-500" />}
          accent="border-blue-400"
        />
        <KPICard
          title="Table Occupancy"
          value={`${kpi.occupancyRate}%`}
          sub={`${kpi.occupiedTables} of ${kpi.totalTables} tables`}
          icon={<Table size={22} className="text-purple-500" />}
          accent="border-purple-400"
        />
        <KPICard
          title="Active Orders"
          value={String(kpi.activeOrders)}
          sub={`3 Online · ${kpi.activeOrders - 3} Dine-In`}
          subColor="text-brand-600 font-bold"
          icon={<Activity size={22} className="text-orange-500" />}
          accent="border-orange-400"
        />
      </div>

      {/* Cross-Branch Leaderboard (Only for Consolidated View) */}
      {selectedBranchId === 'all' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-brand-500" size={20} />
            <h2 className="font-bold text-gray-700">Cross-Branch Leaderboard</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={BRANCH_COMPARISON} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tickFormatter={v => shortInr(v)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => inrFormat(v)} />
                <Bar dataKey="revenue" fill="#800000" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-4 flex flex-col justify-center">
              {BRANCH_COMPARISON.map((branch, idx) => (
                <div key={branch.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-gray-300">#{idx + 1}</span>
                    <span className="font-bold text-gray-800">{branch.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-brand-600">{inrFormat(branch.revenue)}</span>
                    <span className="text-xs text-gray-500">{branch.orders} Orders · {branch.occupancy}% Occupancy</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-4">7-Day Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MOCK_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => shortInr(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<RevenueTooltip />} />
              <Line type="monotone" dataKey="revenue" stroke="#800000" strokeWidth={2.5}
                dot={{ r: 4, fill: '#800000' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Category Pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-2">Revenue by Category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={MOCK_PIE} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {MOCK_PIE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => inrFormat(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1">
            {MOCK_PIE.map(p => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-gray-600">{p.name}</span>
                </div>
                <span className="font-semibold text-gray-700">{inrFormat(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Hourly Volume */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-1">Hourly Order Volume</h2>
          <p className="text-xs text-gray-400 mb-4">Peak hours — useful for staffing decisions</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_HOURLY} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<RevenueTooltip />} />
              <Bar dataKey="orders" fill="#FF9933" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-4">6-Month Revenue</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_DATA} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => shortInr(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<RevenueTooltip />} />
              <Bar dataKey="revenue" fill="#800000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Orders Feed */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-700">Live Order Feed</h2>
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live
          </span>
        </div>
        <div className="divide-y">
          {kpi.recentOrders.map((order, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cream rounded-lg flex items-center justify-center text-maroon font-bold text-sm">
                  {order.tableNumber}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{order.invoiceNumber}</p>
                  <p className="text-xs text-gray-400">{order.waiterName} · {timeAgo(order.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold`}
                  style={{ backgroundColor: MODE_COLORS[order.paymentMode] + '22', color: MODE_COLORS[order.paymentMode] }}>
                  {order.paymentMode}
                </span>
                <span className="font-black text-gray-800">{inrFormat(order.grandTotal)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, sub, subColor = 'text-gray-400', icon, accent = 'border-gray-200' }: any) {
  return (
    <div className={`bg-white rounded-xl border-t-4 border border-gray-100 shadow-sm p-5 ${accent}`}>
      <div className="flex justify-between items-start mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className={`text-xs mt-1 font-medium ${subColor}`}>{sub}</p>
    </div>
  );
}
