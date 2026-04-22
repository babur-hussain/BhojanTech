import express, { Router } from 'express';
import { generateTableQrCodeSVG, downloadAllTableQRsPDF } from '../controllers/qrController';
import { requireAuth as authenticate } from '../middleware/auth.middleware';

const router: Router = express.Router();

// Public: Fetch specific QR as SVG image
router.get('/table-sv/:tableId', generateTableQrCodeSVG);

// Protected: Owner downloads all QR codes as a PDF grid
router.get('/download/restaurant/:restaurantId', authenticate, downloadAllTableQRsPDF);

export default router;
