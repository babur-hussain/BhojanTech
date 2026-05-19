import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.middleware';
import { sendOTPSchema, verifyOTPSchema } from '../validations/schemas';
import { sendCustomerOTP, verifyCustomerOTP, getMyProfile } from '../controllers/customerAuth.controller';

const router: Router = Router();

// Strict rate limiting for OTP endpoints to prevent brute-force and SMS bombing
const otpSendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // 5 OTP sends per IP per 15 mins
    message: { error: 'Too many OTP requests. Please wait 15 minutes.' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // 10 verify attempts per IP per 15 mins
    message: { error: 'Too many verification attempts. Please wait 15 minutes.' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

router.post('/send-otp', otpSendLimiter, validate(sendOTPSchema), sendCustomerOTP);
router.post('/verify-otp', otpVerifyLimiter, validate(verifyOTPSchema), verifyCustomerOTP);
router.get('/me', getMyProfile);

export default router;
