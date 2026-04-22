import React, { useState } from 'react';
import { Save, Clock } from 'lucide-react';

export default function OnlineOrderingSettings() {
    const [isAcceptingOnline, setIsAcceptingOnline] = useState(true);
    const [prepTime, setPrepTime] = useState(30);

    const handleSave = () => {
        // In production, sync with backend `RestaurantSettings`
        alert('Online Ordering Settings Saved successfully!');
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm max-w-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Online Ordering</h2>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-gray-800">Accept Online Orders</h3>
                    <p className="text-sm text-gray-500">Allow customers to order via QR codes or deep links</p>
                </div>
                <button
                    onClick={() => setIsAcceptingOnline(!isAcceptingOnline)}
                    className={`w-14 h-7 rounded-full p-1 transition-colors ${isAcceptingOnline ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${isAcceptingOnline ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Default Preparation Time (mins)</label>
                <div className="flex items-center gap-3">
                    <Clock className="text-gray-400" size={20} />
                    <input
                        type="number"
                        value={prepTime}
                        onChange={(e) => setPrepTime(Number(e.target.value))}
                        className="w-24 border text-center p-2 rounded-lg font-bold text-gray-800 focus:outline-none focus:border-brand-500"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2">This is communicated to customers tracking their online orders.</p>
            </div>

            <button
                onClick={handleSave}
                className="w-full flex justify-center items-center gap-2 bg-saffron hover:bg-orange-600 text-white py-3 rounded-lg font-bold transition-colors"
            >
                <Save size={18} /> Update Settings
            </button>
        </div>
    );
}
