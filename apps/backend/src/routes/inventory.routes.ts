import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@restaurant/types';
import * as inv from '../controllers/inventory.controller';

const router: Router = Router();
router.use(requireAuth);

// Items
router.get('/items',                 inv.getItems);
router.post('/items',                requireRole([UserRole.OWNER, UserRole.MANAGER]), inv.createItem);
router.put('/items/:id',             requireRole([UserRole.OWNER, UserRole.MANAGER]), inv.updateItem);
router.delete('/items/:id',          requireRole([UserRole.OWNER, UserRole.MANAGER]), inv.deleteItem);

// Stock management
router.post('/stock/add',            requireRole([UserRole.OWNER, UserRole.MANAGER]), inv.addStock);
router.post('/stock/wastage',        inv.logWastage); // all kitchen roles can log

// Suppliers
router.get('/suppliers',             inv.getSuppliers);
router.post('/suppliers',            requireRole([UserRole.OWNER, UserRole.MANAGER]), inv.createSupplier);
router.put('/suppliers/:id',         requireRole([UserRole.OWNER, UserRole.MANAGER]), inv.updateSupplier);

// Alerts
router.get('/alerts/low-stock',      inv.getLowStockSummary);

// Reports (Excel)
router.get('/reports/purchases',     requireRole([UserRole.OWNER, UserRole.MANAGER]), inv.exportPurchaseReport);
router.get('/reports/wastage',       requireRole([UserRole.OWNER, UserRole.MANAGER]), inv.exportWastageReport);

export default router;
