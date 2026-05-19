import express, { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import * as tableCtrl from '../controllers/table.controller';

const router: Router = express.Router();

router.use(requireAuth);

router.get('/', tableCtrl.getTables);
router.post('/', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), tableCtrl.createTable);
router.patch('/:id/status', tableCtrl.updateTableStatus);

export default router;
