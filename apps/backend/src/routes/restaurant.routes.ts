import { Router } from 'express';
import { createRestaurant, getRestaurantInfo, getRestaurantPrintInfo, updateRestaurantInfo } from '../controllers/restaurant.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/', requireAuth, createRestaurant);
router.get('/info', requireAuth, getRestaurantInfo);
router.get('/print-info', requireAuth, getRestaurantPrintInfo);
router.patch('/info', requireAuth, updateRestaurantInfo);

export default router;
