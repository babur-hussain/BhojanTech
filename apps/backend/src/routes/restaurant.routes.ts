import { Router } from 'express';
import { createRestaurant, getRestaurantInfo, updateRestaurantInfo } from '../controllers/restaurant.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/', requireAuth, createRestaurant);
router.get('/info', requireAuth, getRestaurantInfo);
router.patch('/info', requireAuth, updateRestaurantInfo);

export default router;
