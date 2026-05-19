/**
 * WhatsApp Webhook Routes — receives delivery status callbacks from LoomiFlow.
 *
 * LoomiFlow sends POST requests to this endpoint when WhatsApp message
 * delivery status changes (delivered, read, failed).
 *
 * Security: HMAC-SHA256 signature verification using LOOMIFLOW_WEBHOOK_SECRET.
 */
import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger';

const router: RouterType = Router();

const WEBHOOK_SECRET = process.env.LOOMIFLOW_WEBHOOK_SECRET;

/**
 * POST /whatsapp/status-webhook
 * Receives delivery status updates from LoomiFlow.
 *
 * Headers: x-webhook-signature (HMAC-SHA256 of the body)
 * Body: { event, messageId, metaMessageId, to, status, correlationId, timestamp }
 */
router.post('/status-webhook', async (req: Request, res: Response) => {
    try {
        // 1. Verify HMAC signature if webhook secret is configured
        if (WEBHOOK_SECRET) {
            const signature = req.headers['x-webhook-signature'] as string;
            if (!signature) {
                return res.status(401).json({ error: 'Missing webhook signature' });
            }

            const expectedSignature = crypto
                .createHmac('sha256', WEBHOOK_SECRET)
                .update(JSON.stringify(req.body))
                .digest('hex');

            const sigBuffer = Buffer.from(signature, 'hex');
            const expectedBuffer = Buffer.from(expectedSignature, 'hex');

            if (sigBuffer.length !== expectedBuffer.length ||
                !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
                logger.warn('[WhatsApp Webhook] Invalid signature — rejecting');
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }
        }

        // 2. Process the status update
        const { event, messageId, metaMessageId, to, status, correlationId, timestamp } = req.body;

        logger.info(`[WhatsApp Webhook] ${event}: ${status} for ${to} (correlationId: ${correlationId}, meta: ${metaMessageId})`);

        // You can use the correlationId to match back to your order/campaign/etc.
        // Example: if correlationId starts with 'order-confirm-', extract the orderId
        // and update the order's notification status in your database.

        // Respond immediately — LoomiFlow needs a 200 within 10s
        return res.status(200).json({ received: true });
    } catch (error: any) {
        logger.error(`[WhatsApp Webhook] Error: ${error.message}`);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;
