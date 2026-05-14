import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import { listBranches, createBranch, updateBranch } from '../controllers/branch.controller';

const router: Router = Router();
router.use(requireAuth);
router.use(requireRole([UserRole.SUPER_OWNER, UserRole.OWNER]));

router.get('/', listBranches);
router.post('/', createBranch);
router.put('/:id', updateBranch);

export default router;
