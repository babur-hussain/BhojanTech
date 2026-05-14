import { Request, Response } from 'express';
import { firebaseAdmin } from '../config/firebase';
import { User } from '../models/User';
import { generateTokens } from '../utils/jwt';
import { UserRole } from '@restaurant/types';
import { redis } from '../config/redis';

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
      // Create new user, default to OWNER for new signups
      user = await User.create({
        firebaseUid: uid,
        email,
        phoneNumber: phone_number,
        role: UserRole.OWNER,
      });
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
    };

    const tokens = generateTokens(payload);

    return res.status(200).json({
      user: {
        id: user.id,
        role: user.role,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        name: user.name,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const devLogin = async (req: Request, res: Response) => {
  try {
    let user = await User.findOne({ email: 'dev@bhojantech.com' });
    if (!user) {
      user = await User.create({
        firebaseUid: 'dev_mock_uid',
        email: 'dev@bhojantech.com',
        phoneNumber: '+1234567890',
        role: UserRole.SUPER_OWNER,
        name: 'Dev Owner'
      });
    }

    const payload = {
      userId: user.id,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId?.toString(),
      branchId: user.branchId?.toString(),
      accessibleBranches: user.accessibleBranches?.map((b: any) => b.toString()),
    };

    const tokens = generateTokens(payload);

    return res.status(200).json({
      user: {
        id: user.id,
        role: user.role,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        name: user.name,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Dev Login error:', error);
    return res.status(500).json({ error: 'Internal server error during dev login' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Blacklist token in Redis for 1 hour (matching JWT_EXPIRES_IN)
    await redis.setex(`bl_${token}`, 3600, 'true');

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
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ error: 'Firebase token is required' });
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(firebaseToken);
    const { uid, phone_number } = decodedToken;

    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number not found in token. Ensure phone auth was used.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const jwt = require('jsonwebtoken');

    const token = jwt.sign(
      {
        uid,
        phoneNumber: phone_number,
        type: 'customer',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      phoneNumber: phone_number,
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
      firebaseUid: `temp_${Date.now()}`, // Temporary UID until they sign up
      phoneNumber,
      role,
      name,
      restaurantId: inviter.restaurantId,
    });

    // Generate Dynamic Link (mocked here, should use Firebase REST API to create actual link)
    const dynamicLink = `https://restaurantapp.page.link/?link=https://restaurantapp.com/invite&apn=com.restaurant.mobile&ibi=com.restaurant.ios`;

    // In a real app, send SMS via Twilio or Firebase here
    console.log(`Sending SMS to ${phoneNumber} with link: ${dynamicLink}`);

    return res.status(201).json({ message: 'Staff invited successfully', dynamicLink });
  } catch (error) {
    console.error('Invite staff error:', error);
    return res.status(500).json({ error: 'Internal server error during invitation' });
  }
};
