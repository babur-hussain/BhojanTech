import React, { useState, useEffect } from 'react';
import {
  TrendingUp, ShoppingBag, DollarSign, Star, Calendar, Clock,
  Award, Target, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../../utils/api';
import PageLoader from '../PageLoader';

export default function PerformanceView({ staff }: { staff?: any[] }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'revenue' | 'orders' | 'punctuality'>('revenue');

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/staff/performance/${month}`);
        setPerformance(res.data);
      } catch (e) {
        console.error('Failed to fetch performance:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, [month]);

  const sorted = [...performance].sort((a, b) => {
    if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
    if (sortBy === 'orders') return b.ordersHandled - a.ordersHandled;
    return b.punctualityScore - a.punctualityScore;
  });

  // Aggregate stats
  const totalRevenue = performance.reduce((s, p) => s + p.totalRevenue, 0);
  const totalOrders = performance.reduce((s, p) => s + p.ordersHandled, 0);
  const avgPunctuality = performance.length > 0
    ? Math.round(performance.reduce((s, p) => s + (p.punctualityScore || 0), 0) / performance.length)
    : 0;

  if (loading && performance.length === 0) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-bold text-gray-700 text-lg flex items-center gap-2">
            <Award size={20} className="text-saffron" />
            Staff Performance — {new Date(month).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Revenue, orders, and attendance metrics for each staff member</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron">
            <option value="revenue">Sort: Revenue</option>
            <option value="orders">Sort: Orders</option>
            <option value="punctuality">Sort: Punctuality</option>
          </select>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron" />
        </div>
      </div>

      {/* Summary Stats */}
      {performance.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4 text-center">
            <DollarSign size={20} className="mx-auto text-green-600 mb-1" />
            <p className="text-xl font-black text-green-700">₹{totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-green-600">Total Revenue</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 text-center">
            <ShoppingBag size={20} className="mx-auto text-blue-600 mb-1" />
            <p className="text-xl font-black text-blue-700">{totalOrders}</p>
            <p className="text-xs text-blue-600">Total Orders</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200 p-4 text-center">
            <Target size={20} className="mx-auto text-purple-600 mb-1" />
            <p className="text-xl font-black text-purple-700">{avgPunctuality}%</p>
            <p className="text-xs text-purple-600">Avg Punctuality</p>
          </div>
        </div>
      )}

      {/* Performance Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {sorted.map((p, i) => {
          const isExpanded = expandedCard === p.staffName;
          return (
            <div key={p.staffName}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
              {/* Card Header */}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm
                    ${i===0?'bg-gradient-to-br from-amber-400 to-amber-500':i===1?'bg-gradient-to-br from-gray-400 to-gray-500':i===2?'bg-gradient-to-br from-orange-500 to-orange-600':'bg-gray-200 text-gray-500'}`}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : i+1}
                  </div>
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${p.staffName}`}
                    className="w-10 h-10 rounded-full border-2 border-gray-100" alt=""/>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{p.staffName}</p>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400"/>
                      <span className="text-xs font-semibold text-amber-600">{p.feedbackScore}</span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-3">
                  {[
                    { Icon:ShoppingBag, label:'Orders Handled',  val:String(p.ordersHandled), color:'text-blue-600' },
                    { Icon:DollarSign,  label:'Revenue Generated',val:`₹${p.totalRevenue.toLocaleString('en-IN')}`, color:'text-green-600' },
                    { Icon:TrendingUp,  label:'Avg Order Value',  val:`₹${p.avgOrderValue}`, color:'text-purple-600' },
                  ].map(m => (
                    <div key={m.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <m.Icon size={14} className={m.color}/> {m.label}
                      </div>
                      <span className={`font-bold text-sm ${m.color}`}>{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expandable Attendance Section */}
              <button
                onClick={() => setExpandedCard(isExpanded ? null : p.staffName)}
                className="w-full px-4 py-2 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <span className="font-semibold">Attendance & Punctuality</span>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-gray-50 border-t space-y-3">
                  {/* Punctuality Score Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Punctuality Score</span>
                      <span className={`font-bold ${
                        p.punctualityScore >= 80 ? 'text-green-600' :
                        p.punctualityScore >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>{p.punctualityScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          p.punctualityScore >= 80 ? 'bg-green-500' :
                          p.punctualityScore >= 60 ? 'bg-amber-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, p.punctualityScore)}%` }}
                      />
                    </div>
                  </div>

                  {/* Attendance Breakdown */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-100 rounded-lg p-2 text-center">
                      <p className="text-lg font-black text-green-700">{p.presentDays || 0}</p>
                      <p className="text-[10px] font-semibold text-green-600">Present</p>
                    </div>
                    <div className="bg-amber-100 rounded-lg p-2 text-center">
                      <p className="text-lg font-black text-amber-700">{p.lateDays || 0}</p>
                      <p className="text-[10px] font-semibold text-amber-600">Late</p>
                    </div>
                    <div className="bg-red-100 rounded-lg p-2 text-center">
                      <p className="text-lg font-black text-red-700">{p.absentDays || 0}</p>
                      <p className="text-[10px] font-semibold text-red-600">Absent</p>
                    </div>
                  </div>

                  {p.punctualityScore < 60 && (
                    <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                      <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                      Low punctuality. Consider a conversation with this staff member.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {performance.length === 0 && !loading && (
          <div className="col-span-3 py-10 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
            <Award size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No performance data available for this month.</p>
            <p className="text-xs text-gray-400 mt-1">Performance is tracked from invoice/order data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
