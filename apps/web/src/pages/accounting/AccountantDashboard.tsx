import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useBranchStore } from '../../store/branchStore';
import { AlertCircle, FileText, Calendar, IndianRupee, Clock, Download, TrendingUp, TrendingDown } from 'lucide-react';

export default function AccountantDashboard() {
    const { selectedBranchId } = useBranchStore();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchMetrics();
    }, [selectedBranchId]);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const qs = selectedBranchId === 'all' ? '?branchId=all' : `?branchId=${selectedBranchId}`;
            const response = await api.get(`/accounting/dashboard${qs}`);
            setData(response.data);
        } catch (e) {
            console.error('Failed to fetch dashboard metrics');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const res = await api.get(`/analytics/gst/export?month=${month}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `GST-Report-${month}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error('Export failed:', e);
            alert('Failed to export report. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Financial Data...</div>;
    }

    const revenue = data?.metrics?.totalRevenueThisMonth || 0;
    const gst = data?.metrics?.totalGstLiability || 0;
    const pending = data?.metrics?.pendingItems || 0;
    const vsLastMonth = data?.metrics?.vsLastMonth || 0;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-maroon">Accountant Portal</h1>
                    <p className="text-gray-500 mt-1">Real-time financial and compliance overview.</p>
                </div>
                <button 
                    onClick={handleExport}
                    disabled={exporting}
                    className="bg-maroon text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-all flex items-center shadow-md disabled:opacity-50"
                >
                    <Download className="w-4 h-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export Month End Report'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                        <IndianRupee className="w-16 h-16 text-saffron" />
                    </div>
                    <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">Total Subject to GST</h3>
                    <p className="text-4xl font-bold text-gray-800">
                        ₹{revenue.toLocaleString('en-IN')}
                    </p>
                    {vsLastMonth !== 0 && (
                        <div className={`mt-4 text-xs font-medium flex items-center ${vsLastMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <span className={`${vsLastMonth >= 0 ? 'bg-green-100' : 'bg-red-100'} px-2 py-1 rounded inline-flex items-center gap-1`}>
                                {vsLastMonth >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                {vsLastMonth >= 0 ? '+' : ''}{vsLastMonth.toFixed(1)}% vs last month
                            </span>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                        <FileText className="w-16 h-16 text-maroon" />
                    </div>
                    <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">Estimated Output Tax</h3>
                    <p className="text-4xl font-bold text-maroon">
                        ₹{gst.toLocaleString('en-IN')}
                    </p>
                    <p className="mt-4 text-sm text-gray-400">Excludes Input Tax Credit (ITC)</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                        <AlertCircle className="w-16 h-16 text-red-500" />
                    </div>
                    <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">Pending Items</h3>
                    <p className="text-4xl font-bold text-gray-800">
                        {pending}
                    </p>
                    <p className="mt-4 text-sm text-gray-400">Requires manual reconciliation</p>
                </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Calendar className="mr-2 w-5 h-5 text-turmeric" />
                Upcoming Compliance Deadlines
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GSTR-1 Deadline */}
                <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-start space-x-4 hover:border-red-300 transition-colors">
                    <div className="bg-red-50 p-3 rounded-lg text-red-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-800">GSTR-1 Filing</h4>
                        <p className="text-sm text-gray-500">Outward Supplies (Sales)</p>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">
                                Due: {new Date(data?.deadlines?.gstr1?.date || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                {data?.deadlines?.gstr1?.daysLeft || 'N/A'} Days Left
                            </span>
                        </div>
                    </div>
                </div>

                {/* GSTR-3B Deadline */}
                <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm flex items-start space-x-4 hover:border-orange-300 transition-colors">
                    <div className="bg-orange-50 p-3 rounded-lg text-orange-600">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-800">GSTR-3B Filing</h4>
                        <p className="text-sm text-gray-500">Summary & Tax Payment</p>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">
                                Due: {new Date(data?.deadlines?.gstr3b?.date || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                                {data?.deadlines?.gstr3b?.daysLeft || 'N/A'} Days Left
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
