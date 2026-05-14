import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { handleAIChatStream, generateDailyInsights, generateMenuSuggestions } from '../services/aiService';
import AIInsight from '../models/AIInsight';
import { AIConversation } from '../models/AIModels';

// Simple in-memory queue to handle rate limits
let activeRequests = 0;
const MAX_CONCURRENT = 5;

export const chatStream = async (req: Request, res: Response) => {
    const { restaurantId, message, messages, sessionId } = req.body;
    if (!restaurantId || (!message && !messages)) {
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
        const inputData = messages || message;
        const sid = sessionId || uuidv4();
        await handleAIChatStream(new mongoose.Types.ObjectId(restaurantId), inputData, sid, (chunk) => {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        });
        res.write(`data: ${JSON.stringify({ sessionId: sid })}\n\n`);
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

export const getConversationsList = async (req: Request, res: Response) => {
    const { restaurantId } = req.query;
    try {
        const conversations = await AIConversation.find({ restaurantId: new mongoose.Types.ObjectId(restaurantId as string) })
            .sort({ updatedAt: -1 })
            .select('sessionId messages updatedAt')
            .lean();

        // Return only summary (first message)
        const summary = conversations.map(c => ({
            sessionId: c.sessionId,
            firstMessage: (c as any).messages && (c as any).messages.length > 0 ? (c as any).messages[0].content : 'New Chat',
            updatedAt: c.updatedAt
        }));

        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};

export const getConversationMessagesHandler = async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    try {
        const conversation = await AIConversation.findOne({ sessionId }).lean();
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
        res.json((conversation as any).messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};
