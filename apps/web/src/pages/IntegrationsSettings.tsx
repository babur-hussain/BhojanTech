import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranchStore } from '../store/branchStore';
import { api } from '../utils/api';
import { RefreshCw, Play, Pause, Save } from 'lucide-react';

interface IntegrationSetting {
    _id?: string;
    platform: 'ZOMATO' | 'SWIGGY' | 'ONDC';
    restaurantIdOnPlatform: string;
    webhookSecret: string;
    status: 'ACTIVE' | 'PAUSED' | 'ERROR';
    autoAccept: boolean;
    prepTimeMinutes: number;
}

export default function IntegrationsSettings() {
    const { user } = useAuth();
    const { selectedBranchId } = useBranchStore();
    const [integrations, setIntegrations] = useState<IntegrationSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncingMenu, setSyncingMenu] = useState<string | null>(null);

    // Form states
    const [newPlatform, setNewPlatform] = useState<'ZOMATO' | 'SWIGGY' | 'ONDC'>('ZOMATO');
    const [newId, setNewId] = useState('');
    const [newSecret, setNewSecret] = useState('');

    useEffect(() => {
        if (user?.restaurantId) {
            fetchIntegrations();
        }
    }, [user, selectedBranchId]);

    const fetchIntegrations = async () => {
        try {
            setLoading(true);
            const qs = selectedBranchId === 'all' ? '?branchId=all' : `?branchId=${selectedBranchId}`;
            const res = await api.get(`/integrations${qs}`);
            setIntegrations(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedBranchId === 'all') {
            alert('Please select a specific branch to connect a platform.');
            return;
        }

        try {
            await api.post(`/integrations`, {
                branchId: selectedBranchId,
                platform: newPlatform,
                restaurantIdOnPlatform: newId,
                webhookSecret: newSecret,
                autoAccept: true,
                prepTimeMinutes: 30
            });
            fetchIntegrations();
            setNewId('');
            setNewSecret('');
            alert(`Successfully connected ${newPlatform}`);
        } catch (err) {
            console.error(err);
            alert('Failed to configure integration');
        }
    };

    const togglePause = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
        try {
            await api.post(`/integrations/${id}/pause`, { status: nextStatus });
            fetchIntegrations();
        } catch (err) {
            console.error(err);
            alert('Failed to toggle status');
        }
    }

    const syncMenu = async (id: string) => {
        try {
            setSyncingMenu(id);
            await api.post(`/integrations/${id}/sync-menu`);
            alert('Menu synchronization queued successfully! This happens in the background.');
        } catch (e) {
            console.error(e);
            alert('Failed to sync menu');
        } finally {
            setSyncingMenu(null);
        }
    };

    if (loading && integrations.length === 0) return <div className="p-8 flex justify-center text-gray-500">Loading settings...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-gray-900 border-b-4 border-maroon inline-block pb-1 mb-8">
                Third-Party Integrations
            </h1>

            {selectedBranchId === 'all' && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
                    <strong>Note:</strong> You are viewing integrations across all branches. To connect a new platform, please select a specific branch from the top menu.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Save size={20} className="text-maroon"/> Connect New Platform
                    </h2>
                    <form onSubmit={handleSave} className={`bg-white p-6 rounded-xl shadow-sm border space-y-4 ${selectedBranchId === 'all' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700">Platform</label>
                            <select
                                value={newPlatform}
                                onChange={e => setNewPlatform(e.target.value as any)}
                                className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-saffron"
                            >
                                <option value="ZOMATO">Zomato</option>
                                <option value="SWIGGY">Swiggy</option>
                                <option value="ONDC">ONDC (Beckn)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700">Restaurant ID on Platform</label>
                            <input
                                type="text" required
                                value={newId} onChange={e => setNewId(e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-saffron" placeholder="E.g., 123456"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700">Webhook Secret / API Key</label>
                            <input
                                type="password" required
                                value={newSecret} onChange={e => setNewSecret(e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-saffron" placeholder="Token for verification"
                            />
                        </div>
                        <button type="submit" disabled={selectedBranchId === 'all'} className="w-full bg-maroon text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition mt-2">
                            CONNECT PLATFORM
                        </button>
                    </form>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-4">Connected Platforms</h2>
                    {integrations.length === 0 ? (
                        <p className="text-gray-500 italic bg-white p-8 text-center border rounded-xl shadow-sm">No integrations configured for this view.</p>
                    ) : (
                        <div className="space-y-4">
                            {integrations.map(intg => (
                                <div key={intg._id} className="bg-white p-5 rounded-xl shadow-sm border transition hover:shadow-md">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                                                ${intg.platform === 'ZOMATO' ? 'bg-red-600' : intg.platform === 'SWIGGY' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                                                {intg.platform[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{intg.platform}</h3>
                                                <p className="text-xs text-gray-500 font-mono">Store: {intg.restaurantIdOnPlatform}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 font-bold rounded-full border ${intg.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {intg.status}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 border-t pt-4 mt-2">
                                        <button onClick={() => togglePause(intg._id!, intg.status)} className="flex items-center gap-1.5 text-sm font-semibold border px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                                            {intg.status === 'PAUSED' ? <Play size={14}/> : <Pause size={14}/>}
                                            {intg.status === 'PAUSED' ? 'Resume' : 'Pause'}
                                        </button>
                                        <button 
                                            onClick={() => syncMenu(intg._id!)} 
                                            disabled={syncingMenu === intg._id}
                                            className="flex items-center gap-1.5 text-sm font-semibold border border-maroon text-maroon px-3 py-1.5 rounded-lg hover:bg-maroon hover:text-white transition disabled:opacity-50">
                                            <RefreshCw size={14} className={syncingMenu === intg._id ? 'animate-spin' : ''} />
                                            {syncingMenu === intg._id ? 'Syncing...' : 'Sync Menu'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
