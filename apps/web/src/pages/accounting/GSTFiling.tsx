import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';

export default function GSTFiling() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchGSTR1();
    }, [month, year]);

    const fetchGSTR1 = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/accounting/gstr1?month=${month}&year=${year}`);
            setData(response.data);
        } catch (e) {
            console.error('Failed to fetch GSTR-1');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">GSTR-1 (Outward Supplies)</h1>
                    <p className="text-sm text-gray-500">Summary of all sales invoices for the month</p>
                </div>
                <div className="flex space-x-3">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="border rounded-md px-3 py-2"
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="border rounded-md px-3 py-2"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download JSON for GSTN
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-turmeric animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">7. B2C (Others) - Sales below ₹2.5L to unregistered persons</h3>
                        <span className="text-sm text-gray-500">Total Records: {data?.docs?.totalCount || 0}</span>
                    </div>

                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase">
                            <tr>
                                <th className="px-6 py-3">Rate (%)</th>
                                <th className="px-6 py-3">Taxable Value (₹)</th>
                                <th className="px-6 py-3">CGST (₹)</th>
                                <th className="px-6 py-3">SGST (₹)</th>
                                <th className="px-6 py-3">Total Tax (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {['5', '12', '18'].map(slab => {
                                const slabData = data?.b2c?.[slab];
                                if (!slabData || slabData.taxable === 0) return null;
                                return (
                                    <tr key={slab} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{slab}%</td>
                                        <td className="px-6 py-4">{slabData.taxable.toFixed(2)}</td>
                                        <td className="px-6 py-4">{slabData.cgst.toFixed(2)}</td>
                                        <td className="px-6 py-4">{slabData.sgst.toFixed(2)}</td>
                                        <td className="px-6 py-4 font-semibold">{(slabData.cgst + slabData.sgst).toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                            <tr className="bg-yellow-50 font-bold border-t-2 border-yellow-200">
                                <td className="px-6 py-4">TOTAL</td>
                                <td className="px-6 py-4 text-maroon">{data?.totals?.totalTaxable?.toFixed(2)}</td>
                                <td className="px-6 py-4 text-maroon">{data?.totals?.totalCgst?.toFixed(2)}</td>
                                <td className="px-6 py-4 text-maroon">{data?.totals?.totalSgst?.toFixed(2)}</td>
                                <td className="px-6 py-4 text-maroon">
                                    {((data?.totals?.totalCgst || 0) + (data?.totals?.totalSgst || 0)).toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="p-4 bg-gray-50 border-y flex justify-between items-center mt-6">
                        <h3 className="font-semibold text-gray-700">12. HSN-wise Summary of outward supplies</h3>
                    </div>

                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase">
                            <tr>
                                <th className="px-6 py-3">HSN Code</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3">Total Qty Sold</th>
                                <th className="px-6 py-3">Total Taxable Value (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.hsn && Object.keys(data.hsn).length > 0 ? (
                                Object.keys(data.hsn).map(hsn => (
                                    <tr key={hsn} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{hsn}</td>
                                        <td className="px-6 py-4">Restaurant Services</td>
                                        <td className="px-6 py-4">{data.hsn[hsn].qty}</td>
                                        <td className="px-6 py-4">{data.hsn[hsn].taxable.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                                        No HSN summary available for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                </div>
            )}
        </div>
    );
}
