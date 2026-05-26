import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Users, Crown, Calendar, Search, Filter, MessageSquare, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranchStore } from '../store/branchStore';
import CustomerDetailPanel from '../components/CustomerDetailPanel';

interface Customer {
    _id: string;
    name: string;
    phone: string;
    tier: string;
    segment: string;
    loyaltyPoints: number;
    totalVisits: number;
    totalSpend: number;
    lastVisitDate: string;
    birthdayMonth?: number;
    smsOptIn: boolean;
    notes?: string;
}

export default function Customers() {
    const { user } = useAuth();
    const { selectedBranchId } = useBranchStore();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [segmentFilter, setSegmentFilter] = useState('');
    const [tierFilter, setTierFilter] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    useEffect(() => {
        fetchSummary();
        fetchCustomers();
    }, [segmentFilter, tierFilter, search, selectedBranchId]);

    const fetchSummary = async () => {
        try {
            const res = await api.get('/customers/segments/summary');
            setSummary(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCustomers = async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.append('q', search);
            if (segmentFilter) params.append('segment', segmentFilter);
            if (tierFilter) params.append('tier', tierFilter);

            const res = await api.get(`/customers?${params.toString()}`);
            setCustomers(res.data.customers || []);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const trendColor = (val: number) => val >= 0 ? "text-green-600" : "text-red-500";
    const trendArrow = (val: number) => val >= 0 ? <ChevronUp size={14} className="text-green-600" /> : <ChevronDown size={14} className="text-red-500" />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">CRM & Customers</h1>
                    <p className="text-gray-500 text-sm">Manage relationships, segments, and loyalty points.</p>
                </div>
                <div className="flex gap-2">
                    <a href="/campaigns" className="flex items-center gap-2 px-4 py-2 bg-saffron text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors shadow-sm">
                        <MessageSquare size={16} /> New Campaign
                    </a>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-maroon bg-opacity-10 rounded-lg text-maroon"><Users size={20} /></div>
                            {summary.trends && (
                                <div className={`flex items-center text-xs font-semibold ${trendColor(summary.trends.NEW || 0)}`}>
                                    {summary.trends.NEW > 0 ? "+" : ""}{summary.trends.NEW || 0}% {trendArrow(summary.trends.NEW || 0)}
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <h2 className="text-2xl font-black text-gray-900">{summary.total || 0}</h2>
                            <p className="text-sm font-medium text-gray-500">Total Customers</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-saffron bg-opacity-10 rounded-lg text-saffron"><Crown size={20} /></div>
                            {summary.trends && (
                                <div className={`flex items-center text-xs font-semibold ${trendColor(summary.trends.VIP || 0)}`}>
                                    {summary.trends.VIP > 0 ? "+" : ""}{summary.trends.VIP || 0}% {trendArrow(summary.trends.VIP || 0)}
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <h2 className="text-2xl font-black text-gray-900">{summary.segments?.VIP || 0}</h2>
                            <p className="text-sm font-medium text-gray-500">VIP Segment</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600"><Calendar size={20} /></div>
                        </div>
                        <div className="mt-4">
                            <h2 className="text-2xl font-black text-gray-900">{summary.newThisMonth || 0}</h2>
                            <p className="text-sm font-medium text-gray-500">New This Month</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Users size={20} /></div>
                            {summary.trends && (
                                <div className={`flex items-center text-xs font-semibold ${trendColor(summary.trends.LAPSED || 0)}`}>
                                    {summary.trends.LAPSED > 0 ? "+" : ""}{summary.trends.LAPSED || 0}% {trendArrow(summary.trends.LAPSED || 0)}
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <h2 className="text-2xl font-black text-gray-900">{summary.segments?.LAPSED || 0}</h2>
                            <p className="text-sm font-medium text-gray-500">Lapsed Segment</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Directory Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50">
                    <div className="relative w-full sm:w-80">
                        <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-saffron focus:border-saffron"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Filter size={16} className="text-gray-400" />
                        <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white flex-1 sm:flex-none">
                            <option value="">All Segments</option>
                            <option value="VIP">VIP</option>
                            <option value="REGULAR">Regular</option>
                            <option value="OCCASIONAL">Occasional</option>
                            <option value="NEW">New</option>
                            <option value="LAPSED">Lapsed</option>
                        </select>
                        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2 bg-white flex-1 sm:flex-none text-maroon font-semibold">
                            <option value="">All Tiers</option>
                            <option value="PLATINUM">Platinum</option>
                            <option value="GOLD">Gold</option>
                            <option value="SILVER">Silver</option>
                            <option value="BRONZE">Bronze</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                            <tr>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Customer</th>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs w-24">Segment</th>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs w-24">Tier</th>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs text-right">Loyalty Pts</th>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs text-right">Visits</th>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs text-right">Total Spend</th>
                                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-xs">Last Visit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-500">Loading customers...</td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-500">No customers found.</td></tr>
                            ) : customers.map(c => (
                                <tr key={c._id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedCustomerId(c._id)}>
                                    <td className="py-3 px-4">
                                        <div className="font-semibold text-gray-900">{c.name}</div>
                                        <div className="text-xs text-gray-500">{c.phone}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.segment === 'VIP' ? 'bg-purple-100 text-purple-700' :
                                                c.segment === 'NEW' ? 'bg-green-100 text-green-700' :
                                                    c.segment === 'LAPSED' ? 'bg-gray-100 text-gray-600' :
                                                        'bg-blue-100 text-blue-700'
                                            }`}>
                                            {c.segment}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-widest ${c.tier === 'PLATINUM' ? 'bg-gray-800 text-gray-100' :
                                                c.tier === 'GOLD' ? 'bg-yellow-100 text-yellow-800' :
                                                    c.tier === 'SILVER' ? 'bg-gray-200 text-gray-700' :
                                                        'bg-orange-100 text-orange-800'
                                            }`}>
                                            {c.tier}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-maroon">{(c.loyaltyPoints ?? 0).toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right">{c.totalVisits ?? 0}</td>
                                    <td className="py-3 px-4 text-right">₹{(c.totalSpend ?? 0).toLocaleString()}</td>
                                    <td className="py-3 px-4 text-gray-500">{c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Slide-over Panel */}
            {selectedCustomerId && (
                <CustomerDetailPanel 
                    customerId={selectedCustomerId} 
                    onClose={() => setSelectedCustomerId(null)} 
                />
            )}
        </div>
    );
}
