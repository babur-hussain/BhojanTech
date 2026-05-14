import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Activity, TrendingUp, ShoppingBag, Clock, Users } from 'lucide-react';
import PageLoader from '../components/PageLoader';
import { useBranchStore } from '../store/branchStore';

const inrFormat = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export default function LiveAnalytics() {
    const { selectedBranchId } = useBranchStore();
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState(false);
    const [lastTick, setLastTick] = useState(new Date());

    const fetchLive = async () => {
        try {
            setError(false);
            const qs = selectedBranchId !== 'all' ? `?branchId=${selectedBranchId}` : '';
            const res = await api.get(`/analytics/dashboard${qs}`);
            setData(res.data);
            setLastTick(new Date());
        } catch (e) {
            console.error('Live feed error:', e);
            setError(true);
        }
    };

    useEffect(() => {
        fetchLive();
        const t = setInterval(fetchLive, 5000); // Super fast 5s polling for true "Live" feel
        return () => clearInterval(t);
    }, [selectedBranchId]);

    if (!data) {
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500 h-full">
                    <Activity className="w-16 h-16 text-red-300 mb-4 animate-pulse" />
                    <p className="text-xl font-bold">Live connection lost</p>
                    <button onClick={fetchLive} className="mt-4 px-4 py-2 bg-saffron text-white rounded-lg">Reconnect</button>
                </div>
            );
        }
        return <PageLoader />;
    }

    const occRate = data.occupancyRate || 0;
    const isHighOccupancy = occRate > 80;

    return (
        <div className="p-8 pb-32 min-h-full bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl shadow-inner">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-saffron to-orange-400">
                        Live Activity Monitor
                    </h1>
                    <p className="text-gray-400 mt-1 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Real-time feed active • Last synced {lastTick.toLocaleTimeString()}
                    </p>
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={64} /></div>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Active KOTs</p>
                    <p className="text-5xl font-black text-white mt-2">{data.activeOrders}</p>
                </div>

                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={64} /></div>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Table Occupancy</p>
                    <div className="flex items-end gap-3 mt-2">
                        <p className={`text-5xl font-black ${isHighOccupancy ? 'text-saffron' : 'text-green-400'}`}>
                            {occRate}%
                        </p>
                        <p className="text-gray-500 mb-1 font-medium">{data.occupiedTables} / {data.totalTables} seated</p>
                    </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><ShoppingBag size={64} /></div>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Total Orders Today</p>
                    <p className="text-5xl font-black text-blue-400 mt-2">{data.todayOrders}</p>
                </div>

                <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={64} /></div>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Live Revenue</p>
                    <p className="text-4xl font-black text-white mt-3 truncate">{inrFormat(data.todayRevenue)}</p>
                </div>
            </div>

            {/* Live Feed Feed */}
            <div className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-2xl p-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                    <Clock className="text-saffron" /> Recent Transactions Stream
                </h2>

                {data.recentOrders?.length > 0 ? (
                    <div className="space-y-3">
                        {data.recentOrders.map((order: any, idx: number) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-saffron/20 text-saffron flex items-center justify-center font-bold">
                                        {order.tableNumber || 'AW'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg">{order.invoiceNumber}</p>
                                        <p className="text-sm text-gray-400 flex gap-2">
                                            <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                                            <span>•</span>
                                            <span className="text-gray-300">{order.paymentMode}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-green-400">+{inrFormat(order.grandTotal)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-gray-500">
                        <p>No recent orders today yet. Waiting for live activity...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
