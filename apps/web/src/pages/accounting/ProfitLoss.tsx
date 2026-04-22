import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { RefreshCw, Download, PiggyBank } from 'lucide-react';

export default function ProfitLoss() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchPnL();
    }, [month, year]);

    const fetchPnL = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/accounting/pnl?month=${month}&year=${year}`);
            setData(response.data);
        } catch (e) {
            console.error('Failed to fetch PnL');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                        <PiggyBank className="w-6 h-6 mr-2 text-turmeric" />
                        Profit & Loss Statement
                    </h1>
                    <p className="text-sm text-gray-500">Income, COGS, and Operational Expenses</p>
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
                    <button className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-turmeric animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
                    {/* Revenue */}
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">1. Revenue Summary (Net of GST)</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Dine-In & Takeaway</span>
                                <span className="font-medium">₹{data?.revenue?.dineIn?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Online Delivery Platforms</span>
                                <span className="font-medium">₹{data?.revenue?.online?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t font-semibold text-base py-1 bg-green-50 px-2 rounded mt-2">
                                <span className="text-green-800">Total Operational Revenue</span>
                                <span className="text-green-800">₹{data?.revenue?.total?.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                    </div>

                    {/* COGS & Gross Profit */}
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">2. Cost of Goods Sold (COGS)</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Raw Materials Consumed</span>
                                <span className="font-medium">₹{data?.cogs?.rawMaterials?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t font-semibold text-base py-1 bg-yellow-50 px-2 rounded mt-2">
                                <span className="text-yellow-800">Gross Profit</span>
                                <span className="text-yellow-800">₹{data?.cogs?.grossProfit?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between px-2 text-xs text-gray-500">
                                <span>Gross Margin</span>
                                <span>{data?.cogs?.grossMargin?.toFixed(1) || '0'}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Operating Expenses */}
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">3. Operating Expenses (OPEX)</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Staff Salaries & Wages</span>
                                <span className="font-medium">₹{data?.opex?.salaries?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Zomato/Swiggy Commissions</span>
                                <span className="font-medium">₹{data?.opex?.commissions?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Rent</span>
                                <span className="font-medium">₹{data?.opex?.rent?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Utilities (Electricity/Water)</span>
                                <span className="font-medium">₹{data?.opex?.utilities?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Marketing & SMS</span>
                                <span className="font-medium">₹{data?.opex?.marketing?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Miscellaneous</span>
                                <span className="font-medium">₹{data?.opex?.miscellaneous?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t font-semibold text-base py-1 bg-red-50 px-2 rounded mt-2">
                                <span className="text-red-800">Total Operating Expenses</span>
                                <span className="text-red-800">₹{data?.opex?.total?.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                    </div>

                    {/* EBITDA */}
                    <div className="pt-6 border-t-4 border-maroon">
                        <div className="flex justify-between font-bold text-xl py-2 px-3 bg-maroon text-white rounded">
                            <span>EBITDA (Net Operating Income)</span>
                            <span>₹{data?.ebitda?.toFixed(2) || '0.00'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-right">Earnings Before Interest, Taxes, Depreciation, and Amortization.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
