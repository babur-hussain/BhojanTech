import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '@restaurant/types';
import * as ledgerCtrl from '../controllers/customerLedger.controller';

const router: Router = Router();
router.use(requireAuth);

// Reports (must be before :customerId routes to avoid conflicts)
router.get('/reports/outstanding', requirePermission(Permission.INVOICE_VIEW), ledgerCtrl.getOutstandingReport);
router.get('/reports/collections', requirePermission(Permission.INVOICE_VIEW), ledgerCtrl.getCollectionReport);
router.get('/reports/receivables', requirePermission(Permission.INVOICE_VIEW), ledgerCtrl.getReceivablesSummary);

// Customer-specific
router.get('/statement/:customerId', requirePermission(Permission.INVOICE_VIEW), ledgerCtrl.generateStatement);
router.get('/:customerId/summary', requirePermission(Permission.INVOICE_VIEW), ledgerCtrl.getCustomerAccountSummary);
router.get('/:customerId', requirePermission(Permission.INVOICE_VIEW), ledgerCtrl.getCustomerLedger);

// Actions
router.post('/payment', requirePermission(Permission.INVOICE_CREATE), ledgerCtrl.recordPayment);
router.post('/credit-note', requirePermission(Permission.INVOICE_CREATE), ledgerCtrl.recordCreditNote);
router.post('/advance', requirePermission(Permission.INVOICE_CREATE), ledgerCtrl.recordAdvanceDeposit);
router.post('/apply-advance', requirePermission(Permission.INVOICE_CREATE), ledgerCtrl.applyAdvanceToInvoice);
router.post('/adjustment', requirePermission(Permission.SETTINGS_MANAGE), ledgerCtrl.recordAdjustment);
router.post('/opening-balance', requirePermission(Permission.SETTINGS_MANAGE), ledgerCtrl.recordOpeningBalance);

export default router;
