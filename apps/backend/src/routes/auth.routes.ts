import { Router } from 'express';
import { login, logout, inviteStaff } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';

const router: Router = Router();

router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.post('/invite-staff', requireAuth, requireRole([UserRole.OWNER, UserRole.MANAGER]), inviteStaff);

export default router;
