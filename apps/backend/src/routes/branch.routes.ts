import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createBranchSchema } from '../validations/schemas';
import { Permission } from '@restaurant/types';
import { listBranches, createBranch, updateBranch, selectBranch } from '../controllers/branch.controller';

const router: Router = Router();
router.use(requireAuth);

// Any authenticated user can save their branch selection (syncs across devices)
router.put('/select', selectBranch);

// Any authenticated user can list branches (results scoped in controller)
router.get('/', listBranches);

// Only users with BRANCH_MANAGE permission can create and update branches
router.post('/', requirePermission(Permission.BRANCH_MANAGE), validate(createBranchSchema), createBranch);
router.put('/:id', requirePermission(Permission.BRANCH_MANAGE), updateBranch);

export default router;
