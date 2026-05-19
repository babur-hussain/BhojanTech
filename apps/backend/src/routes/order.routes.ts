import express, { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createOrderSchema, createTakeawaySchema, addItemsSchema, generateKOTSchema } from '../validations/schemas';
import * as orderCtrl from '../controllers/order.controller';
import { UserRole } from '@restaurant/types';

const router: Router = express.Router();

router.use(requireAuth);

router.get('/active', orderCtrl.getActiveOrders);
router.get('/all', orderCtrl.getAllOrders);
router.post('/', validate(createOrderSchema), orderCtrl.createOrder);
router.post('/takeaway', validate(createTakeawaySchema), orderCtrl.createTakeawayOrder);
router.post('/:id/items', validate(addItemsSchema), orderCtrl.addItemsToOrder);
router.post('/:id/kot', validate(generateKOTSchema), orderCtrl.generateKOT);

export default router;
