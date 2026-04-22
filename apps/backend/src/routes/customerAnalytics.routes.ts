import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getCustomerAnalytics } from '../controllers/customerAnalytics.controller';

const router: Router = Router();
router.use(requireAuth);

router.get('/', getCustomerAnalytics);

export default router;
