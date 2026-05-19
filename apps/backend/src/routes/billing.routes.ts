import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createRazorpayOrderSchema, finalizeBillSchema } from '../validations/schemas';
import { UserRole } from '@restaurant/types';
import * as billingCtrl from '../controllers/billing.controller';

const router: Router = Router();

// Webhook is unauthenticated (Razorpay signs with HMAC, production should verify)
router.post('/razorpay/webhook', billingCtrl.razorpayWebhook);

router.use(requireAuth);

router.get('/preview/:orderId', billingCtrl.previewBill);
router.get('/invoice/:id', billingCtrl.getInvoice);
router.get('/customer/:phone', billingCtrl.billingCustomerLookup);
router.post('/razorpay/order', validate(createRazorpayOrderSchema), billingCtrl.createRazorpayOrder);
router.post('/generate/:orderId', billingCtrl.generateBill);
router.post('/pay', validate(finalizeBillSchema), billingCtrl.processPayment);
router.post('/direct', billingCtrl.createDirectBill);
router.get('/eod', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), billingCtrl.eodSummary);

export default router;
