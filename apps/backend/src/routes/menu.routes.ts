import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createMenuItemSchema } from '../validations/schemas';
import { Permission } from '@restaurant/types';
import * as menuCtrl from '../controllers/menu.controller';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// Public Menu
router.get('/public/:restaurantId', menuCtrl.getPublicMenu);

// All menu routes require authentication
router.use(requireAuth);

// Uploads
router.post('/upload-url', requirePermission(Permission.MENU_CREATE), menuCtrl.getUploadUrl);
router.post('/upload', requirePermission(Permission.MENU_CREATE), upload.array('images', 10), menuCtrl.uploadImages);

// Categories
router.get('/categories', requirePermission(Permission.MENU_VIEW), menuCtrl.getCategories); // Waiters can read
router.post('/categories', requirePermission(Permission.MENU_CREATE), menuCtrl.createCategory);
router.put('/categories/:id', requirePermission(Permission.MENU_EDIT), menuCtrl.updateCategory);
router.delete('/categories/:id', requirePermission(Permission.MENU_DELETE), menuCtrl.deleteCategory);
router.patch('/categories/:id/availability', requirePermission(Permission.MENU_EDIT), menuCtrl.updateCategoryAvailability);

// Items
router.get('/items', requirePermission(Permission.MENU_VIEW), menuCtrl.getMenuItems); // Waiters can read
router.post('/items', requirePermission(Permission.MENU_CREATE), validate(createMenuItemSchema), menuCtrl.createMenuItem);
router.put('/items/:id', requirePermission(Permission.MENU_EDIT), menuCtrl.updateMenuItem);
router.delete('/items/:id', requirePermission(Permission.MENU_DELETE), menuCtrl.deleteMenuItem);
router.patch('/items/:id/availability', requirePermission(Permission.MENU_EDIT), menuCtrl.updateItemAvailability);

// Migration — one-time fix for existing S3 URLs
router.post('/migrate-images', requirePermission(Permission.SETTINGS_MANAGE), menuCtrl.migrateImageUrls);

export default router;
