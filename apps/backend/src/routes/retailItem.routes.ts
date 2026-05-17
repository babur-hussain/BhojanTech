import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/retailItem.controller';

const router: Router = Router();
router.use(requireAuth);

router.get('/barcode/:barcode', ctrl.lookupByBarcode);  // must come before /:id
router.get('/',          ctrl.listRetailItems);
router.post('/',         ctrl.createRetailItem);
router.patch('/:id',     ctrl.updateRetailItem);
router.delete('/:id',    ctrl.deleteRetailItem);
router.post('/:id/stock', ctrl.adjustStock);

export default router;
