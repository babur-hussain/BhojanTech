import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import { getDashboardMetrics, getGSTR1, getGSTR3B, getProfitAndLoss, getInvoiceRegister } from '../controllers/accounting.controller';

const router: Router = Router();

// Accountant module requires these roles:
router.use(requireAuth);
router.use(requireRole([UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT]));

router.get('/dashboard', getDashboardMetrics);
router.get('/gstr1', getGSTR1);
router.get('/gstr3b', getGSTR3B);
router.get('/pnl', getProfitAndLoss);
router.get('/invoices', getInvoiceRegister);

export default router;
