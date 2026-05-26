import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ShoppingBag, Loader2 } from 'lucide-react';
import { getMyOrders } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const History = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
            return;
        }

        getMyOrders()
            .then(data => setOrders(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [isAuthenticated, navigate]);

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col pb-6">
            <header className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 border rounded-xl hover:bg-gray-50">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Visit History</h1>
                </div>
            </header>

            <main className="p-4 flex-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center mt-20">
                        <Loader2 className="animate-spin text-brand-600 mb-2" size={32} />
                        <p className="text-gray-500 font-medium">Loading your visits...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Clock size={40} className="text-gray-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">No Past Visits</h2>
                        <p className="text-gray-500 max-w-xs">You haven't placed any orders with us yet. We look forward to serving you!</p>
                        <button onClick={() => navigate('/menu')} className="mt-6 font-bold text-brand-600 hover:text-brand-800">
                            Browse Menu
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order, idx) => (
                            <div key={order._id || idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                                            {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                        <p className="font-bold text-gray-900">
                                            {order.isOnlineOrder ? (order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway') : `Table ${order.tableNumber}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-lg text-brand-600">₹{(order.totalAmountINR || 0).toFixed(2)}</p>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                            order.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                                            'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShoppingBag size={14} className="text-gray-400" />
                                        <span className="text-xs font-bold text-gray-700">{order.items?.length || 0} Items</span>
                                    </div>
                                    {order.items?.slice(0, 3).map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-gray-600 flex-1 truncate pr-2">
                                                {item.quantity}x {item.name || item.menuItemId?.name || 'Item'}
                                            </span>
                                        </div>
                                    ))}
                                    {(order.items?.length || 0) > 3 && (
                                        <p className="text-xs text-gray-400 font-medium mt-1">
                                            + {(order.items?.length || 0) - 3} more items
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};
