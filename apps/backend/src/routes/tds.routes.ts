import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createTdsSchema } from '../validations/schemas';
import { UserRole } from '@restaurant/types';
import { getTdsLogs, createTdsLog, deleteTdsLog } from '../controllers/tds.controller';

const router: Router = Router();
router.use(requireAuth);
router.use(requireRole([UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT]));

router.get('/', getTdsLogs);
router.post('/', validate(createTdsSchema), createTdsLog);
router.delete('/:id', deleteTdsLog);

export default router;
