import express, { Router } from 'express';
import { createOnlineOrder, verifyPaymentWebhook } from '../controllers/onlineOrder.controller';

const router: Router = express.Router();

router.post('/create', createOnlineOrder);
router.post('/webhook', verifyPaymentWebhook);

export default router;
