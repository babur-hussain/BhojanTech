import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Customer } from '../models/Customer';
import { getOrInitSettings } from '../services/loyaltyService';
import { sendOTP } from '../services/smsService';

const OTP_EXPIRY_MINUTES = 10;

// ─── Send OTP (customer mobile login) ────────────────────────────────────────

export const sendCustomerOTP = async (req: Request, res: Response) => {
    try {
        const { phone, restaurantId } = req.body;
        if (!phone || !restaurantId) return res.status(400).json({ error: 'phone and restaurantId required' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Upsert minimal customer record (first-time users who don't have a full profile yet)
        let customer = await Customer.findOne({ restaurantId, phone });
        if (!customer) {
            // Generate referral code
            let referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
            while (await Customer.findOne({ referralCode })) {
                referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
            }
            customer = await Customer.create({
                restaurantId,
                phone,
                name: 'Guest',
                firstVisitDate: new Date(),
                lastVisitDate: new Date(),
                referralCode,
            });
        }

        customer.otp = otp;
        customer.otpExpiresAt = expiresAt;
        await customer.save();

        // Try to send via MSG91 if configured
        const settings = await getOrInitSettings(restaurantId);
        let smsSent = false;
        if (settings.msg91AuthKey) {
            smsSent = await sendOTP(phone, otp, {
                authKey: settings.msg91AuthKey,
                senderId: settings.msg91SenderId,
                language: settings.smsLanguage,
            });
        }

        // In dev/no-MSG91 mode, return OTP in response (remove in production!)
        const devMode = !settings.msg91AuthKey;

        return res.json({
            message: smsSent ? 'OTP sent via SMS' : 'OTP generated (SMS not configured)',
            ...(devMode && { otp }), // only in dev
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Verify OTP and return JWT ────────────────────────────────────────────────

export const verifyCustomerOTP = async (req: Request, res: Response) => {
    try {
        const { phone, restaurantId, otp } = req.body;
        if (!phone || !restaurantId || !otp) return res.status(400).json({ error: 'phone, restaurantId, otp required' });

        const customer = await Customer.findOne({ restaurantId, phone });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        if (!customer.otp || customer.otp !== otp) return res.status(401).json({ error: 'Invalid OTP' });
        if (!customer.otpExpiresAt || customer.otpExpiresAt < new Date()) {
            return res.status(401).json({ error: 'OTP expired' });
        }

        // Clear OTP
        customer.otp = undefined;
        customer.otpExpiresAt = undefined;
        await customer.save();

        const token = jwt.sign(
            { customerId: customer._id, phone: customer.phone, restaurantId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' }
        );

        return res.json({
            token,
            customer: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                tier: customer.tier,
                segment: customer.segment,
                loyaltyPoints: customer.loyaltyPoints,
                referralCode: customer.referralCode,
                birthdayMonth: customer.birthdayMonth,
                favoriteItems: customer.favoriteItems,
                totalVisits: customer.totalVisits,
                totalSpend: customer.totalSpend,
            },
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Customer portal: get my profile (JWT protected) ─────────────────────────

export const getMyProfile = async (req: Request, res: Response) => {
    try {
        const auth = req.headers.authorization?.split(' ')[1];
        if (!auth) return res.status(401).json({ error: 'Unauthorized' });

        const decoded: any = jwt.verify(auth, process.env.JWT_SECRET || 'secret');
        const customer = await Customer.findById(decoded.customerId).select('-otp -otpExpiresAt');
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        return res.json({ customer });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
