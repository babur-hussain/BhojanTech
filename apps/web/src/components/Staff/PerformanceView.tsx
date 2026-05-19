import React, { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Star } from 'lucide-react';
import { api } from '../../utils/api';
import PageLoader from '../PageLoader';

export default function PerformanceView({ staff }: { staff?: any[] }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (loading && performance.length === 0) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-700">Waiter Performance — {new Date(month).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</h2>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron" />
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {performance.map((p, i) => (
          <div key={p.staffName} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm
                ${i===0?'bg-amber-400':i===1?'bg-gray-400':i===2?'bg-orange-600':'bg-gray-200 text-gray-500'}`}>
                {i+1}
              </div>
              <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${p.staffName}`}
                className="w-10 h-10 rounded-full border-2 border-gray-100" alt=""/>
              <div>
                <p className="font-bold text-gray-800">{p.staffName}</p>
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400 fill-amber-400"/>
                  <span className="text-xs font-semibold text-amber-600">{p.feedbackScore}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { Icon:ShoppingBag, label:'Orders Handled',  val:String(p.ordersHandled),                    color:'text-blue-600' },
                { Icon:DollarSign,  label:'Revenue Generated',val:`₹${p.totalRevenue.toLocaleString('en-IN')}`,color:'text-green-600' },
                { Icon:TrendingUp,  label:'Avg Order Value',  val:`₹${p.avgOrderValue}`,                     color:'text-purple-600' },
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
        ))}
        {performance.length === 0 && !loading && (
          <div className="col-span-3 py-10 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
            No performance data available for this month.
          </div>
        )}
      </div>
    </div>
  );
}
