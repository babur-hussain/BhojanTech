import express, { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as orderCtrl from '../controllers/order.controller';
import { UserRole } from '@restaurant/types';

const router: Router = express.Router();

router.use(requireAuth);

router.get('/active', orderCtrl.getActiveOrders);
router.get('/all', orderCtrl.getAllOrders);
router.post('/', orderCtrl.createOrder);
router.post('/takeaway', orderCtrl.createTakeawayOrder);
router.post('/:id/items', orderCtrl.addItemsToOrder);
router.post('/:id/kot', orderCtrl.generateKOT);

export default router;
