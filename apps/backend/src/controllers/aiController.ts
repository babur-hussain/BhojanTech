import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { handleAIChatStream, generateDailyInsights, generateMenuSuggestions } from '../services/aiService';
import AIInsight from '../models/AIInsight';

// Simple in-memory queue to handle rate limits
let activeRequests = 0;
const MAX_CONCURRENT = 5;

export const chatStream = async (req: Request, res: Response) => {
    const { restaurantId, message } = req.body;
    if (!restaurantId || !message) {
        return res.status(400).json({ error: 'restaurantId and message are required' });
    }

    // Basic queue mechanism
    if (activeRequests >= MAX_CONCURRENT) {
        return res.status(429).json({ error: 'Server is currently handling maximum AI requests. Please try again soon.' });
    }

    activeRequests++;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        await handleAIChatStream(new mongoose.Types.ObjectId(restaurantId), message, (chunk) => {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        });
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err: any) {
        console.error("AI Chat Stream error:", err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    } finally {
        activeRequests--;
    }
};

export const getInsights = async (req: Request, res: Response) => {
    // get latest insights
    try {
        const insights = await AIInsight.find().sort({ dateGenerated: -1 }).limit(3);
        res.json(insights);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch insights' });
    }
};

export const generateMenuSuggestionsHandler = async (req: Request, res: Response) => {
    const { restaurantId, competitorContext } = req.body;
    try {
        const suggestions = await generateMenuSuggestions(new mongoose.Types.ObjectId(restaurantId), competitorContext || '');
        res.json({ suggestions });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate menu suggestions' });
    }
};
