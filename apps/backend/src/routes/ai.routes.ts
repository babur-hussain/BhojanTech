import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import * as ai from '../controllers/ai.controller';

const router: Router = Router();
router.use(requireAuth);
router.use(requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]));

router.post('/chat',              ai.chat);
router.get('/insights',           ai.getInsights);
router.post('/menu-intelligence', ai.menuIntelligence);
router.get('/conversations',      ai.getConversations);

export default router;
