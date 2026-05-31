import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createMenuItemSchema } from '../validations/schemas';
import { UserRole } from '@restaurant/types';
import * as menuCtrl from '../controllers/menu.controller';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// Public Menu
router.get('/public/:restaurantId', menuCtrl.getPublicMenu);

// All menu routes require authentication
router.use(requireAuth);

// Uploads
router.post('/upload-url', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), menuCtrl.getUploadUrl);
router.post('/upload', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), upload.array('images', 10), menuCtrl.uploadImages);

// Categories
router.get('/categories', menuCtrl.getCategories); // Waiters can read
router.post('/categories', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), menuCtrl.createCategory);
router.put('/categories/:id', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), menuCtrl.updateCategory);
router.delete('/categories/:id', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), menuCtrl.deleteCategory);
router.patch('/categories/:id/availability', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), menuCtrl.updateCategoryAvailability);

// Items
router.get('/items', menuCtrl.getMenuItems); // Waiters can read
router.post('/items', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), validate(createMenuItemSchema), menuCtrl.createMenuItem);
router.put('/items/:id', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), menuCtrl.updateMenuItem);
router.delete('/items/:id', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), menuCtrl.deleteMenuItem);
router.patch('/items/:id/availability', requireRole([UserRole.OWNER, UserRole.BRANCH_MANAGER]), menuCtrl.updateItemAvailability);

// Migration — one-time fix for existing S3 URLs
router.post('/migrate-images', requireRole([UserRole.OWNER]), menuCtrl.migrateImageUrls);

export default router;
