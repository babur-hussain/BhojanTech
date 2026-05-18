import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/retailItem.controller';

const router: Router = Router();
router.use(requireAuth);

// ── Barcode-specific (must come before /:id routes) ───────────────────────────
router.get('/barcode/:barcode',         ctrl.lookupByBarcode);      // lookup item by barcode
router.post('/barcode/:barcode/receive', ctrl.receiveStockByBarcode); // GRN receive by barcode (scanner flow)

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/',          ctrl.listRetailItems);
router.post('/',         ctrl.createRetailItem);   // returns 409 if barcode already exists
router.patch('/:id',     ctrl.updateRetailItem);
router.delete('/:id',    ctrl.deleteRetailItem);

// ── Stock operations ──────────────────────────────────────────────────────────
router.post('/:id/stock',     ctrl.adjustStock);    // manual +/- with audit log
router.get('/:id/stock-log',  ctrl.getStockLog);    // paginated audit trail

export default router;
