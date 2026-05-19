import express from 'express';
import { handleZomatoWebhook, handleSwiggyWebhook, handleOndcWebhook, getIntegrations, createIntegration, updateIntegration, toggleIntegrationStatus, getReconciliationReport, syncMenu } from '../controllers/integration.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router: express.Router = express.Router();

router.post('/zomato/webhook/:branchId', handleZomatoWebhook);
router.post('/swiggy/webhook/:branchId', handleSwiggyWebhook);
router.post('/ondc/webhook/:branchId', handleOndcWebhook);

// Protected Management API Routes
router.use(requireAuth);
router.get('/reconciliation', getReconciliationReport);
router.get('/', getIntegrations);
router.post('/', createIntegration);
router.put('/:id', updateIntegration);
router.post('/:id/pause', toggleIntegrationStatus);
router.post('/:id/sync-menu', syncMenu);

export default router;
