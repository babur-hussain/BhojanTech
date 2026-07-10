import express, { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createOrderSchema, createTakeawaySchema, addItemsSchema, generateKOTSchema } from '../validations/schemas';
import * as orderCtrl from '../controllers/order.controller';
import { Permission } from '@restaurant/types';

const router: Router = express.Router();

router.use(requireAuth);

router.get('/active', requirePermission(Permission.ORDER_VIEW), orderCtrl.getActiveOrders);
router.get('/all', requirePermission(Permission.ORDER_VIEW), orderCtrl.getAllOrders);
router.post('/', validate(createOrderSchema), requirePermission(Permission.ORDER_MANAGE), orderCtrl.createOrder);
router.post('/takeaway', validate(createTakeawaySchema), requirePermission(Permission.ORDER_MANAGE), orderCtrl.createTakeawayOrder);
router.post('/:id/items', validate(addItemsSchema), requirePermission(Permission.ORDER_MANAGE), orderCtrl.addItemsToOrder);
router.post('/:id/kot', validate(generateKOTSchema), requirePermission(Permission.ORDER_MANAGE), orderCtrl.generateKOT);
router.put('/:id/complete', requirePermission(Permission.ORDER_MANAGE), orderCtrl.completeOrder);

export default router;
