import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import * as menuCtrl from '../controllers/menu.controller';

const router: Router = Router();

// All menu routes require authentication
router.use(requireAuth);

// Uploads
router.post('/upload-url', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.getUploadUrl);

// Categories
router.get('/categories', menuCtrl.getCategories); // Waiters can read
router.post('/categories', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.createCategory);
router.patch('/categories/:id/availability', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.updateCategoryAvailability);

// Items
router.get('/items', menuCtrl.getMenuItems); // Waiters can read
router.post('/items', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.createMenuItem);
router.put('/items/:id', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.updateMenuItem);
router.patch('/items/:id/availability', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.updateItemAvailability);

export default router;
