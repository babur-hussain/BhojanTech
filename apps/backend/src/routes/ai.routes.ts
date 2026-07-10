import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '@restaurant/types';
import * as ai from '../controllers/ai.controller';

const router: Router = Router();
router.use(requireAuth);
router.use(requirePermission(Permission.REPORTS_VIEW));

router.post('/chat',              ai.chat);
router.get('/insights',           ai.getInsights);
router.post('/menu-intelligence', ai.menuIntelligence);
router.get('/conversations',      ai.getConversations);

export default router;
