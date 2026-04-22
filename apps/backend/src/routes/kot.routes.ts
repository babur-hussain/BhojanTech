import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import * as kotCtrl from '../controllers/kot.controller';

const router: Router = Router();

router.use(requireAuth);

router.get('/active', kotCtrl.getActiveKOTs);
router.patch('/:kotId/items/:itemId/status', requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.KITCHEN_STAFF]), kotCtrl.updateKOTItemStatus);
router.post('/:kotId/notify', requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.KITCHEN_STAFF]), kotCtrl.notifyWaiter);

export default router;
