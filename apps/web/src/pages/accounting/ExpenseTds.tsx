import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Plus, Receipt, FileSignature, Trash2 } from 'lucide-react';
import { useBranchStore } from '../../store/branchStore';

export default function ExpenseTds() {
    const { selectedBranchId } = useBranchStore();
    const isAllBranches = selectedBranchId === 'all';
    const [activeTab, setActiveTab] = useState<'EXPENSE' | 'TDS'>('EXPENSE');
    const [expenses, setExpenses] = useState<any[]>([]);
    const [tdsLogs, setTdsLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New Expense State
    const [expAmount, setExpAmount] = useState('');
    const [expCategory, setExpCategory] = useState('');
    const [expDate, setExpDate] = useState('');
    const [expGstEligible, setExpGstEligible] = useState(false);

    // New TDS State
    const [tdsVendor, setTdsVendor] = useState('');
    const [tdsPan, setTdsPan] = useState('');
    const [tdsSection, setTdsSection] = useState('194C');
    const [tdsAmount, setTdsAmount] = useState('');
    const [tdsRate, setTdsRate] = useState('2');
    const [tdsDate, setTdsDate] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab, selectedBranchId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const branchQs = selectedBranchId === 'all' ? '?branchId=all' : `?branchId=${selectedBranchId}`;
            if (activeTab === 'EXPENSE') {
                const { data } = await api.get(`/expenses${branchQs}`);
                setExpenses(data);
            } else {
                const { data } = await api.get(`/tds${branchQs}`);
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
                isGstEligible: expGstEligible
            });
            setExpAmount(''); setExpCategory(''); setExpDate(''); setExpGstEligible(false);
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Failed to add expense');
        }
    };

    const deleteExpense = async (id: string) => {
        if (!confirm('Delete this expense?')) return;
        try {
            await api.delete(`/expenses/${id}`);
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Failed to delete expense');
        }
    };

    const addTdsLog = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/tds', {
                vendorName: tdsVendor,
                panNumber: tdsPan,
                section: tdsSection,
                tdsAmount: Number(tdsAmount),
                tdsRate: Number(tdsRate),
                paymentDate: new Date(tdsDate),
                branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined
            });
            setTdsVendor(''); setTdsPan(''); setTdsAmount(''); setTdsDate('');
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Failed to add TDS log');
        }
    };

    const deleteTds = async (id: string) => {
        if (!confirm('Delete this TDS record?')) return;
        try {
            await api.delete(`/tds/${id}`);
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Failed to delete TDS record');
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
                                <select required value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className="w-full border rounded px-3 py-2">
                                    <option value="">Select Category</option>
                                    <option value="Staff Salaries">Staff Salaries</option>
                                    <option value="Rent">Rent</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Zomato/Swiggy Commission">Zomato/Swiggy Commission</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                                    <option value="Raw Materials">Raw Materials</option>
                                    <option value="Miscellaneous">Miscellaneous</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Amount (₹)</label>
                                <input required value={expAmount} onChange={(e) => setExpAmount(e.target.value)} type="number" className="w-full border rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
                                <input required value={expDate} onChange={(e) => setExpDate(e.target.value)} type="date" className="w-full border rounded px-3 py-2" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="gstEligible" checked={expGstEligible} onChange={(e) => setExpGstEligible(e.target.checked)} className="rounded" />
                                <label htmlFor="gstEligible" className="text-sm text-gray-600">GST Eligible (claim ITC)</label>
                            </div>
                            <button type="submit" disabled={isAllBranches} title={isAllBranches ? "Select a specific branch to add expenses" : ""} className={`w-full text-white font-semibold py-2 rounded shadow ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-maroon hover:bg-opacity-90'}`}>
                                Save Expense
                            </button>
                        </form>
                    )}
                    {activeTab === 'TDS' && (
                        <form onSubmit={addTdsLog} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Vendor Name</label>
                                <input required value={tdsVendor} onChange={(e) => setTdsVendor(e.target.value)} type="text" placeholder="e.g. ABC Suppliers" className="w-full border rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">PAN Number</label>
                                <input required value={tdsPan} onChange={(e) => setTdsPan(e.target.value.toUpperCase())} type="text" placeholder="ABCDE1234F" maxLength={10} className="w-full border rounded px-3 py-2 uppercase" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Section</label>
                                <select value={tdsSection} onChange={(e) => setTdsSection(e.target.value)} className="w-full border rounded px-3 py-2">
                                    <option value="194C">194C — Contractor</option>
                                    <option value="194I">194I — Rent</option>
                                    <option value="194J">194J — Professional/Technical</option>
                                    <option value="194H">194H — Commission</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">TDS Amount (₹)</label>
                                    <input required value={tdsAmount} onChange={(e) => setTdsAmount(e.target.value)} type="number" className="w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Rate (%)</label>
                                    <input required value={tdsRate} onChange={(e) => setTdsRate(e.target.value)} type="number" step="0.1" className="w-full border rounded px-3 py-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Payment Date</label>
                                <input required value={tdsDate} onChange={(e) => setTdsDate(e.target.value)} type="date" className="w-full border rounded px-3 py-2" />
                            </div>
                            <button type="submit" disabled={isAllBranches} className={`w-full text-white font-semibold py-2 rounded shadow ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-maroon hover:bg-opacity-90'}`}>
                                Save TDS Log
                            </button>
                        </form>
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
                                    <th className="px-6 py-3">GST</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Vendor / PAN</th>
                                    <th className="px-6 py-3">Section</th>
                                    <th className="px-6 py-3">TDS Amount</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 animate-pulse">Loading...</td></tr>
                            ) : activeTab === 'EXPENSE' ? (
                                expenses.length > 0 ? expenses.map((ex: any) => (
                                    <tr key={ex._id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">{new Date(ex.date).toLocaleDateString('en-IN')}</td>
                                        <td className="px-6 py-4">{ex.category}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-800">₹{ex.amount.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ex.isGstEligible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {ex.isGstEligible ? 'ITC' : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => deleteExpense(ex._id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No expenses logged.</td></tr>
                            ) : (
                                tdsLogs.length > 0 ? tdsLogs.map((log: any) => (
                                    <tr key={log._id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4">{new Date(log.paymentDate).toLocaleDateString('en-IN')}</td>
                                        <td className="px-6 py-4">{log.vendorName} <span className="text-xs text-gray-400">({log.panNumber})</span></td>
                                        <td className="px-6 py-4 font-bold">{log.section}</td>
                                        <td className="px-6 py-4 text-maroon font-bold">₹{log.tdsAmount.toFixed(2)} @ {log.tdsRate}%</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => deleteTds(log._id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No TDS deductions logged.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
