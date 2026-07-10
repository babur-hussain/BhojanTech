import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createTdsSchema } from '../validations/schemas';
import { Permission } from '@restaurant/types';
import { getTdsLogs, createTdsLog, deleteTdsLog } from '../controllers/tds.controller';

const router: Router = Router();
router.use(requireAuth);

router.get('/', requirePermission(Permission.REPORTS_VIEW), getTdsLogs);
router.post('/', requirePermission(Permission.SETTINGS_MANAGE), validate(createTdsSchema), createTdsLog);
router.delete('/:id', requirePermission(Permission.SETTINGS_MANAGE), deleteTdsLog);

export default router;
