import React from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Star } from 'lucide-react';

const MOCK_PERF = [
  { staffName:'Rahul Sharma',  ordersHandled:142, totalRevenue:84200, avgOrderValue:593, feedbackScore:4.7 },
  { staffName:'Amit Kumar',    ordersHandled:108, totalRevenue:61500, avgOrderValue:569, feedbackScore:4.3 },
  { staffName:'Sunita Devi',   ordersHandled:96,  totalRevenue:58000, avgOrderValue:604, feedbackScore:4.8 },
];

export default function PerformanceView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-700">Waiter Performance — {new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</h2>
        <select className="border rounded-lg px-3 py-2 text-sm">
          {Array.from({length:3},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);return d;}).map(d=>(
            <option key={d.toISOString()}>{d.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MOCK_PERF.map((p, i) => (
          <div key={p.staffName} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm
                ${i===0?'bg-amber-400':i===1?'bg-gray-400':'bg-orange-600'}`}>
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
      </div>
    </div>
  );
}
