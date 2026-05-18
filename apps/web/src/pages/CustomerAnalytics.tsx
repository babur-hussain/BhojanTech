import React, { useState, useEffect, useCallback } from 'react';
import PageLoader from '../components/PageLoader';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, Crown, Star, TrendingUp, RefreshCw, Award,
  MessageSquare, Cake, BarChart2, IndianRupee, Heart,
  UserCheck, Repeat, ArrowRight, Phone,
} from 'lucide-react';
import { api } from '../utils/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtInr(n: number | undefined | null) {
  return '₹' + (n ?? 0).toLocaleString('en-IN');
}

const SEGMENT_META: Record<string, { color: string; bg: string; icon: React.ReactNode; desc: string }> = {
  VIP:       { color: '#7c3aed', bg: 'bg-purple-50', icon: <Crown size={18} className="text-purple-600" />,   desc: 'High-value loyal guests' },
  REGULAR:   { color: '#2563eb', bg: 'bg-blue-50',   icon: <Repeat size={18} className="text-blue-600" />,    desc: 'Consistent repeat visitors' },
  OCCASIONAL:{ color: '#0891b2', bg: 'bg-cyan-50',   icon: <Star size={18} className="text-cyan-600" />,      desc: 'Infrequent but returning' },
  NEW:       { color: '#16a34a', bg: 'bg-green-50',  icon: <UserCheck size={18} className="text-green-600" />, desc: 'Recently joined' },
  LAPSED:    { color: '#dc2626', bg: 'bg-red-50',    icon: <Heart size={18} className="text-red-500" />,      desc: 'Need re-engagement' },
};
const TIER_META: Record<string, { color: string; bg: string; text: string }> = {
  PLATINUM: { color: '#374151', bg: 'bg-gray-800',    text: 'text-white' },
  GOLD:     { color: '#d97706', bg: 'bg-yellow-100',  text: 'text-yellow-800' },
  SILVER:   { color: '#6b7280', bg: 'bg-gray-200',    text: 'text-gray-700' },
  BRONZE:   { color: '#b45309', bg: 'bg-orange-100',  text: 'text-orange-800' },
};
const PIE_COLORS = ['#7c3aed', '#2563eb', '#0891b2', '#16a34a', '#dc2626'];
const TIER_PIE_COLORS = ['#1f2937', '#d97706', '#9ca3af', '#b45309'];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, accent = 'border-gray-100', iconBg = 'bg-gray-50' }: any) {
  return (
    <div className={`bg-white rounded-2xl border ${accent} shadow-sm p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`${iconBg} p-2 rounded-xl`}>{icon}</div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Customer Row ─────────────────────────────────────────────────────────────
function CustomerRow({ rank, c, metric }: { rank: number; c: any; metric: 'spend' | 'visits' }) {
  const navigate = useNavigate();
  const tier = TIER_META[c.tier] || TIER_META.BRONZE;
  const seg = SEGMENT_META[c.segment] || SEGMENT_META.OCCASIONAL;
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors rounded-xl"
      onClick={() => navigate(`/customers/${c._id}`)}
    >
      <span className="text-lg font-black text-gray-200 w-7 text-center">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-900 truncate">{c.name}</p>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${tier.bg} ${tier.text} uppercase tracking-widest`}>{c.tier}</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: seg.color + '22', color: seg.color }}>{c.segment}</span>
        </div>
        <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{c.phone}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {metric === 'spend' ? (
          <>
            <p className="font-black text-gray-900">{fmtInr(c.totalSpend)}</p>
            <p className="text-xs text-gray-400">{c.totalVisits} visits</p>
          </>
        ) : (
          <>
            <p className="font-black text-gray-900">{c.totalVisits} visits</p>
            <p className="text-xs text-gray-400">{fmtInr(c.totalSpend)}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl shadow-2xl px-4 py-3">
      <p className="font-bold text-gray-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.dataKey === 'revenue' ? fmtInr(p.value) : `${p.value} ${p.dataKey === 'count' ? 'customers' : p.dataKey}`}
        </p>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerAnalytics() {
  const [data, setData] = useState<any>(null);
  const [topTab, setTopTab] = useState<'spend' | 'visits'>('spend');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/customers/analytics');
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!data) {
    return <PageLoader />;
  }

  const segmentPieData = Object.entries(data.segments as Record<string, number>)
    .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i] }))
    .filter(d => d.value > 0);

  const tierPieData = Object.entries(data.tiers as Record<string, number>)
    .map(([name, value], i) => ({ name, value, color: TIER_PIE_COLORS[i] }))
    .filter(d => d.value > 0);

  const visitFreqData = [
    { label: '1 Visit', count: data.visitBuckets.once },
    { label: '2–5', count: data.visitBuckets.twoToFive },
    { label: '6–10', count: data.visitBuckets.sixToTen },
    { label: '10+', count: data.visitBuckets.moreThanTen },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 size={24} className="text-purple-600" /> Customer Analytics
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">Insights across {data.totalCustomers} registered customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <a
            href="/campaigns"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            <MessageSquare size={14} /> New Campaign
          </a>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<Users size={20} className="text-purple-600" />} iconBg="bg-purple-50" accent="border-purple-100"
          label="Total Customers" value={(data.totalCustomers ?? 0).toLocaleString()} sub={`+${data.newThisMonth ?? 0} this month`} />
        <KPICard icon={<IndianRupee size={20} className="text-emerald-600" />} iconBg="bg-emerald-50" accent="border-emerald-100"
          label="Total CRM Revenue" value={fmtInr(data.totalSpend)} sub={`Avg ${fmtInr(data.avgSpend)} / customer`} />
        <KPICard icon={<TrendingUp size={20} className="text-blue-600" />} iconBg="bg-blue-50" accent="border-blue-100"
          label="Avg Visits / Customer" value={`${data.avgVisits ?? 0}×`} sub={`${data.retentionRate ?? 0}% retention rate`} />
        <KPICard icon={<Award size={20} className="text-amber-600" />} iconBg="bg-amber-50" accent="border-amber-100"
          label="Loyalty Points Pool" value={(data.totalLoyaltyPoints ?? 0).toLocaleString()} sub={`Avg ${data.avgLoyaltyPoints ?? 0} pts / customer`} />
      </div>

      {/* ── Quick Alerts ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2"><Cake size={18} /> <span className="font-bold text-sm uppercase tracking-wide">Birthdays This Month</span></div>
          <p className="text-4xl font-black">{data.birthdayCount}</p>
          <p className="text-pink-200 text-xs mt-1">Send birthday wishes for loyalty boost</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2"><Heart size={18} /> <span className="font-bold text-sm uppercase tracking-wide">Lapsed Customers</span></div>
          <p className="text-4xl font-black">{data.segments.LAPSED}</p>
          <p className="text-orange-200 text-xs mt-1">Haven't visited in 90+ days</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2"><MessageSquare size={18} /> <span className="font-bold text-sm uppercase tracking-wide">SMS Opt-In</span></div>
          <p className="text-4xl font-black">{data.smsOptIn}</p>
          <p className="text-emerald-200 text-xs mt-1">{data.whatsappOptIn} also on WhatsApp</p>
        </div>
      </div>

      {/* ── Segments + Tiers ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Segment Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Users size={16} className="text-gray-400" /> Customer Segments</h2>
          <div className="flex gap-4 items-center">
            <div className="w-44 h-44 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segmentPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {segmentPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {Object.entries(data.segments as Record<string, number>).map(([seg, count]) => {
                const meta = SEGMENT_META[seg];
                const pct = data.totalCustomers > 0 ? Math.round((count / data.totalCustomers) * 100) : 0;
                return (
                  <div key={seg} className={`${meta?.bg || 'bg-gray-50'} rounded-xl px-3 py-2`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">{meta?.icon}<span className="font-bold text-sm text-gray-800">{seg}</span></div>
                      <span className="font-black text-gray-900">{count} <span className="text-xs font-normal text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-white bg-opacity-60 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: meta?.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Crown size={16} className="text-gray-400" /> Loyalty Tiers</h2>
          <div className="flex gap-4 items-center">
            <div className="w-44 h-44 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tierPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={2}>
                    {tierPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {Object.entries(data.tiers as Record<string, number>).map(([tier, count]) => {
                const meta = TIER_META[tier];
                const pct = data.totalCustomers > 0 ? Math.round((count / data.totalCustomers) * 100) : 0;
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg w-20 text-center ${meta?.bg} ${meta?.text} uppercase tracking-widest`}>{tier}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: meta?.color }} />
                    </div>
                    <span className="font-bold text-gray-800 w-10 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Growth + Visit Frequency ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Monthly New Customers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-1 flex items-center gap-2"><TrendingUp size={16} className="text-gray-400" /> New Customer Growth (6 Months)</h2>
          <p className="text-xs text-gray-400 mb-4">Bars = new registrations · Line = revenue from new customers</p>
          {data.monthlyNew.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={data.monthlyNew} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar yAxisId="left" dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a' }} activeDot={{ r: 6 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Visit Frequency */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-1 flex items-center gap-2"><Repeat size={16} className="text-gray-400" /> Visit Frequency Distribution</h2>
          <p className="text-xs text-gray-400 mb-4">How often customers come back</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={visitFreqData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {visitFreqData.map((_, i) => (
                  <Cell key={i} fill={['#e0e7ff', '#a5b4fc', '#6366f1', '#4338ca'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Spend Distribution ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><IndianRupee size={16} className="text-gray-400" /> Spend Distribution</h2>
        <div className="grid grid-cols-5 gap-3">
          {data.spendBuckets.map((b: any, i: number) => {
            const pct = data.totalCustomers > 0 ? Math.round((b.count / data.totalCustomers) * 100) : 0;
            const colors = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'];
            const textColors = ['text-blue-600', 'text-blue-700', 'text-blue-700', 'text-white', 'text-white'];
            return (
              <div key={i} className="rounded-2xl p-4 text-center flex flex-col justify-between" style={{ backgroundColor: colors[i] }}>
                <p className={`text-2xl font-black ${textColors[i]}`}>{b.count}</p>
                <div>
                  <p className={`text-xs font-bold ${textColors[i]} mt-2`}>{b.label}</p>
                  <p className={`text-[10px] ${textColors[i]} opacity-75`}>{pct}% of base</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top Customers ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-700 flex items-center gap-2"><Award size={16} className="text-amber-500" /> Top Customers</h2>
          <div className="flex gap-2">
            {(['spend', 'visits'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTopTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${topTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                By {tab === 'spend' ? 'Revenue' : 'Visits'}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-50 p-2">
          {(topTab === 'spend' ? data.top10BySpend : data.top10ByVisits).map((c: any, i: number) => (
            <CustomerRow key={c._id} rank={i + 1} c={c} metric={topTab} />
          ))}
          {(topTab === 'spend' ? data.top10BySpend : data.top10ByVisits).length === 0 && (
            <div className="py-12 text-center text-gray-400">No customer data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
