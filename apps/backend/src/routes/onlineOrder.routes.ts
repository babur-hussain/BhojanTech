import express, { Router } from 'express';
import { createOnlineOrder, verifyPaymentWebhook, getLiveTableOrder, requestBill, payOnlineOrder, getTableInfo } from '../controllers/onlineOrder.controller';

const router: Router = express.Router();

router.post('/create', createOnlineOrder);
router.post('/webhook', verifyPaymentWebhook);
router.get('/table-info/:tableId', getTableInfo);
router.get('/table/:tableId', getLiveTableOrder);
router.post('/:orderId/request-bill', requestBill);
router.post('/:orderId/pay', payOnlineOrder);

export default router;
