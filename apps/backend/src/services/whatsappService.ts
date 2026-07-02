/**
 * WhatsApp Service — sends messages via LoomiFlow's secured external API.
 *
 * LoomiFlow is a production WhatsApp CRM built on Meta Cloud API.
 * RestaurantSystem calls LoomiFlow's API to send WhatsApp messages
 * (order confirmations, feedback, campaigns, documents).
 *
 * Security:
 *   - HMAC-SHA256 request signing (x-signature header)
 *   - Timestamp replay protection (x-timestamp header)
 *   - API key authentication (x-api-key header)
 *
 * Resilience:
 *   - Exponential backoff retry (3 attempts)
 *   - Circuit breaker pattern (opens after 5 consecutive failures)
 *
 * Required env vars:
 *   LOOMIFLOW_API_URL    — e.g. https://api.loomiflow.com/api/v1/external
 *   LOOMIFLOW_API_KEY    — the factory's public apiKey from LoomiFlow
 *   LOOMIFLOW_API_SECRET — the factory's apiSecret for HMAC signing
 */

import crypto from 'crypto';
import logger from '../utils/logger';
import { Integration } from '../models/Integration';

const LOOMIFLOW_URL = process.env.LOOMIFLOW_API_URL || 'https://whatsappapi.lfvs.in/api/v1/external';
const LOOMIFLOW_API_KEY = process.env.LOOMIFLOW_API_KEY;
const LOOMIFLOW_API_SECRET = process.env.LOOMIFLOW_API_SECRET;

// ─── Circuit Breaker State ────────────────────────────────────────────────────

interface CircuitBreakerState {
    consecutiveFailures: number;
    lastFailureTime: number;
    isOpen: boolean;
}

const CIRCUIT_BREAKER_THRESHOLD = 5; // Open circuit after 5 consecutive failures
const CIRCUIT_BREAKER_RESET_MS = 60_000; // Try again after 60 seconds

const circuitBreaker: CircuitBreakerState = {
    consecutiveFailures: 0,
    lastFailureTime: 0,
    isOpen: false,
};

function isCircuitOpen(): boolean {
    if (!circuitBreaker.isOpen) return false;

    // Check if enough time has passed to attempt a reset (half-open)
    if (Date.now() - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_RESET_MS) {
        circuitBreaker.isOpen = false;
        logger.info('[WhatsApp] Circuit breaker half-open — retrying LoomiFlow');
        return false;
    }

    return true;
}

function recordSuccess(): void {
    circuitBreaker.consecutiveFailures = 0;
    circuitBreaker.isOpen = false;
}

function recordFailure(): void {
    circuitBreaker.consecutiveFailures++;
    circuitBreaker.lastFailureTime = Date.now();

    if (circuitBreaker.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreaker.isOpen = true;
        logger.warn(`[WhatsApp] Circuit breaker OPEN after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures. Will retry in ${CIRCUIT_BREAKER_RESET_MS / 1000}s.`);
    }
}

// ─── Configuration Check ──────────────────────────────────────────────────────

const isConfigured = (): boolean => {
    return !!(LOOMIFLOW_URL && LOOMIFLOW_API_KEY && LOOMIFLOW_API_SECRET);
};

// ─── HMAC Signing ─────────────────────────────────────────────────────────────

function signRequest(
    method: string,
    path: string,
    body: string,
    timestamp: string
): string {
    const stringToSign = `${timestamp}${method}${path}${body}`;
    return crypto
        .createHmac('sha256', LOOMIFLOW_API_SECRET!)
        .update(stringToSign)
        .digest('hex');
}

// ─── Retry with Exponential Backoff ───────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface LoomiFlowResponse {
    success: boolean;
    messageId?: string | null;
    logId?: string;
    error?: string;
    fallback?: boolean;
}

async function callLoomiFlow(
    endpoint: string,
    payload: Record<string, unknown> | null,
    maxRetries = 3,
    customApiKey?: string,
    customApiSecret?: string
): Promise<LoomiFlowResponse> {
    const activeApiKey = customApiKey || LOOMIFLOW_API_KEY;
    const activeApiSecret = customApiSecret || LOOMIFLOW_API_SECRET;

    if (!LOOMIFLOW_URL || !activeApiKey || !activeApiSecret) {
        logger.info(`[WhatsApp] LoomiFlow not configured — message logged: ${JSON.stringify(payload)}`);
        return { success: false, messageId: null, fallback: true };
    }

    if (isCircuitOpen()) {
        logger.warn('[WhatsApp] Circuit breaker is OPEN — skipping LoomiFlow call');
        return { success: false, error: 'Service temporarily unavailable (circuit open)', fallback: true };
    }

    const url = `${LOOMIFLOW_URL}${endpoint}`;
    const method = payload ? 'POST' : 'GET';
    const bodyStr = payload ? JSON.stringify(payload) : '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const timestamp = new Date().toISOString();
            const path = `/api/v1/external${endpoint}`;
            const stringToSign = `${timestamp}${method}${path}${bodyStr}`;
            const signature = crypto
                .createHmac('sha256', activeApiSecret!)
                .update(stringToSign)
                .digest('hex');

            const headers: Record<string, string> = {
                'x-api-key': activeApiKey!,
                'x-timestamp': timestamp,
                'x-signature': signature,
            };
            if (payload) headers['Content-Type'] = 'application/json';

            const response = await fetch(url, {
                method,
                headers,
                body: payload ? bodyStr : undefined,
                signal: AbortSignal.timeout(15000), // 15s timeout per attempt
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'Unable to read error body');

                // Don't retry on client errors (4xx) — these won't fix themselves
                if (response.status >= 400 && response.status < 500) {
                    logger.error(`[WhatsApp] LoomiFlow client error ${response.status}: ${errorBody}`);
                    recordFailure();
                    return { success: false, error: `LoomiFlow API error: ${response.status}` };
                }

                // Server error (5xx) — worth retrying
                throw new Error(`LoomiFlow ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            recordSuccess();
            return data;
        } catch (error: any) {
            const isLastAttempt = attempt === maxRetries;

            if (isLastAttempt) {
                logger.error(`[WhatsApp] All ${maxRetries} attempts failed for ${endpoint}: ${error.message}`);
                recordFailure();
                return { success: false, error: error.message };
            }

            // Exponential backoff: 1s, 2s, 4s...
            const delay = Math.pow(2, attempt - 1) * 1000;
            logger.warn(`[WhatsApp] Attempt ${attempt}/${maxRetries} failed for ${endpoint}. Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    // Should not reach here, but just in case
    return { success: false, error: 'Unknown error during retry loop' };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a plain text WhatsApp message via LoomiFlow.
 */
export const sendWhatsAppNotification = async (
    phoneNumber: string,
    message: string,
    correlationId?: string
): Promise<LoomiFlowResponse> => {
    if (!phoneNumber) return { success: false, error: 'No phone number provided' };

    return callLoomiFlow('/send-message', {
        to: phoneNumber,
        message,
        correlationId: correlationId || crypto.randomUUID(),
    });
};

export const fetchLoomiFlowTemplates = async (apiKey: string, apiSecret: string): Promise<any> => {
    const res = await callLoomiFlow('/templates', null, 3, apiKey, apiSecret);
    return res;
};

/**
 * Send a template WhatsApp message via LoomiFlow.
 * Templates are required for business-initiated conversations (outside the 24h window).
 */
export const sendWhatsAppTemplate = async (
    phoneNumber: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[],
    correlationId?: string,
    customApiKey?: string,
    customApiSecret?: string
): Promise<LoomiFlowResponse> => {
    if (!phoneNumber) return { success: false, error: 'No phone number provided' };

    return callLoomiFlow('/send-template', {
        to: phoneNumber,
        templateName,
        languageCode,
        components,
        correlationId: correlationId || crypto.randomUUID(),
    }, 3, customApiKey, customApiSecret);
};

/**
 * Send a document WhatsApp message via LoomiFlow.
 */
export const sendWhatsAppDocument = async (
    phoneNumber: string,
    documentUrl: string,
    caption: string = '',
    correlationId?: string
): Promise<LoomiFlowResponse> => {
    if (!phoneNumber) return { success: false, error: 'No phone number provided' };

    return callLoomiFlow('/send-document', {
        to: phoneNumber,
        documentUrl,
        caption,
        correlationId: correlationId || crypto.randomUUID(),
    });
};

// ─── Convenience wrappers for specific restaurant events ──────────────────────

export const sendOrderConfirmationWA = async (phone: string, orderId: string, estimatedTime: number) => {
    const msg = `🍽️ Thank you for your order! Your Order ID is #${orderId.slice(-6).toUpperCase()}. Estimated preparation time: ${estimatedTime} mins. We'll notify you when it's ready!`;
    return sendWhatsAppNotification(phone, msg, `order-confirm-${orderId}`);
};

export const sendOrderReadyWA = async (phone: string, orderId: string) => {
    const msg = `🎉 Your order #${orderId.slice(-6).toUpperCase()} is ready! Please collect it from the counter.`;
    return sendWhatsAppNotification(phone, msg, `order-ready-${orderId}`);
};

export const sendFeedbackRequestWA = async (phone: string, feedbackLink: string) => {
    const msg = `How was your dining experience? We'd love your feedback! Rate us here: ${feedbackLink}`;
    return sendWhatsAppNotification(phone, msg);
};

export const sendCampaignWA = async (phone: string, restaurantName: string, offerText: string, validUntil: string) => {
    const msg = `${restaurantName}: ${offerText}. Valid until ${validUntil}. Reply STOP to unsubscribe.`;
    return sendWhatsAppNotification(phone, msg);
};

export const sendStaffInviteWA = async (phone: string, restaurantName: string, inviteLink: string) => {
    const msg = `You've been invited to join ${restaurantName} on BhojanTech POS! Accept your invitation here: ${inviteLink}`;
    return sendWhatsAppNotification(phone, msg, `staff-invite-${phone}`);
};

export const sendInvoiceWA = async (
    phone: string, 
    invoiceUrl: string, 
    invoiceNumber: string,
    context?: { restaurantId?: string, branchId?: string, customerName?: string, amount?: number, date?: Date }
) => {
    if (context?.restaurantId && context?.branchId) {
        try {
            const integration = await Integration.findOne({ 
                restaurantId: context.restaurantId, 
                branchId: context.branchId, 
                platform: 'LOOMIFLOW', 
                status: 'ACTIVE' 
            });

            if (integration && integration.whatsappConfig?.invoiceTemplateName) {
                const config = integration.whatsappConfig;
                const mapping = config.invoiceTemplateMapping || {};
                
                // Map the variables based on the DB mapping config
                const parameters = [];
                for (let i = 1; i <= 10; i++) {
                    const mappedField = mapping[i.toString()];
                    if (!mappedField) break;
                    
                    let text = '';
                    switch (mappedField) {
                        case 'CustomerName': text = context.customerName || 'Customer'; break;
                        case 'InvoiceNumber': text = invoiceNumber; break;
                        case 'InvoiceUrl': text = invoiceUrl; break;
                        case 'Amount': text = context.amount ? context.amount.toString() : '0'; break;
                        case 'Date': text = context.date ? context.date.toLocaleDateString() : new Date().toLocaleDateString(); break;
                        default: text = 'N/A';
                    }
                    parameters.push({ type: 'text', text });
                }

                let components: any[] = [];
                if (parameters.length > 0) {
                    components = [{ type: 'body', parameters }];
                }

                return sendWhatsAppTemplate(
                    phone,
                    config.invoiceTemplateName!,
                    'en',
                    components,
                    `invoice-${invoiceNumber}`,
                    integration.apiKey,
                    integration.apiSecret
                );
            }
        } catch (err) {
            logger.error(`[WhatsApp] Error fetching integration for invoice: ${err}`);
        }
    }

    return sendWhatsAppDocument(phone, invoiceUrl, `Invoice ${invoiceNumber}`, `invoice-${invoiceNumber}`);
};

export const sendLowStockAlertWA = async (phone: string, items: string[]) => {
    const itemList = items.slice(0, 10).join('\n• ');
    const msg = `⚠️ Low Stock Alert!\n\nThe following items are running low:\n• ${itemList}\n\nPlease restock soon.`;
    return sendWhatsAppNotification(phone, msg);
};
