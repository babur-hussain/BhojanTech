import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, X, RefreshCw, Loader2 } from 'lucide-react';

interface MenuIntelligenceModalProps {
    onClose: () => void;
    restaurantId: string;
}

export default function MenuIntelligenceModal({ onClose, restaurantId }: MenuIntelligenceModalProps) {
    const [competitorContext, setCompetitorContext] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string | null>(null);

    const generateSuggestions = async () => {
        setLoading(true);
        try {
            const res = await fetch('https://server.bhojantech.lfvs.in/api/ai/menu-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId, competitorContext })
            });
            const data = await res.json();
            if (data.suggestions) {
                setSuggestions(data.suggestions);
            } else if (data.error) {
                setSuggestions(`**Error:** ${data.error}`);
            }
        } catch (err) {
            setSuggestions("**Error connecting to AI service.**");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-orange-400 to-[#F47E3E] text-white p-6 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <Sparkles size={24} />
                        <h2 className="text-2xl font-bold">AI Menu Intelligence</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col gap-6">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-2">Provide Competitor/Market Context (Optional)</h3>
                        <p className="text-sm text-gray-500 mb-4">Tell Claude about the local competition, upcoming festivals, or target audience to get more tailored menu combo and pricing suggestions.</p>
                        <textarea
                            value={competitorContext}
                            onChange={(e) => setCompetitorContext(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            placeholder="e.g. A new North Indian restaurant opened next door selling cheap thalis. Navratri is coming up next week..."
                            rows={4}
                        />
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={generateSuggestions}
                                disabled={loading}
                                className="flex items-center gap-2 bg-[#F47E3E] hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                {loading ? 'Analyzing Data...' : 'Analyze & Suggest'}
                            </button>
                        </div>
                    </div>

                    {suggestions && (
                        <div className="bg-white p-6 rounded-xl border border-orange-200 shadow-sm">
                            <h3 className="font-bold text-lg text-maroon mb-4 flex items-center gap-2">
                                <Sparkles size={18} className="text-[#F47E3E]" /> Recommendations
                            </h3>
                            <div className="prose prose-orange max-w-none text-gray-700">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{suggestions}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
