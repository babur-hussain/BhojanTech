import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '@restaurant/types';
import * as analytics from '../controllers/analytics.controller';

const router: Router = Router();
router.use(requireAuth);
// Allow either REPORTS_VIEW or DASHBOARD_VIEW for these endpoints since the dashboard uses them
router.use(requirePermission([Permission.REPORTS_VIEW, Permission.DASHBOARD_VIEW]));

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
