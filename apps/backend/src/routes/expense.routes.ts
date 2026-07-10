import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createExpenseSchema } from '../validations/schemas';
import { Permission } from '@restaurant/types';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expense.controller';

const router: Router = Router();
router.use(requireAuth);

router.get('/', requirePermission(Permission.REPORTS_VIEW), getExpenses);
router.post('/', requirePermission(Permission.SETTINGS_MANAGE), validate(createExpenseSchema), createExpense);
router.delete('/:id', requirePermission(Permission.SETTINGS_MANAGE), deleteExpense);

export default router;
