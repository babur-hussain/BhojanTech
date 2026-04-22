import OpenAI from 'openai';
import { Invoice } from '../models/Invoice';
import { InventoryItem } from '../models/InventoryItem';
import mongoose from 'mongoose';
import AIChatLog from '../models/AIChatLog';

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || 'dummy_key'
});

const getModel = () => process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';

export const gatherRestaurantContext = async (restaurantId: mongoose.Types.ObjectId) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Today's Sales
    const todaysInvoices = await Invoice.find({
        restaurantId,
        createdAt: { $gte: startOfDay }
    });
    const todaySales = todaysInvoices.reduce((sum, inv) => sum + inv.grandTotalINR, 0);
    const totalInvoices = todaysInvoices.length;

    // 2. Inventory Levels (Low stock)
    const inventoryItems = await InventoryItem.find({ restaurantId });
    const lowStock = inventoryItems.filter(item => item.currentQty <= item.minThreshold);

    // 3. GST (Month to Date roughly)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthInvoices = await Invoice.find({
        restaurantId,
        createdAt: { $gte: startOfMonth }
    });
    const mtdGST = monthInvoices.reduce((sum, inv) => sum + inv.totalGSTINR, 0);

    // Compile context string
    return `
RESTAURANT SYSTEM DATA:
- Today's Total Sales: ₹${todaySales} (${totalInvoices} orders)
- Low Stock Items: ${lowStock.length > 0 ? lowStock.map(i => `${i.name} (${i.currentQty} ${i.unit})`).join(', ') : 'None'}
- Total Inventory Items Tracked: ${inventoryItems.length}
- MTD GST Collected: ₹${mtdGST}
  `.trim();
};

const SYSTEM_PROMPT = `You are an expert restaurant management consultant for an Indian restaurant. You have deep knowledge of Indian cuisine, Indian GST regulations (CGST/SGST), food cost management, Indian restaurant operations, local festivals and their impact on business (Diwali, Holi, Navratri, Eid, Christmas), and staff management. You are given real-time data from the restaurant and must use it to give specific, actionable, practical advice. When the user writes in Hindi, respond in Hindi. Keep responses concise and practical — restaurant owners are busy people.`;

// Simple rate limit / queue simulation map
const userQueue = new Map<string, boolean>();

export const handleAIChatStream = async (restaurantId: mongoose.Types.ObjectId, userMessage: string, onUpdate: (chunk: string) => void) => {
    const contextStr = await gatherRestaurantContext(restaurantId);
    const fullPrompt = `${contextStr}\n\nUser Question: ${userMessage}`;

    let fullResponse = '';

    const stream = await openai.chat.completions.create({
        model: getModel(),
        max_tokens: 1024,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: fullPrompt }
        ],
        stream: true,
    });

    for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
            fullResponse += text;
            onUpdate(text);
        }
    }

    // Log conversation to MongoDB asynchronously
    AIChatLog.create({
        userMessage,
        aiResponse: fullResponse,
        contextUsed: [contextStr]
    }).catch(err => console.error("Could not save AI chat log:", err));

    return fullResponse;
};

export const generateDailyInsights = async (restaurantId: mongoose.Types.ObjectId) => {
    const contextStr = await gatherRestaurantContext(restaurantId);

    const prompt = `Based on the following data, generate exactly 3 concise, specific, and actionable insights for today. E.g. "Paneer Tikka sales dropped 40% vs last week — consider a promotion" or "Inventory alert: tomatoes will run out in 2 days". Format as 3 clear bullet points using markdown.\n\nData:\n${contextStr}`;

    const response = await openai.chat.completions.create({
        model: getModel(),
        max_tokens: 500,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
    });

    const textResponse = response.choices[0]?.message?.content || '';
    const insights = textResponse.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*')).slice(0, 3);

    let result = insights;
    if (result.length !== 3) {
        result = [
            "Check inventory levels for top moving items.",
            "Consider running promotions during non-peak hours.",
            "Verify staff scheduling matches peak dinner hours."
        ];
    }
    return result.map(i => i.replace(/^[-*]\s*/, '').trim());
};

export const generateMenuSuggestions = async (restaurantId: mongoose.Types.ObjectId, competitorContext: string) => {
    const contextStr = await gatherRestaurantContext(restaurantId);

    const prompt = `Based on the restaurant data and the competitor context provided, suggest which items to add as specials, which slow-moving items to bundle, and optimal pricing.\n\nRestaurant Data:\n${contextStr}\n\nCompetitor Context:\n${competitorContext}`;

    const response = await openai.chat.completions.create({
        model: getModel(),
        max_tokens: 800,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
    });

    const textResponse = response.choices[0]?.message?.content || '';
    return textResponse;
};
