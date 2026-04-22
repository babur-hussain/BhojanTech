import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Plus, Receipt, FileSignature, Trash2 } from 'lucide-react';

export default function ExpenseTds() {
    const [activeTab, setActiveTab] = useState<'EXPENSE' | 'TDS'>('EXPENSE');
    const [expenses, setExpenses] = useState<any[]>([]);
    const [tdsLogs, setTdsLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New Expense State
    const [expAmount, setExpAmount] = useState('');
    const [expCategory, setExpCategory] = useState('');
    const [expDate, setExpDate] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'EXPENSE') {
                const { data } = await api.get('/expenses');
                setExpenses(data);
            } else {
                const { data } = await api.get('/tds');
                setTdsLogs(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const addExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/expenses', {
                category: expCategory,
                amount: Number(expAmount),
                date: new Date(expDate),
                isGstEligible: false
            });
            setExpAmount(''); setExpCategory(''); setExpDate('');
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Expenses & TDS Tracker</h1>
            </div>

            <div className="flex space-x-4 border-b border-gray-200 mb-6">
                <button
                    className={`pb-3 px-4 font-medium flex items-center ${activeTab === 'EXPENSE' ? 'text-maroon border-b-2 border-maroon' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('EXPENSE')}
                >
                    <Receipt className="w-4 h-4 mr-2" /> Daily Expenses
                </button>
                <button
                    className={`pb-3 px-4 font-medium flex items-center ${activeTab === 'TDS' ? 'text-maroon border-b-2 border-maroon' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('TDS')}
                >
                    <FileSignature className="w-4 h-4 mr-2" /> TDS Liabilities
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3 bg-white p-6 rounded-xl shadow border border-gray-100 h-fit">
                    <h2 className="font-bold text-gray-700 mb-4 flex items-center">
                        <Plus className="w-5 h-5 mr-1" />
                        Add {activeTab === 'EXPENSE' ? 'Expense' : 'TDS Log'}
                    </h2>
                    {activeTab === 'EXPENSE' && (
                        <form onSubmit={addExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                                <input required value={expCategory} onChange={(e) => setExpCategory(e.target.value)} type="text" placeholder="e.g. Utilities, Repair" className="w-full border rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Amount (₹)</label>
                                <input required value={expAmount} onChange={(e) => setExpAmount(e.target.value)} type="number" className="w-full border rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
                                <input required value={expDate} onChange={(e) => setExpDate(e.target.value)} type="date" className="w-full border rounded px-3 py-2" />
                            </div>
                            <button type="submit" className="w-full bg-maroon text-white font-semibold py-2 rounded shadow hover:bg-opacity-90">
                                Save Expense
                            </button>
                        </form>
                    )}
                    {activeTab === 'TDS' && (
                        <div className="text-sm text-gray-500 text-center py-6">
                            Use the Add TDS module to log Sections 194C/194I payments. (Form layout coming soon)
                        </div>
                    )}
                </div>

                <div className="md:w-2/3 bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase">
                            {activeTab === 'EXPENSE' ? (
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Vendor / PAN</th>
                                    <th className="px-6 py-3">Section</th>
                                    <th className="px-6 py-3">TDS Amount</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {activeTab === 'EXPENSE' ? (
                                expenses.length > 0 ? expenses.map((ex: any) => (
                                    <tr key={ex.id} className="border-b">
                                        <td className="px-6 py-4">{new Date(ex.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{ex.category}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-800">₹{ex.amount.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <button className="text-red-500 hover:bg-red-50 p-1 rounded transition"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">No expenses logged.</td></tr>
                            ) : (
                                tdsLogs.length > 0 ? tdsLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b">
                                        <td className="px-6 py-4">{new Date(log.paymentDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{log.vendorName} ({log.panNumber})</td>
                                        <td className="px-6 py-4 font-bold">{log.section}</td>
                                        <td className="px-6 py-4 text-maroon font-bold">₹{log.tdsAmount.toFixed(2)} @ {log.tdsRate}%</td>
                                    </tr>
                                )) : <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">No TDS deductions logged.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
