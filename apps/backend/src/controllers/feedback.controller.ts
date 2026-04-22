import { Response } from 'express';
import { Request } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Feedback } from '../models/Feedback';
import { Customer } from '../models/Customer';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction';
import mongoose from 'mongoose';

// ─── Submit feedback (public, no auth — called from SMS link) ────────────────

export const submitFeedback = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const { rating, comment, phone } = req.body;

        const feedback = await Feedback.findOne({ orderId });
        if (!feedback) return res.status(404).json({ error: 'Feedback request not found' });
        if (feedback.status === 'SUBMITTED') return res.status(400).json({ error: 'Already submitted' });

        feedback.rating = Number(rating);
        feedback.comment = comment;
        feedback.submittedAt = new Date();
        feedback.status = 'SUBMITTED';
        feedback.isLowRating = Number(rating) <= 2;

        // Attach customer
        if (phone) {
            const customer = await Customer.findOne({ restaurantId: feedback.restaurantId, phone });
            if (customer) feedback.customerId = customer._id as any;
        }

        await feedback.save();

        return res.json({ message: 'Thank you for your feedback!', rating: feedback.rating });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Get feedback alerts (low ratings needing resolution) ────────────────────

export const getFeedbackAlerts = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;
        const alerts = await Feedback.find({
            restaurantId,
            isLowRating: true,
            status: { $in: ['SUBMITTED'] },
        })
            .sort({ submittedAt: -1 })
            .limit(50)
            .populate('customerId', 'name phone tier loyaltyPoints')
            .populate('orderId', 'tableNumber createdAt');

        return res.json({ alerts });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Resolve complaint ────────────────────────────────────────────────────────

export const resolveFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { resolutionNote, bonusPoints } = req.body;
        const restaurantId = req.user!.restaurantId;

        const feedback = await Feedback.findOne({ _id: id, restaurantId });
        if (!feedback) return res.status(404).json({ error: 'Feedback not found' });

        feedback.status = 'RESOLVED';
        feedback.resolvedBy = req.user!.userId as any;
        feedback.resolvedAt = new Date();
        feedback.resolutionNote = resolutionNote;

        // Give apology bonus points
        if (bonusPoints && bonusPoints > 0 && feedback.customerId) {
            const customer = await Customer.findById(feedback.customerId);
            if (customer) {
                const balanceBefore = customer.loyaltyPoints;
                const balanceAfter = balanceBefore + bonusPoints;
                customer.loyaltyPoints = balanceAfter;
                await customer.save();

                await LoyaltyTransaction.create({
                    customerId: customer._id,
                    restaurantId,
                    type: 'APOLOGY_BONUS',
                    points: bonusPoints,
                    balanceBefore,
                    balanceAfter,
                    description: `Apology bonus for low rating (${feedback.rating}★)`,
                });

                feedback.bonusPointsGiven = bonusPoints;
            }
        }

        await feedback.save();
        return res.json({ feedback });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Aggregate ratings dashboard ─────────────────────────────────────────────

export const getFeedbackStats = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;

        const agg = await Feedback.aggregate([
            { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId as string), status: 'SUBMITTED' } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    total: { $sum: 1 },
                    fiveStar: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                    fourStar: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                    threeStar: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                    lowRatings: { $sum: { $cond: ['$isLowRating', 1, 0] } },
                },
            },
        ]);

        return res.json({ stats: agg[0] || { avgRating: 0, total: 0, lowRatings: 0 } });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};
