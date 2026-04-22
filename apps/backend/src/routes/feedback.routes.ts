import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
    submitFeedback,
    getFeedbackAlerts,
    resolveFeedback,
    getFeedbackStats,
} from '../controllers/feedback.controller';

const router: Router = Router();

// Public — customer submits via SMS link (no auth)
router.post('/:orderId', submitFeedback);

// Protected — staff/management
router.get('/alerts', requireAuth, getFeedbackAlerts);
router.get('/stats', requireAuth, getFeedbackStats);
router.post('/:id/resolve', requireAuth, resolveFeedback);

export default router;
