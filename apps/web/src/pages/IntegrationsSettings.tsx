import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

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
    const { accessToken, user } = useAuth();
    const [integrations, setIntegrations] = useState<IntegrationSetting[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [newPlatform, setNewPlatform] = useState<'ZOMATO' | 'SWIGGY' | 'ONDC'>('ZOMATO');
    const [newId, setNewId] = useState('');
    const [newSecret, setNewSecret] = useState('');

    const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

    useEffect(() => {
        if (user?.restaurantId && accessToken) {
            fetchIntegrations();
        }
    }, [user, accessToken]);

    const fetchIntegrations = async () => {
        try {
            const res = await fetch(`${VITE_BACKEND_URL}/api/integrations`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIntegrations(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        try {
            const res = await fetch(`${VITE_BACKEND_URL}/api/integrations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    branchId: user?.branchId || user?.accessibleBranches?.[0], // Simplification for demo
                    platform: newPlatform,
                    restaurantIdOnPlatform: newId,
                    webhookSecret: newSecret,
                    autoAccept: true,
                    prepTimeMinutes: 30
                })
            });
            if (res.ok) {
                fetchIntegrations();
                setNewId('');
                setNewSecret('');
            } else {
                alert('Failed to configure integration');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const togglePause = async (id: string, currentStatus: string) => {
        if (!accessToken) return;
        const nextStatus = currentStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
        try {
            await fetch(`${VITE_BACKEND_URL}/api/integrations/${id}/pause`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ status: nextStatus })
            });
            fetchIntegrations();
        } catch (err) {
            console.error(err);
        }
    }

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-gray-900 border-b-4 border-maroon inline-block pb-1 mb-8">
                Third-Party Integrations
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-bold mb-4">Connect New Platform</h2>
                    <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow border space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Platform</label>
                            <select
                                value={newPlatform}
                                onChange={e => setNewPlatform(e.target.value as any)}
                                className="w-full p-2 border rounded"
                            >
                                <option value="ZOMATO">Zomato</option>
                                <option value="SWIGGY">Swiggy</option>
                                <option value="ONDC">ONDC (Beckn)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Restaurant ID on Platform</label>
                            <input
                                type="text" required
                                value={newId} onChange={e => setNewId(e.target.value)}
                                className="w-full p-2 border rounded" placeholder="E.g., 123456"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Webhook Secret / API Key</label>
                            <input
                                type="password" required
                                value={newSecret} onChange={e => setNewSecret(e.target.value)}
                                className="w-full p-2 border rounded" placeholder="Token for verification"
                            />
                        </div>
                        <button type="submit" className="w-full bg-maroon text-white font-bold py-2 rounded uppercase tracking-wider hover:bg-red-900">
                            Connect
                        </button>
                    </form>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-4">Connected Platforms</h2>
                    {integrations.length === 0 ? (
                        <p className="text-gray-500 italic bg-gray-50 p-4 border rounded">No integrations configured yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {integrations.map(intg => (
                                <div key={intg._id} className="bg-white p-5 rounded-lg shadow border">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg tracking-wider">{intg.platform}</h3>
                                        <span className={`text-xs px-2 py-1 font-bold rounded ${intg.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {intg.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">Store ID: {intg.restaurantIdOnPlatform}</p>
                                    <div className="flex items-center justify-between border-t pt-4">
                                        <button onClick={() => togglePause(intg._id!, intg.status)} className="text-sm font-semibold border px-3 py-1.5 rounded hover:bg-gray-50 transition">
                                            {intg.status === 'PAUSED' ? '▶ Resume Orders' : '⏸ Pause Orders'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* Dummy UI for Menu Synchronisation Status  */}
            <div className="mt-12 opacity-50 pointer-events-none">
                <h2 className="text-xl font-bold mb-4">Menu Synchronization (Coming Soon)</h2>
                <p>Sync all items from your menu to aggregators using BullMQ.</p>
            </div>
        </div>
    );
}
