import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { 
  X, User, Phone, Mail, Calendar, Crown, Star, 
  ShoppingBag, Award, Clock, Receipt, IndianRupee,
  Activity, MapPin, ChevronRight, Hash
} from 'lucide-react';

interface CustomerDetailPanelProps {
  customerId: string;
  onClose: () => void;
}

export default function CustomerDetailPanel({ customerId, onClose }: CustomerDetailPanelProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'loyalty'>('orders');

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/customers/${customerId}`);
        if (isMounted) {
          setData(res.data);
        }
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.error || 'Failed to load details');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetail();
    return () => { isMounted = false; };
  }, [customerId]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!customerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-xl h-full bg-gray-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 z-10 border-l border-gray-200">
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon"></div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-red-500 font-semibold mb-4">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg font-medium text-sm hover:bg-gray-300">Close</button>
          </div>
        ) : data ? (
          <>
            {/* Header Section */}
            <div className="bg-white px-6 py-8 border-b border-gray-200 relative">
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    {data.customer.name}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      <Phone size={14} /> {data.customer.phone}
                    </span>
                    {data.customer.dob && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        <Calendar size={14} /> {new Date(data.customer.dob).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-black text-maroon">
                    {data.customer.loyaltyPoints?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Points</div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-6">
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold tracking-widest ${
                  data.customer.tier === 'PLATINUM' ? 'bg-gray-800 text-gray-100' :
                  data.customer.tier === 'GOLD' ? 'bg-yellow-100 text-yellow-800' :
                  data.customer.tier === 'SILVER' ? 'bg-gray-200 text-gray-700' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  <Crown size={12} /> {data.customer.tier}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  data.customer.segment === 'VIP' ? 'bg-purple-100 text-purple-700' :
                  data.customer.segment === 'NEW' ? 'bg-green-100 text-green-700' :
                  data.customer.segment === 'LAPSED' ? 'bg-gray-100 text-gray-600' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {data.customer.segment} Segment
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200 bg-white">
              <div className="p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-center gap-1.5">
                  <ShoppingBag size={14} /> Visits
                </div>
                <div className="font-bold text-lg text-gray-900">{data.customer.totalVisits || 0}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-center gap-1.5">
                  <IndianRupee size={14} /> Lifetime Spend
                </div>
                <div className="font-bold text-lg text-gray-900">₹{(data.customer.totalSpend || 0).toLocaleString()}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-center gap-1.5">
                  <Clock size={14} /> Last Visit
                </div>
                <div className="font-bold text-sm text-gray-900 mt-1.5">
                  {data.customer.lastVisitDate ? new Date(data.customer.lastVisitDate).toLocaleDateString() : 'Never'}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white px-4">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'orders' 
                    ? 'border-maroon text-maroon' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Receipt size={16} /> Order History
              </button>
              <button
                onClick={() => setActiveTab('loyalty')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'loyalty' 
                    ? 'border-maroon text-maroon' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Award size={16} /> Points Ledger
              </button>
              <button
                onClick={() => { onClose(); navigate(`/customer-ledger/${customerId}`); }}
                className="px-6 py-4 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-maroon transition-colors flex items-center gap-2"
              >
                <IndianRupee size={16} /> Financial Ledger
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-4">
              
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {data.orders?.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 bg-white rounded-xl border border-dashed border-gray-300">
                      No orders found for this customer.
                    </div>
                  ) : (
                    data.orders?.map((order: any) => (
                      <div key={order._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                              <Hash size={14} className="text-gray-400" />
                              {order._id.slice(-6).toUpperCase()}
                              <span className="text-gray-300">•</span>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                              {order.tableNumber !== 'TAKEAWAY' ? <MapPin size={12} /> : <ShoppingBag size={12} />}
                              {order.tableNumber === 'TAKEAWAY' ? 'Takeaway' : `Table ${order.tableNumber}`}
                              {order.waiterName && <><span className="text-gray-300 mx-1">•</span> <User size={12} /> {order.waiterName}</>}
                            </div>
                          </div>
                          <div className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                            ₹{order.totalAmountINR.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 mt-3">
                          <p className="line-clamp-2">
                            {order.items.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'loyalty' && (
                <div className="space-y-4">
                  {data.transactions?.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 bg-white rounded-xl border border-dashed border-gray-300">
                      No points history yet.
                    </div>
                  ) : (
                    data.transactions?.map((tx: any) => (
                      <div key={tx._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'EARNED' ? 'bg-green-100 text-green-600' :
                            tx.type === 'REDEEMED' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            <Activity size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{tx.description || tx.type}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{new Date(tx.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className={`font-black ${
                          tx.type === 'EARNED' ? 'text-green-600' :
                          tx.type === 'REDEEMED' ? 'text-red-500' :
                          'text-gray-500'
                        }`}>
                          {tx.type === 'EARNED' ? '+' : tx.type === 'REDEEMED' ? '-' : ''}{tx.points} pts
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
