import { Router } from 'express';
import { login, logout, inviteStaff, customerLogin, refreshAccessToken } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginSchema, inviteStaffSchema } from '../validations/schemas';
import { UserRole } from '@restaurant/types';

const router: Router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/customer-login', validate(loginSchema), customerLogin); // Firebase Phone OTP — used by customer PWA
router.post('/logout', requireAuth, logout);
router.post('/invite-staff', requireAuth, requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), validate(inviteStaffSchema), inviteStaff);
router.post('/refresh', refreshAccessToken);

export default router;
