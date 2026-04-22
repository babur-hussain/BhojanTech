import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.middleware';
import { AIConversation, AIInsight } from '../models/AIModels';
import {
  buildRestaurantContext,
  streamChatResponse,
  generateMenuSuggestions,
} from '../services/claude.service';

// ─── Stream Chat ──────────────────────────────────────────────────────────────

export const chat = async (req: AuthRequest, res: Response) => {
  try {
    const { messages, sessionId = uuidv4() } = req.body;
    const restaurantId = req.user!.restaurantId!;

    if (!messages?.length) return res.status(400).json({ error: 'messages required' });

    // Fetch live context
    const context = await buildRestaurantContext(restaurantId);

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let fullResponse = '';

    await streamChatResponse(
      messages,
      context,
      (chunk) => {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      },
      async (totalTokens) => {
        res.write(`data: ${JSON.stringify({ type: 'done', totalTokens })}\n\n`);

        // Log conversation to MongoDB
        try {
          await AIConversation.findOneAndUpdate(
            { restaurantId, sessionId },
            {
              $push: {
                messages: [
                  ...messages.map((m: any) => ({ ...m, timestamp: new Date() })),
                  { role: 'assistant', content: fullResponse, timestamp: new Date(), tokensUsed: totalTokens },
                ],
              },
              $set: { contextSnapshot: context, restaurantId, userId: req.user!.userId, sessionId },
              $inc: { totalTokens },
            },
            { upsert: true, new: true }
          );
        } catch (logErr) { console.error('Failed to log AI conversation:', logErr); }

        res.end();
      }
    );
  } catch (err: any) {
    console.error('AI chat error:', err);
    if (!res.headersSent) return res.status(500).json({ error: 'AI service error' });
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
};

// ─── Get Daily Insights ───────────────────────────────────────────────────────

export const getInsights = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId!;
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    const existing = await AIInsight.findOne({ restaurantId, date });
    if (existing) return res.json(existing);

    // Generate on-demand if not yet run today
    const { buildRestaurantContext, generateDailyInsights } = await import('../services/claude.service');
    const context = await buildRestaurantContext(restaurantId);
    const jsonText = await generateDailyInsights(restaurantId, context);

    const insights = JSON.parse(jsonText);
    const doc = await AIInsight.findOneAndUpdate(
      { restaurantId, date },
      { $set: { insights, generatedAt: new Date() } },
      { upsert: true, new: true }
    );
    return res.json(doc);
  } catch (err) {
    console.error('Insights error:', err);
    return res.status(500).json({ error: 'Failed to generate insights' });
  }
};

// ─── Menu Intelligence ────────────────────────────────────────────────────────

export const menuIntelligence = async (req: AuthRequest, res: Response) => {
  try {
    const { ownerNote = 'No additional context' } = req.body;
    const restaurantId = req.user!.restaurantId!;
    const context = await buildRestaurantContext(restaurantId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const { streamChatResponse } = await import('../services/claude.service');
    const menuPrompt = `Menu intelligence request. Owner note: ${ownerNote}`;

    await streamChatResponse(
      [{ role: 'user', content: menuPrompt }],
      context,
      (chunk) => res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`),
      () => { res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`); res.end(); }
    );
  } catch (err: any) {
    if (!res.headersSent) return res.status(500).json({ error: 'AI error' });
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
};

// ─── Get Conversation History ─────────────────────────────────────────────────

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await AIConversation.find({
      restaurantId: String(req.user!.restaurantId),
      ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: String(req.query.branchId) } : {}),
    }).sort('-createdAt').limit(50).select('-contextSnapshot');
    return res.json(conversations);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};
