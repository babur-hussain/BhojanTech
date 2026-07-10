import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useBranchStore } from '../../store/branchStore';
import { Download, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const downloadCSV = (invoices: any[]) => {
    const headers = ['Date', 'Invoice No', 'Table/Type', 'Pre-Tax (₹)', 'GST (₹)', 'Grand Total (₹)', 'Payment Mode'];
    const rows = invoices.map(inv => [
        new Date(inv.createdAt).toLocaleString('en-IN'),
        inv.invoiceNumber,
        inv.orderType === 'DINE_IN' ? `Table ${inv.tableNumber}` : inv.orderType.replace('_', ' '),
        inv.subtotalINR.toFixed(2),
        inv.totalGSTINR.toFixed(2),
        (inv.grandTotalINR || 0).toFixed(2),
        inv.paymentMode || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-register-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

export default function InvoiceRegister() {
    const { selectedBranchId } = useBranchStore();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Date range: default to current month
    const now = new Date();
    const [startDate, setStartDate] = useState(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    );
    const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));

    useEffect(() => {
        setPage(1); // Reset to page 1 when filters change
    }, [selectedBranchId, startDate, endDate]);

    useEffect(() => {
        fetchInvoices();
    }, [selectedBranchId, page, startDate, endDate]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedBranchId === 'all') {
                params.append('branchId', 'all');
            } else if (selectedBranchId) {
                params.append('branchId', selectedBranchId);
            }
            params.append('startDate', startDate);
            params.append('endDate', endDate);
            params.append('page', String(page));
            params.append('limit', '50');

            const response = await api.get(`/accounting/invoices?${params.toString()}`);
            setInvoices(response.data.invoices || []);
            setTotalPages(response.data.pagination?.totalPages || 1);
            setTotal(response.data.pagination?.total || 0);
        } catch (e) {
            console.error('Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleExportAll = async () => {
        try {
            // Fetch all invoices (up to 200) for export
            const params = new URLSearchParams();
            if (selectedBranchId === 'all') {
                params.append('branchId', 'all');
            } else if (selectedBranchId) {
                params.append('branchId', selectedBranchId);
            }
            params.append('startDate', startDate);
            params.append('endDate', endDate);
            params.append('page', '1');
            params.append('limit', '200');

            const response = await api.get(`/accounting/invoices?${params.toString()}`);
            const allInvoices = response.data.invoices || [];
            if (allInvoices.length === 0) {
                alert('No invoices to export for the selected period.');
                return;
            }
            downloadCSV(allInvoices);
        } catch (e) {
            alert('Failed to export invoices.');
        }
    };

    const getOrderStatusColor = (status: string) => {
        switch (status) {
            case 'CANCELLED': return 'bg-red-100 text-red-700';
            case 'PAID': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Invoice Register</h1>
                    <p className="text-sm text-gray-500">
                        Live chronological list of generated tax invoices
                        {total > 0 && <span className="ml-2 font-semibold text-maroon">({total} invoices)</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron focus:border-saffron"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                        type="date"
                        value={endDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={e => setEndDate(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron focus:border-saffron"
                    />
                    <button
                        onClick={handleExportAll}
                        className="bg-white border text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 flex items-center shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" /> Export to CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-600 uppercase">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Invoice No</th>
                            <th className="px-6 py-3">Table/Type</th>
                            <th className="px-6 py-3">Pre-Tax (₹)</th>
                            <th className="px-6 py-3">GST (₹)</th>
                            <th className="px-6 py-3">Grand Total (₹)</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="px-6 py-10 text-center animate-pulse">Loading Invoices...</td></tr>
                        ) : invoices.length > 0 ? (
                            invoices.map((inv) => (
                                <tr key={inv._id} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">{new Date(inv.createdAt).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 font-medium text-maroon">{inv.invoiceNumber}</td>
                                    <td className="px-6 py-4">{inv.orderType === 'DINE_IN' ? `Table ${inv.tableNumber}` : inv.orderType.replace('_', ' ')}</td>
                                    <td className="px-6 py-4">{inv.subtotalINR.toFixed(2)}</td>
                                    <td className="px-6 py-4">{inv.totalGSTINR.toFixed(2)}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{(inv.grandTotalINR || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getOrderStatusColor('PAID')}`}>
                                            VALID
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => navigate(`/invoice/${inv._id}`)}
                                            className="text-orange-600 hover:text-orange-800 p-2 hover:bg-orange-50 rounded-lg transition-colors"
                                            title="View Invoice"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">No invoices generated yet.</td></tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                        <p className="text-sm text-gray-500">
                            Page {page} of {totalPages} ({total} total)
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
