import { Router } from 'express';
import { downloadInvoicePDF } from '../../controllers/public.controller';

const router: Router = Router();

// Public route to view/download invoice PDF
// This is used by WhatsApp Cloud API / LoomiFlow to fetch the document
router.get('/invoice/:id/pdf', downloadInvoicePDF);

export default router;
