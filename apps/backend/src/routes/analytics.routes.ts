import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import * as analytics from '../controllers/analytics.controller';

const router: Router = Router();
router.use(requireAuth);
router.use(requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]));

router.get('/live-activity', analytics.liveActivity);
router.get('/dashboard',          analytics.liveDashboard);
router.get('/revenue-trend',      analytics.revenueTrend);
router.get('/hourly-volume',      analytics.hourlyVolume);
router.get('/revenue-by-category',analytics.revenueByCategory);
router.get('/monthly-comparison', analytics.monthlyComparison);
router.get('/sales-report',       analytics.salesReport);
router.get('/gst-report',         analytics.gstReport);
router.get('/gst-report/excel',   analytics.exportGSTExcel);

export default router;
