import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import * as billingCtrl from '../controllers/billing.controller';

const router: Router = Router();

// Webhook is unauthenticated (Razorpay signs with HMAC, production should verify)
router.post('/razorpay/webhook', billingCtrl.razorpayWebhook);

router.use(requireAuth);

router.get('/preview/:orderId', billingCtrl.previewBill);
router.post('/razorpay/order', billingCtrl.createRazorpayOrder);
router.post('/pay', billingCtrl.processPayment);
router.get('/eod', requireRole([UserRole.OWNER, UserRole.MANAGER]), billingCtrl.eodSummary);

export default router;
