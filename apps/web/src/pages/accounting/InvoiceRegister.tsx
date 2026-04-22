import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { FileText, Download } from 'lucide-react';

export default function InvoiceRegister() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await api.get('/accounting/invoices');
            setInvoices(response.data);
        } catch (e) {
            console.error('Failed to fetch invoices');
        } finally {
            setLoading(false);
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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Invoice Register</h1>
                    <p className="text-sm text-gray-500">Live chronological list of generated tax invoices</p>
                </div>
                <button className="bg-white border text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 flex items-center shadow-sm">
                    <Download className="w-4 h-4 mr-2" /> Export to CSV
                </button>
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
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="px-6 py-10 text-center animate-pulse">Loading Invoices...</td></tr>
                        ) : invoices.length > 0 ? (
                            invoices.map((inv) => (
                                <tr key={inv.id} className="border-b hover:bg-gray-50">
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
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No invoices generated yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
