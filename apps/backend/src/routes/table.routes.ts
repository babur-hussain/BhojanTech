import express, { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '@restaurant/types';
import * as tableCtrl from '../controllers/table.controller';

const router: Router = express.Router();

router.use(requireAuth);

router.get('/', requirePermission(Permission.TABLE_MANAGE), tableCtrl.getTables);
router.post('/', requirePermission(Permission.TABLE_MANAGE), tableCtrl.createTable);
router.put('/:id', requirePermission(Permission.TABLE_MANAGE), tableCtrl.updateTable);
router.delete('/:id', requirePermission(Permission.TABLE_MANAGE), tableCtrl.deleteTable);
router.patch('/:id/status', requirePermission(Permission.TABLE_MANAGE), tableCtrl.updateTableStatus);

export default router;
