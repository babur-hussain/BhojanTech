import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { LoyaltySettings } from '../models/LoyaltySettings';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction';
import { Customer } from '../models/Customer';
import { redeemPoints, getOrInitSettings } from '../services/loyaltyService';

// ─── Get settings ─────────────────────────────────────────────────────────────

export const getLoyaltySettings = async (req: AuthRequest, res: Response) => {
    try {
        const settings = await getOrInitSettings(req.user!.restaurantId as string);
        return res.json({ settings });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update settings ──────────────────────────────────────────────────────────

export const updateLoyaltySettings = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;
        const settings = await LoyaltySettings.findOneAndUpdate(
            { restaurantId },
            { $set: req.body },
            { new: true, upsert: true }
        );
        return res.json({ settings });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get points transactions for a customer ────────────────────────────────────

export const getCustomerTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { customerId } = req.params;
        const restaurantId = req.user!.restaurantId;

        const customer = await Customer.findOne({ _id: customerId, restaurantId });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const transactions = await LoyaltyTransaction.find({ customerId, restaurantId })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('orderId', 'tableNumber createdAt');

        return res.json({ transactions, currentBalance: customer.loyaltyPoints });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Redeem points ────────────────────────────────────────────────────────────

export const redeemCustomerPoints = async (req: AuthRequest, res: Response) => {
    try {
        const { customerId } = req.params;
        const { pointsToRedeem, orderId } = req.body;
        const restaurantId = req.user!.restaurantId as string;

        const settings = await getOrInitSettings(restaurantId);
        const result = await redeemPoints(customerId, restaurantId, pointsToRedeem, orderId, settings);

        if ('error' in result) return res.status(400).json({ error: result.error });
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Points liability across all customers ────────────────────────────────────

export const getPointsLiability = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId as string;
        const settings = await getOrInitSettings(restaurantId);

        const agg = await Customer.aggregate([
            { $match: { restaurantId: new (require('mongoose').Types.ObjectId)(restaurantId) } },
            {
                $group: {
                    _id: null,
                    totalPoints: { $sum: '$loyaltyPoints' },
                    customerCount: { $sum: 1 },
                },
            },
        ]);

        const totalPoints = agg[0]?.totalPoints || 0;
        const totalLiabilityINR = +(totalPoints / settings.pointsPerRupeeRedemption).toFixed(2);

        return res.json({ totalPoints, totalLiabilityINR, customerCount: agg[0]?.customerCount || 0 });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};
