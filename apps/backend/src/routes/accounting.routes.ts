import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '@restaurant/types';
import { getDashboardMetrics, getGSTR1, getGSTR3B, getProfitAndLoss, getInvoiceRegister } from '../controllers/accounting.controller';

const router: Router = Router();

// Accountant module requires REPORTS_VIEW
router.use(requireAuth);
router.use(requirePermission(Permission.REPORTS_VIEW));

router.get('/dashboard', getDashboardMetrics);
router.get('/gstr1', getGSTR1);
router.get('/gstr3b', getGSTR3B);
router.get('/pnl', getProfitAndLoss);
router.get('/invoices', getInvoiceRegister);

export default router;
