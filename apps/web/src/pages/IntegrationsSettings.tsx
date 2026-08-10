import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranchStore } from '../store/branchStore';
import { api } from '../utils/api';
import { RefreshCw, Play, Pause, Save, MessageCircle, Globe, MapPin, List, Trash2 } from 'lucide-react';
import WhatsappTemplateModal from '../components/Settings/WhatsappTemplateModal';

interface Branch {
    _id: string;
    name: string;
}

interface IntegrationSetting {
    _id?: string;
    platform: 'ZOMATO' | 'SWIGGY' | 'ONDC' | 'LOOMIFLOW';
    restaurantIdOnPlatform: string;
    webhookSecret: string;
    status: 'ACTIVE' | 'PAUSED' | 'ERROR';
    autoAccept: boolean;
    prepTimeMinutes: number;
    branchId?: { _id: string; name: string } | null;
}

type BranchScope = 'all' | 'specific' | 'multiple';

export default function IntegrationsSettings() {
    const { user } = useAuth();
    const { selectedBranchId } = useBranchStore();
    const [integrations, setIntegrations] = useState<IntegrationSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncingMenu, setSyncingMenu] = useState<string | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [saving, setSaving] = useState(false);

    // Form states
    const [newPlatform, setNewPlatform] = useState<'ZOMATO' | 'SWIGGY' | 'ONDC' | 'LOOMIFLOW'>('ZOMATO');
    const [newId, setNewId] = useState('');
    const [newSecret, setNewSecret] = useState('');
    const [branchScope, setBranchScope] = useState<BranchScope>('all');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [whatsappModalIntegration, setWhatsappModalIntegration] = useState<string | null>(null);

    useEffect(() => {
        if (user?.restaurantId) {
            fetchIntegrations();
            fetchBranches();
        }
    }, [user, selectedBranchId]);

    const fetchBranches = async () => {
        try {
            const res = await api.get('/branches');
            setBranches(res.data || []);
        } catch (err) {
            console.error('Failed to fetch branches:', err);
        }
    };

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

        if (branchScope === 'specific' && !selectedBranch) {
            alert('Please select a branch.');
            return;
        }
        if (branchScope === 'multiple' && selectedBranches.length === 0) {
            alert('Please select at least one branch.');
            return;
        }

        setSaving(true);
        try {
            const payload: any = {
                platform: newPlatform,
                scope: branchScope,
                restaurantIdOnPlatform: newId,
                webhookSecret: newSecret,
                apiKey: newPlatform === 'LOOMIFLOW' ? newId : undefined,
                apiSecret: newPlatform === 'LOOMIFLOW' ? newSecret : undefined,
                autoAccept: true,
                prepTimeMinutes: 30,
            };

            if (branchScope === 'specific') {
                payload.branchId = selectedBranch;
            } else if (branchScope === 'multiple') {
                payload.branchIds = selectedBranches;
            }

            await api.post(`/integrations`, payload);
            fetchIntegrations();
            setNewId('');
            setNewSecret('');
            setSelectedBranch('');
            setSelectedBranches([]);
            alert(`Successfully connected ${newPlatform === 'LOOMIFLOW' ? 'WhatsApp (LoomiFlow)' : newPlatform}`);
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.error || 'Failed to configure integration');
        } finally {
            setSaving(false);
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

    const handleBranchCheckbox = (branchId: string) => {
        setSelectedBranches(prev =>
            prev.includes(branchId)
                ? prev.filter(id => id !== branchId)
                : [...prev, branchId]
        );
    };

    const getBranchLabel = (intg: IntegrationSetting): string => {
        if (!intg.branchId) return 'All Branches';
        if (typeof intg.branchId === 'object' && intg.branchId.name) return intg.branchId.name;
        return 'Unknown Branch';
    };

    const getBranchBadgeStyle = (intg: IntegrationSetting): string => {
        if (!intg.branchId) return 'bg-blue-50 text-blue-700 border-blue-200';
        return 'bg-purple-50 text-purple-700 border-purple-200';
    };

    if (loading && integrations.length === 0) return <div className="p-8 flex justify-center text-gray-500">Loading settings...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-gray-900 border-b-4 border-maroon inline-block pb-1 mb-8">
                Third-Party Integrations
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Connect New Platform Form ── */}
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Save size={20} className="text-maroon"/> Connect New Platform
                    </h2>
                    <form onSubmit={handleSave} className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                        {/* Platform Selector */}
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
                                <option value="LOOMIFLOW">LoomiFlow (WhatsApp)</option>
                            </select>
                        </div>

                        {/* Branch Scope Selector */}
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Apply to Branches</label>
                            <div className="space-y-2">
                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${branchScope === 'all' ? 'border-maroon bg-red-50 ring-1 ring-maroon' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="branchScope"
                                        value="all"
                                        checked={branchScope === 'all'}
                                        onChange={() => setBranchScope('all')}
                                        className="accent-maroon"
                                    />
                                    <Globe size={16} className="text-blue-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">All Branches</p>
                                        <p className="text-xs text-gray-500">One configuration shared across every branch</p>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${branchScope === 'specific' ? 'border-maroon bg-red-50 ring-1 ring-maroon' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="branchScope"
                                        value="specific"
                                        checked={branchScope === 'specific'}
                                        onChange={() => setBranchScope('specific')}
                                        className="accent-maroon"
                                    />
                                    <MapPin size={16} className="text-purple-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">Specific Branch</p>
                                        <p className="text-xs text-gray-500">Configure for a single branch only</p>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${branchScope === 'multiple' ? 'border-maroon bg-red-50 ring-1 ring-maroon' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="branchScope"
                                        value="multiple"
                                        checked={branchScope === 'multiple'}
                                        onChange={() => setBranchScope('multiple')}
                                        className="accent-maroon"
                                    />
                                    <List size={16} className="text-saffron shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">Multiple Branches</p>
                                        <p className="text-xs text-gray-500">Select specific branches to apply this configuration</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Branch Dropdown (specific) */}
                        {branchScope === 'specific' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-semibold mb-1 text-gray-700">Select Branch</label>
                                <select
                                    value={selectedBranch}
                                    onChange={e => setSelectedBranch(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-saffron"
                                    required
                                >
                                    <option value="">— Choose a branch —</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Branch Multi-select (multiple) */}
                        {branchScope === 'multiple' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-semibold mb-1 text-gray-700">
                                    Select Branches <span className="text-gray-400 font-normal">({selectedBranches.length} selected)</span>
                                </label>
                                <div className="max-h-40 overflow-y-auto border rounded-lg bg-gray-50 p-2 space-y-1">
                                    {branches.map(b => (
                                        <label
                                            key={b._id}
                                            className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors ${selectedBranches.includes(b._id) ? 'bg-maroon/10 text-maroon' : 'hover:bg-gray-100'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedBranches.includes(b._id)}
                                                onChange={() => handleBranchCheckbox(b._id)}
                                                className="accent-maroon rounded"
                                            />
                                            <span className="text-sm font-medium">{b.name}</span>
                                        </label>
                                    ))}
                                    {branches.length === 0 && (
                                        <p className="text-xs text-gray-400 text-center py-2">No branches found</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* API Key / ID */}
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700">
                                {newPlatform === 'LOOMIFLOW' ? 'API Key' : 'Restaurant ID on Platform'}
                            </label>
                            <input
                                type="text" required
                                value={newId} onChange={e => setNewId(e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-saffron" 
                                placeholder={newPlatform === 'LOOMIFLOW' ? "Enter LoomiFlow API Key" : "E.g., 123456"}
                            />
                        </div>

                        {/* API Secret / Webhook Secret */}
                        <div>
                            <label className="block text-sm font-semibold mb-1 text-gray-700">
                                {newPlatform === 'LOOMIFLOW' ? 'API Secret' : 'Webhook Secret / API Key'}
                            </label>
                            <input
                                type="password" required
                                value={newSecret} onChange={e => setNewSecret(e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-saffron" 
                                placeholder="Token for verification"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-maroon text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition mt-2 disabled:opacity-50"
                        >
                            {saving ? 'Connecting...' : 'CONNECT PLATFORM'}
                        </button>
                    </form>
                </div>

                {/* ── Connected Platforms List ── */}
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
                                                ${intg.platform === 'ZOMATO' ? 'bg-red-600' : intg.platform === 'SWIGGY' ? 'bg-orange-500' : intg.platform === 'LOOMIFLOW' ? 'bg-green-500' : 'bg-blue-600'}`}>
                                                {intg.platform[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{intg.platform === 'LOOMIFLOW' ? 'WhatsApp (LoomiFlow)' : intg.platform}</h3>
                                                <p className="text-xs text-gray-500 font-mono">Store: {intg.restaurantIdOnPlatform}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className={`text-xs px-2.5 py-1 font-bold rounded-full border ${intg.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                {intg.status}
                                            </span>
                                            <span className={`text-xs px-2.5 py-1 font-semibold rounded-full border flex items-center gap-1 ${getBranchBadgeStyle(intg)}`}>
                                                {!intg.branchId ? <Globe size={11} /> : <MapPin size={11} />}
                                                {getBranchLabel(intg)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 border-t pt-4 mt-2">
                                        <button onClick={() => togglePause(intg._id!, intg.status)} className="flex items-center gap-1.5 text-sm font-semibold border px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                                            {intg.status === 'PAUSED' ? <Play size={14}/> : <Pause size={14}/>}
                                            {intg.status === 'PAUSED' ? 'Resume' : 'Pause'}
                                        </button>
                                        
                                        {intg.platform !== 'LOOMIFLOW' && (
                                            <button 
                                                onClick={() => syncMenu(intg._id!)} 
                                                disabled={syncingMenu === intg._id}
                                                className="flex items-center gap-1.5 text-sm font-semibold border border-maroon text-maroon px-3 py-1.5 rounded-lg hover:bg-maroon hover:text-white transition disabled:opacity-50">
                                                <RefreshCw size={14} className={syncingMenu === intg._id ? 'animate-spin' : ''} />
                                                {syncingMenu === intg._id ? 'Syncing...' : 'Sync Menu'}
                                            </button>
                                        )}

                                        {intg.platform === 'LOOMIFLOW' && (
                                            <button 
                                                onClick={() => setWhatsappModalIntegration(intg._id!)}
                                                className="flex items-center gap-1.5 text-sm font-semibold border border-green-600 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-600 hover:text-white transition">
                                                <MessageCircle size={14} />
                                                Configure Templates
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {whatsappModalIntegration && (
                <WhatsappTemplateModal
                    integrationId={whatsappModalIntegration}
                    onClose={() => {
                        setWhatsappModalIntegration(null);
                        fetchIntegrations();
                    }}
                />
            )}
        </div>
    );
}
