import React, { useEffect, useState } from 'react';
import {
    Users, TrendingUp, UserMinus, ShieldAlert,
    Database, AlertCircle, BarChart2
} from 'lucide-react';

interface AnalyticsData {
    totalCustomers: number;
    newLast7: number;
    newLast30: number;
    retentionRate: number;
    churnRate: number;
    churnedCount: number;
    avgCLV: number;
    totalPoints: number;
    topCustomers: any[];
}

export default function Analytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        // Mocking the fetch call for the dashboard
        setData({
            totalCustomers: 2450,
            newLast7: 45,
            newLast30: 180,
            retentionRate: 42.5,
            churnRate: 15.2,
            churnedCount: 372,
            avgCLV: 12500,
            totalPoints: 145000,
            topCustomers: []
        });
    }, []);

    if (!data) return <div className="p-8 text-center text-gray-500">Loading Analytics...</div>;

    const kpis = [
        { title: 'Acquisition (30d)', value: `+${data.newLast30}`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Retention Rate', value: `${data.retentionRate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Churn Rate', value: `${data.churnRate}%`, icon: UserMinus, color: 'text-red-600', bg: 'bg-red-50' },
        { title: 'Avg Cust. LTV', value: `₹${data.avgCLV.toLocaleString()}`, icon: Database, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Points Liability', value: data.totalPoints.toLocaleString(), icon: ShieldAlert, color: 'text-saffron', bg: 'bg-orange-50' },
    ];

    return (
        <div className="p-8 pb-32">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Customer Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Key metrics for acquisition, retention, and points liability.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <div className={`w-10 h-10 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center mb-4`}>
                            <kpi.icon size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">{kpi.title}</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">{kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="text-gray-400" />
                    <h2 className="text-lg font-bold text-gray-800">Acquisition vs Churn Overview</h2>
                </div>
                <div className="h-64 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                    <AlertCircle className="mb-2 opacity-50" />
                    <p className="font-medium">Chart visualization pending</p>
                    <p className="text-sm">Install Recharts to render historical dataset</p>
                </div>
            </div>
        </div>
    );
}
