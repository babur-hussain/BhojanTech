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

// Only users with BRANCH_MANAGE permission can list, create, and update branches
router.use(requirePermission(Permission.BRANCH_MANAGE));

router.get('/', listBranches);
router.post('/', validate(createBranchSchema), createBranch);
router.put('/:id', updateBranch);

export default router;
