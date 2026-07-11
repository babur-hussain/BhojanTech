import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { getOrInitSettings } from '../services/loyaltyService';
import { sendOTP } from '../services/smsService';

const OTP_EXPIRY_MINUTES = 10;
const OTP_HASH_ROUNDS = 10;

// ─── Send OTP (customer mobile login) ────────────────────────────────────────

export const sendCustomerOTP = async (req: Request, res: Response) => {
    try {
        const { phone, restaurantId } = req.body;
        if (!phone || !restaurantId) return res.status(400).json({ error: 'phone and restaurantId required' });

        // Validate phone format (10 digits, Indian mobile)
        if (!/^[6-9]\d{9}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Cryptographically secure OTP generation
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Hash OTP before storing (never store plaintext)
        const hashedOtp = await bcrypt.hash(otp, OTP_HASH_ROUNDS);

        // Upsert minimal customer record (first-time users who don't have a full profile yet)
        let customer = await Customer.findByPhone(restaurantId, phone);
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

        customer.otp = hashedOtp;
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

        // SECURITY: Never return OTP in response, even in dev mode
        return res.json({
            message: smsSent ? 'OTP sent via SMS' : 'OTP generated (SMS not configured — check server logs)',
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

        const customer = await Customer.findByPhone(restaurantId, phone);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        if (!customer.otp || !customer.otpExpiresAt) {
            return res.status(401).json({ error: 'No OTP pending. Request a new one.' });
        }

        if (customer.otpExpiresAt < new Date()) {
            customer.otp = undefined;
            customer.otpExpiresAt = undefined;
            await customer.save();
            return res.status(401).json({ error: 'OTP expired' });
        }

        // Compare submitted OTP with hashed version
        const isMatch = await bcrypt.compare(otp, customer.otp);
        if (!isMatch) return res.status(401).json({ error: 'Invalid OTP' });

        // Clear OTP
        customer.otp = undefined;
        customer.otpExpiresAt = undefined;
        await customer.save();

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        const token = jwt.sign(
            { customerId: customer._id, phone: customer.phone, restaurantId, type: 'customer' },
            JWT_SECRET,
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

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) return res.status(500).json({ error: 'Server misconfiguration' });

        const decoded: any = jwt.verify(auth, JWT_SECRET);
        const customer = await Customer.findById(decoded.customerId).select('-otp -otpExpiresAt');
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        return res.json({ customer });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ─── Customer portal: update my profile (JWT protected) ──────────────────────

export const updateMyProfile = async (req: Request, res: Response) => {
    try {
        const auth = req.headers.authorization?.split(' ')[1];
        if (!auth) return res.status(401).json({ error: 'Unauthorized' });

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) return res.status(500).json({ error: 'Server misconfiguration' });

        const decoded: any = jwt.verify(auth, JWT_SECRET);
        const { name, dob } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Name is required' });
        }

        const customer = await Customer.findById(decoded.customerId);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        customer.name = name;
        if (dob) {
            customer.dob = new Date(dob);
            customer.birthdayMonth = customer.dob.getMonth() + 1; // 1-12
        }

        await customer.save();

        return res.json({ message: 'Profile updated successfully', customer });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to update profile' });
    }
};

// ─── Customer portal: get my orders (JWT protected) ──────────────────────────

export const getMyOrders = async (req: Request, res: Response) => {
    try {
        const auth = req.headers.authorization?.split(' ')[1];
        if (!auth) return res.status(401).json({ error: 'Unauthorized' });

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) return res.status(500).json({ error: 'Server misconfiguration' });

        const decoded: any = jwt.verify(auth, JWT_SECRET);
        
        const orders = await Order.find({ customerPhone: decoded.phone, status: { $ne: 'OPEN' } })
            .sort({ createdAt: -1 })
            .populate('items.menuItemId', 'name price imageUrl')
            .lean();

        return res.json({ orders });
    } catch (err) {
        console.error('getMyOrders Error:', err);
        return res.status(500).json({ error: 'Failed to fetch orders' });
    }
};
