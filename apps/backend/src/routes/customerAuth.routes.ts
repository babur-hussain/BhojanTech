import { Router } from 'express';
import { sendCustomerOTP, verifyCustomerOTP, getMyProfile } from '../controllers/customerAuth.controller';

const router: Router = Router();

router.post('/send-otp', sendCustomerOTP);
router.post('/verify-otp', verifyCustomerOTP);
router.get('/me', getMyProfile);

export default router;
