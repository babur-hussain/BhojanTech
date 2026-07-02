import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { X, RefreshCw, Save } from 'lucide-react';

interface Props {
    integrationId: string;
    onClose: () => void;
}

export default function WhatsappTemplateModal({ integrationId, onClose }: Props) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Config state
    const [invoiceTemplateName, setInvoiceTemplateName] = useState('');
    const [invoiceMapping, setInvoiceMapping] = useState<Record<string, string>>({});

    const [bookingTemplateName, setBookingTemplateName] = useState('');
    const [bookingMapping, setBookingMapping] = useState<Record<string, string>>({});

    const MAPPABLE_FIELDS = [
        'CustomerName', 'InvoiceNumber', 'InvoiceUrl', 'Amount', 'Date'
    ];

    useEffect(() => {
        fetchTemplates();
        fetchIntegrationConfig();
    }, [integrationId]);

    const fetchIntegrationConfig = async () => {
        try {
            // Re-fetch integration to get its whatsappConfig
            const res = await api.get(`/integrations`);
            const intg = res.data.find((i: any) => i._id === integrationId);
            if (intg?.whatsappConfig) {
                setInvoiceTemplateName(intg.whatsappConfig.invoiceTemplateName || '');
                setInvoiceMapping(intg.whatsappConfig.invoiceTemplateMapping || {});
                setBookingTemplateName(intg.whatsappConfig.bookingTemplateName || '');
                setBookingMapping(intg.whatsappConfig.bookingTemplateMapping || {});
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/integrations/${integrationId}/whatsapp-templates`);
            setTemplates(res.data?.data || []);
        } catch (err) {
            console.error(err);
            alert('Failed to fetch templates. Check your LoomiFlow credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put(`/integrations/${integrationId}`, {
                whatsappConfig: {
                    invoiceTemplateName,
                    invoiceTemplateMapping: invoiceMapping,
                    bookingTemplateName,
                    bookingTemplateMapping: bookingMapping,
                }
            });
            alert('WhatsApp configuration saved successfully!');
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to save configuration.');
        } finally {
            setSaving(false);
        }
    };

    const renderMappingForm = (
        type: 'Invoice' | 'Booking', 
        templateName: string, 
        setTemplateName: any, 
        mapping: Record<string, string>, 
        setMapping: any
    ) => {
        const selectedTemplate = templates.find(t => t.name === templateName);
        
        let requiredVariables = 0;
        if (selectedTemplate) {
            // Find body component and count variables like {{1}}
            const bodyComponent = selectedTemplate.components.find((c: any) => c.type === 'BODY');
            if (bodyComponent && bodyComponent.text) {
                const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
                if (matches) {
                    requiredVariables = matches.length;
                }
            }
        }

        return (
            <div className="bg-gray-50 p-4 rounded-xl border mb-4">
                <h3 className="font-bold mb-3">{type} Template</h3>
                <select 
                    value={templateName}
                    onChange={(e) => {
                        setTemplateName(e.target.value);
                        setMapping({}); // reset mapping on template change
                    }}
                    className="w-full p-2.5 bg-white border rounded-lg mb-4"
                >
                    <option value="">-- Select Template --</option>
                    {templates.map(t => (
                        <option key={t.name} value={t.name}>{t.name} ({t.language})</option>
                    ))}
                </select>

                {requiredVariables > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Map Template Variables:</p>
                        {Array.from({ length: requiredVariables }).map((_, i) => {
                            const indexStr = (i + 1).toString();
                            return (
                                <div key={i} className="flex items-center gap-4">
                                    <span className="font-mono bg-white px-2 py-1 border rounded text-sm text-gray-500">
                                        {`{{${indexStr}}}`}
                                    </span>
                                    <span>➔</span>
                                    <select
                                        value={mapping[indexStr] || ''}
                                        onChange={(e) => setMapping({ ...mapping, [indexStr]: e.target.value })}
                                        className="flex-1 p-2 bg-white border rounded text-sm"
                                    >
                                        <option value="">-- Map Field --</option>
                                        {MAPPABLE_FIELDS.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-2xl font-bold">Configure WhatsApp Templates</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-gray-600">
                            Map LoomiFlow templates to RestaurantOS events. Ensure your API keys are correct.
                        </p>
                        <button 
                            onClick={fetchTemplates} 
                            disabled={loading}
                            className="flex items-center gap-2 text-sm font-bold text-maroon hover:bg-maroon hover:text-white px-3 py-1.5 border border-maroon rounded-lg transition disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh Templates
                        </button>
                    </div>

                    {renderMappingForm('Invoice', invoiceTemplateName, setInvoiceTemplateName, invoiceMapping, setInvoiceMapping)}
                    {renderMappingForm('Booking', bookingTemplateName, setBookingTemplateName, bookingMapping, setBookingMapping)}
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 font-bold text-white bg-maroon hover:bg-opacity-90 rounded-lg transition disabled:opacity-50"
                    >
                        <Save size={18} />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
