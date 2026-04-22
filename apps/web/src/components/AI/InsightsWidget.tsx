import React, { useEffect, useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';

interface AIInsight {
    _id: string;
    insightText: string;
    category: string;
    dateGenerated: string;
}

export default function InsightsWidget() {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:8080/api/ai/insights')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setInsights(data);
                }
            })
            .catch(err => console.error("Could not load insights:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="animate-pulse bg-orange-50 h-32 rounded-xl p-4"></div>;
    }

    if (insights.length === 0) {
        return null; // Don't show if no insights
    }

    return (
        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-xl p-6 shadow-sm mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={64} className="text-[#F47E3E]" />
            </div>

            <div className="flex items-center space-x-2 mb-4">
                <div className="bg-[#F47E3E]/10 p-2 rounded-lg">
                    <Lightbulb className="text-[#F47E3E]" size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Daily AI Insights</h3>
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium ml-2 border border-orange-200">New today</span>
            </div>

            <div className="space-y-3 relative z-10">
                {insights.map((insight, idx) => (
                    <div key={insight._id || idx} className="flex items-start space-x-3 bg-white p-3 rounded-lg shadow-sm border border-orange-50/50">
                        <span className="text-[#F47E3E] font-bold text-lg leading-none mt-1">•</span>
                        <p className="text-gray-700 leading-snug">{insight.insightText}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
