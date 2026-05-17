import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import * as menuCtrl from '../controllers/menu.controller';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// Public Menu
router.get('/public/:restaurantId', menuCtrl.getPublicMenu);

// All menu routes require authentication
router.use(requireAuth);

// Uploads
router.post('/upload-url', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.getUploadUrl);
router.post('/upload', requireRole([UserRole.OWNER, UserRole.MANAGER]), upload.array('images', 10), menuCtrl.uploadImages);

// Categories
router.get('/categories', menuCtrl.getCategories); // Waiters can read
router.post('/categories', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.createCategory);
router.put('/categories/:id', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.updateCategory);
router.delete('/categories/:id', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.deleteCategory);
router.patch('/categories/:id/availability', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.updateCategoryAvailability);

// Items
router.get('/items', menuCtrl.getMenuItems); // Waiters can read
router.post('/items', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.createMenuItem);
router.put('/items/:id', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.updateMenuItem);
router.delete('/items/:id', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.deleteMenuItem);
router.patch('/items/:id/availability', requireRole([UserRole.OWNER, UserRole.MANAGER]), menuCtrl.updateItemAvailability);

export default router;
