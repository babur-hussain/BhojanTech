import { Request, Response } from 'express';
import crypto from 'crypto';
import { firebaseAdmin } from '../config/firebase';
import { User } from '../models/User';
import { generateTokens, verifyToken, verifyRefreshToken } from '../utils/jwt';
import { UserRole } from '@restaurant/types';
import { redis } from '../config/redis';
import jwt from 'jsonwebtoken';
import { sendStaffInviteWA } from '../services/whatsappService';
import { Customer } from '../models/Customer';

export const login = async (req: Request, res: Response) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ error: 'Firebase token is required' });
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(firebaseToken);
    const { uid, email, phone_number } = decodedToken;

    let user = await User.findOne({ firebaseUid: uid });

    // Also check if a user was pre-created via phone invite but hasn't linked firebaseUid
    if (!user && phone_number) {
      user = await User.findOne({ phoneNumber: phone_number });
      if (user) {
        user.firebaseUid = uid;
        await user.save();
      }
    }

    if (!user) {
      try {
        // Create new user, default to OWNER for new signups
        user = await User.create({
          firebaseUid: uid,
          email,
          phoneNumber: phone_number,
          role: UserRole.OWNER,
        });
      } catch (createError: any) {
        // If creation failed due to duplicate key, someone else just created it
        if (createError.code === 11000) {
          user = await User.findOne({ firebaseUid: uid });
          if (!user) throw createError; // Should not happen
        } else {
          throw createError;
        }
      }
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'User account is deactivated' });
    }

    const payload = {
      userId: user.id,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId?.toString(),
      branchId: user.branchId?.toString(),
      accessibleBranches: user.accessibleBranches?.map((b: any) => b.toString()),
      permissions: user.permissions || [],
    };

    const tokens = generateTokens(payload);

    return res.status(200).json({
      user: {
        id: user.id,
        role: user.role,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        name: user.name,
        selectedBranchId: user.selectedBranchId || null,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
};

// devLogin removed — was a security backdoor that granted SUPER_OWNER without authentication

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Blacklist token in Redis for 2 hours (access token expires in 1h + safety buffer)
    await redis.setex(`bl_${token}`, 7200, 'true');

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error during logout' });
  }
};

/**
 * Customer Phone OTP Login
 * -------------------------
 * 1. Receives a Firebase ID token obtained after phone OTP verification on the frontend.
 * 2. Verifies it with Firebase Admin SDK to get the phone number.
 * 3. Returns a short-lived JWT (customerToken) for use in the customer-web app.
 *
 * No Customer document is created here — that happens on first order placement.
 */
export const customerLogin = async (req: Request, res: Response) => {
  try {
    const { firebaseToken, restaurantId } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ error: 'Firebase token is required' });
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(firebaseToken);
    const { uid, phone_number } = decodedToken;

    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number not found in token. Ensure phone auth was used.' });
    }

    // Upsert minimal customer record if restaurantId is provided
    let customer = null;
    if (restaurantId) {
      customer = await Customer.findOne({ restaurantId, phone: phone_number });
      if (!customer) {
        let referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        while (await Customer.findOne({ referralCode })) {
            referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        }
        customer = await Customer.create({
          restaurantId,
          phone: phone_number,
          name: 'Guest',
          firstVisitDate: new Date(),
          lastVisitDate: new Date(),
          referralCode,
        });
      }
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
    }

    const token = jwt.sign(
      {
        uid,
        customerId: customer?._id, // Add customerId for consistency with other routes
        phoneNumber: phone_number,
        restaurantId,
        type: 'customer',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      phoneNumber: phone_number,
      customer: customer ? {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        tier: customer.tier,
        loyaltyPoints: customer.loyaltyPoints,
        referralCode: customer.referralCode,
        dob: customer.dob,
        favoriteItems: customer.favoriteItems,
        totalVisits: customer.totalVisits,
      } : null,
    });
  } catch (error: any) {
    console.error('Customer login error:', error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired. Please try again.' });
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    return res.status(500).json({ error: 'Internal server error during customer login' });
  }
};

export const inviteStaff = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, role, name } = req.body;
    // @ts-ignore
    const inviter = req.user;

    if (!inviter.restaurantId) {
      return res.status(400).json({ error: 'You must set up a restaurant first' });
    }

    // Check if user already exists
    let user = await User.findOne({ phoneNumber });
    if (user) {
      return res.status(400).json({ error: 'User with this phone number already exists' });
    }

    user = await User.create({
      firebaseUid: `pending_${crypto.randomUUID()}`, // Secure unique UID until they sign up via Firebase
      phoneNumber,
      role,
      name,
      restaurantId: inviter.restaurantId,
    });

    // Generate Dynamic Link (mocked here, should use Firebase REST API to create actual link)
    const dynamicLink = `https://restaurantapp.page.link/?link=https://restaurantapp.com/invite&apn=com.restaurant.mobile&ibi=com.restaurant.ios`;

    // Send WhatsApp invite via LoomiFlow
    const restaurant = await require('mongoose').model('Restaurant').findById(inviter.restaurantId).select('name').lean();
    const restaurantName = (restaurant as any)?.name || 'your restaurant';
    sendStaffInviteWA(phoneNumber, restaurantName, dynamicLink)
      .catch(err => console.error(`[Staff Invite WA] Failed for ${phoneNumber}: ${err.message}`));

    return res.status(201).json({ message: 'Staff invited successfully', dynamicLink });
  } catch (error) {
    console.error('Invite staff error:', error);
    return res.status(500).json({ error: 'Internal server error during invitation' });
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Check if refresh token is blacklisted
    // If Redis is down, fail-open (allow the refresh) rather than locking out users
    try {
      const isBlacklisted = await redis.get(`bl_${refreshToken}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Refresh token has been revoked' });
      }
    } catch (redisErr) {
      console.warn('[refreshAccessToken] Redis blacklist check failed (proceeding):', (redisErr as Error)?.message);
    }

    // Verify the refresh token — this IS an auth check, so 401 on failure is correct
    let decoded: { userId: string; type: string };
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (jwtErr: any) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Look up the user to get fresh role/branch data
    // MongoDB failure here is a server error (500), NOT an auth failure
    let user;
    try {
      user = await User.findById(decoded.userId);
    } catch (dbErr) {
      console.error('[refreshAccessToken] MongoDB lookup failed:', (dbErr as Error)?.message);
      return res.status(500).json({ error: 'Server error during token refresh' });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    // Blacklist the old refresh token (one-time use / rotation)
    // If Redis is down, skip blacklisting — the token will naturally expire
    try {
      await redis.setex(`bl_${refreshToken}`, 7 * 24 * 3600, 'true'); // 7 days TTL
    } catch (redisErr) {
      console.warn('[refreshAccessToken] Redis blacklist write failed (continuing):', (redisErr as Error)?.message);
    }

    // Generate new token pair
    const payload = {
      userId: user.id,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId?.toString(),
      branchId: user.branchId?.toString(),
      accessibleBranches: user.accessibleBranches?.map((b: any) => b.toString()),
      permissions: user.permissions || [],
    };

    const tokens = generateTokens(payload);

    return res.json({
      ...tokens,
      user: {
        id: user.id,
        role: user.role,
        restaurantId: user.restaurantId,
        name: user.name,
        selectedBranchId: user.selectedBranchId || null,
      },
    });
  } catch (error: any) {
    // Unexpected errors are server errors, not auth failures
    console.error('[refreshAccessToken] Unexpected error:', error?.message || error);
    return res.status(500).json({ error: 'Server error during token refresh' });
  }
};
