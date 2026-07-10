import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '@restaurant/types';
import * as inv from '../controllers/inventory.controller';

const router: Router = Router();
router.use(requireAuth);

// Items
router.get('/items',                 requirePermission(Permission.INVENTORY_VIEW), inv.getItems);
router.post('/items',                requirePermission(Permission.INVENTORY_CREATE), inv.createItem);
router.put('/items/:id',             requirePermission(Permission.INVENTORY_EDIT), inv.updateItem);
router.delete('/items/:id',          requirePermission(Permission.INVENTORY_DELETE), inv.deleteItem);

// Stock management
router.post('/stock/add',            requirePermission(Permission.INVENTORY_EDIT), inv.addStock);
router.post('/stock/wastage',        inv.logWastage); // all kitchen roles can log

// Suppliers
router.get('/suppliers',             requirePermission(Permission.INVENTORY_VIEW), inv.getSuppliers);
router.post('/suppliers',            requirePermission(Permission.INVENTORY_CREATE), inv.createSupplier);
router.put('/suppliers/:id',         requirePermission(Permission.INVENTORY_EDIT), inv.updateSupplier);

// Alerts
router.get('/alerts/low-stock',      requirePermission(Permission.INVENTORY_VIEW), inv.getLowStockSummary);

// Reports (Excel)
router.get('/reports/purchases',     requirePermission(Permission.REPORTS_VIEW), inv.exportPurchaseReport);
router.get('/reports/wastage',       requirePermission(Permission.REPORTS_VIEW), inv.exportWastageReport);

export default router;
