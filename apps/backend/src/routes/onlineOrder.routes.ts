import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.middleware';
import { createOnlineOrderSchema } from '../validations/schemas';
import { createOnlineOrder, verifyPaymentWebhook, getLiveTableOrder, requestBill, payOnlineOrder, getTableInfo, lookupCustomerForOnlineOrder } from '../controllers/onlineOrder.controller';

const router: Router = express.Router();

// Rate limit public order creation to prevent DoS
const orderCreationLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 10, // 10 orders per IP per minute
    message: { error: 'Too many order requests. Please wait.' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

// Rate limit customer lookup to prevent mass enumeration
const lookupLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 20,
    message: { error: 'Too many lookup requests.' },
});

// Public endpoints (customer-facing, no JWT required but rate-limited)
router.get('/:restaurantId/customer/:phone', lookupLimiter, lookupCustomerForOnlineOrder);
router.post('/create', orderCreationLimiter, validate(createOnlineOrderSchema), createOnlineOrder);
router.get('/table-info/:tableId', getTableInfo);
router.get('/table/:tableId', getLiveTableOrder);

// Webhook — authenticated via HMAC signature (no JWT)
router.post('/webhook', verifyPaymentWebhook);

// Order actions — these modify order state, need at least the orderId match
// (Customer identifies via orderId which they received at order creation)
router.post('/:orderId/request-bill', orderCreationLimiter, requestBill);
router.post('/:orderId/pay', orderCreationLimiter, payOnlineOrder);

export default router;
