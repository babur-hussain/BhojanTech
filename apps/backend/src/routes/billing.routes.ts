import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createRazorpayOrderSchema, finalizeBillSchema } from '../validations/schemas';
import { Permission } from '@restaurant/types';
import * as billingCtrl from '../controllers/billing.controller';

const router: Router = Router();

// Webhook is unauthenticated (Razorpay signs with HMAC, production should verify)
router.post('/razorpay/webhook', billingCtrl.razorpayWebhook);

router.use(requireAuth);

router.get('/preview/:orderId', requirePermission(Permission.INVOICE_VIEW), billingCtrl.previewBill);
router.get('/invoice/:id', requirePermission(Permission.INVOICE_VIEW), billingCtrl.getInvoice);
router.put('/invoice/:id', requirePermission(Permission.INVOICE_EDIT), billingCtrl.updateInvoice);
router.get('/customer/:phone', billingCtrl.billingCustomerLookup);
router.post('/razorpay/order', validate(createRazorpayOrderSchema), requirePermission(Permission.INVOICE_CREATE), billingCtrl.createRazorpayOrder);
router.post('/generate/:orderId', requirePermission(Permission.INVOICE_CREATE), billingCtrl.generateBill);
router.post('/pay', validate(finalizeBillSchema), requirePermission(Permission.INVOICE_CREATE), billingCtrl.processPayment);
router.post('/direct', requirePermission(Permission.INVOICE_CREATE), billingCtrl.createDirectBill);
router.post('/whatsapp/:orderId', requirePermission(Permission.INVOICE_VIEW), billingCtrl.resendWhatsApp);
router.get('/eod', requirePermission(Permission.EOD_REPORT_VIEW), billingCtrl.eodSummary);

export default router;
