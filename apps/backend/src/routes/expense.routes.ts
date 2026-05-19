import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createExpenseSchema } from '../validations/schemas';
import { UserRole } from '@restaurant/types';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expense.controller';

const router: Router = Router();
router.use(requireAuth);
router.use(requireRole([UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.ACCOUNTANT]));

router.get('/', getExpenses);
router.post('/', validate(createExpenseSchema), createExpense);
router.delete('/:id', deleteExpense);

export default router;
