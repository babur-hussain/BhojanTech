import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingBag, Users,
  Table, Activity, RefreshCw, Share2, FileText, MonitorPlay, FileBarChart, PlusCircle, ListOrdered, Receipt, Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { inrFormat, pctFormat, shortInr } from '../utils/format';
import InsightsWidget from '../components/AI/InsightsWidget';
import { useBranchStore } from '../store/branchStore';
import { Building2, Award } from 'lucide-react';

import { api } from '../utils/api';

const MODE_COLORS: Record<string, string> = { CASH: '#16a34a', CARD: '#3b82f6', UPI: '#8b5cf6', SPLIT: '#f59e0b' };
const PIE_COLORS = ['#800000', '#FF9933', '#FFD700', '#4f46e5', '#10b981'];

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
  const [kpi, setKpi] = useState<any>(null);
  const [error, setError] = useState(false);
  const [trend, setTrend] = useState<any[]>([]);
  const [hourly, setHourly] = useState<any[]>([]);
  const [pie, setPie] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState(0);

  const fetchData = async () => {
    try {
      setError(false);
      const qs = selectedBranchId !== 'all' ? `?branchId=${selectedBranchId}` : '';

      const [dashRes, trendRes, hourlyRes, catRes, monthRes] = await Promise.all([
        api.get(`/analytics/dashboard${qs}`),
        api.get(`/analytics/revenue-trend${qs}`),
        api.get(`/analytics/hourly-volume${qs}`),
        api.get(`/analytics/revenue-by-category${qs}`),
        api.get(`/analytics/monthly-comparison${qs}`)
      ]);

      setKpi(dashRes.data);
      setTrend(trendRes.data.map((d: any) => ({ ...d, date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })));

      // Map hours 0-23 to readable format
      setHourly(hourlyRes.data.map((d: any) => {
        const ampm = d.hour >= 12 ? 'PM' : 'AM';
        const h = d.hour % 12 || 12;
        return { ...d, hour: `${h}${ampm}` };
      }));

      // Map category data
      setPie(catRes.data.map((d: any, idx: number) => ({
        name: d._id || 'General',
        value: d.total,
        color: PIE_COLORS[idx % PIE_COLORS.length]
      })));

      setMonthly(monthRes.data.map((d: any) => {
        const [y, m] = d.month.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        return { ...d, month: date.toLocaleDateString('en-US', { month: 'short' }) };
      }));

      setLastUpdate(new Date());

      // Live open orders & pending bookings for badges/panel
      try {
        const [ordersRes, bookingsRes] = await Promise.all([
          api.get(`/orders/active`),
          api.get(`/bookings?date=${new Date().toISOString().split('T')[0]}`)
        ]);
        const allOrders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        setLiveOrders(allOrders.filter((o: any) => o.status === 'OPEN'));
        const allBookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
        setPendingBookings(allBookings.filter((b: any) => ['PENDING', 'CONFIRMED', 'READY'].includes(b.status)).length);
      } catch (e) {
        console.warn('Live orders fetch failed:', e);
      }
    } catch (e) {
      console.error('Failed to fetch analytics', e);
      setError(true);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [selectedBranchId]);

  if (!kpi) {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
          <p className="text-lg font-semibold">Failed to load analytics</p>
          <p className="text-sm text-gray-400">The server may be starting up. Please try again.</p>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-maroon text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-colors"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      );
    }
    return <PageLoader />;
  }

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
          <button onClick={fetchData}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link to="/live-orders" className="relative flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-saffron transition-all group">
          {liveOrders.length > 0 && (
            <span className="absolute top-2 right-2 min-w-[22px] h-[22px] flex items-center justify-center bg-red-500 text-white text-[11px] font-black rounded-full px-1 animate-pulse">
              {liveOrders.length}
            </span>
          )}
          <div className="p-3 bg-red-50 text-maroon rounded-full mb-3 group-hover:scale-110 transition-transform">
            <ListOrdered size={24} />
          </div>
          <span className="text-sm font-bold text-gray-700">View Orders</span>
        </Link>
        <Link to="/bookings" className="relative flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-saffron transition-all group">
          {pendingBookings > 0 && (
            <span className="absolute top-2 right-2 min-w-[22px] h-[22px] flex items-center justify-center bg-saffron text-white text-[11px] font-black rounded-full px-1">
              {pendingBookings}
            </span>
          )}
          <div className="p-3 bg-pink-50 text-pink-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
          <span className="text-sm font-bold text-gray-700">Bookings</span>
        </Link>
        <Link to="/pos" className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-saffron transition-all group">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
            <Receipt size={24} />
          </div>
          <span className="text-sm font-bold text-gray-700">Create Invoice</span>
        </Link>
        <Link to="/tables" className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-saffron transition-all group">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
            <Table size={24} />
          </div>
          <span className="text-sm font-bold text-gray-700">Tables</span>
        </Link>
        <Link to="/reports" className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-saffron transition-all group">
          <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
            <FileBarChart size={24} />
          </div>
          <span className="text-sm font-bold text-gray-700">Reports</span>
        </Link>
      </div>

      {/* Live Table Orders Panel — always visible */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex justify-between items-center" style={{ background: liveOrders.length > 0 ? '#fef2f2' : '#f9fafb' }}>
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${liveOrders.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
            <h2 className={`font-bold ${liveOrders.length > 0 ? 'text-red-700' : 'text-gray-600'}`}>Live Table Orders</h2>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${liveOrders.length > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {liveOrders.length} OPEN
            </span>
          </div>
          <Link to="/live-orders" className="text-xs font-semibold text-maroon hover:underline">View All →</Link>
        </div>
        <div className="divide-y overflow-y-auto max-h-72">
          {liveOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <Activity size={32} className="text-gray-200" />
              <p className="text-sm font-medium">No open table orders right now</p>
              <p className="text-xs">Orders will appear here as soon as a table is occupied</p>
            </div>
          ) : liveOrders.map((order: any, i: number) => (
            <Link to={`/bill/${order._id}`} key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors block">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-maroon text-white rounded-xl flex items-center justify-center font-black text-sm shadow">
                    {order.tableNumber || 'TK'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {order.isOnlineOrder ? '🛵 Delivery' : `Table ${order.tableNumber}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.waiterName || 'Staff'} · {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} · {timeAgo(order.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-800 text-sm">{inrFormat(order.totalAmountINR || 0)}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">OPEN</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={selectedBranchId === 'all' ? "Consolidated Revenue" : "Revenue"}
          value={inrFormat(kpi.todayRevenue)}
          sub={`${pctFormat(kpi.vsYesterday)} vs yesterday`}
          subColor={kpi.vsYesterday >= 0 ? 'text-green-600' : 'text-red-500'}
          icon={<TrendingUp size={22} className="text-saffron" />}
          accent="border-saffron"
        />
        <KPICard
          title="Orders Today"
          value={String(kpi.todayOrders)}
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



      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-4">7-Day Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
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
              <Pie data={pie} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {pie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => inrFormat(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1">
            {pie.map(p => (
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
            <BarChart data={hourly} barSize={18}>
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
            <BarChart data={monthly} barSize={28}>
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
          {kpi.recentOrders.map((order: any, i: number) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="min-w-[2rem] px-2 h-8 bg-cream rounded-lg flex items-center justify-center text-maroon font-bold text-sm">
                  {order.tableNumber || 'TK'}
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
