import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '@restaurant/types';
import * as kotCtrl from '../controllers/kot.controller';

const router: Router = Router();

router.use(requireAuth);

router.get('/active', requirePermission(Permission.KITCHEN_DISPLAY_ACCESS), kotCtrl.getActiveKOTs);
router.patch('/:kotId/items/:itemId/status', requirePermission(Permission.KITCHEN_DISPLAY_ACCESS), kotCtrl.updateKOTItemStatus);
router.post('/:kotId/notify', requirePermission(Permission.KITCHEN_DISPLAY_ACCESS), kotCtrl.notifyWaiter);

export default router;
