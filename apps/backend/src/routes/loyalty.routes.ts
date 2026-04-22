import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
    getLoyaltySettings,
    updateLoyaltySettings,
    getCustomerTransactions,
    redeemCustomerPoints,
    getPointsLiability,
} from '../controllers/loyalty.controller';

const router: Router = Router();
router.use(requireAuth);

router.get('/settings', getLoyaltySettings);
router.put('/settings', updateLoyaltySettings);
router.get('/liability', getPointsLiability);
router.get('/:customerId/transactions', getCustomerTransactions);
router.post('/:customerId/redeem', redeemCustomerPoints);

export default router;
