import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { Customer } from '../models/Customer';
import { Invoice } from '../models/Invoice';
import { Order } from '../models/Order';

// ─── Full customer analytics ──────────────────────────────────────────────────

export const getCustomerAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;
        const rid = new mongoose.Types.ObjectId(restaurantId as string);

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // --- Acquisition ---
        const [totalCustomers, newLast7, newLast30] = await Promise.all([
            Customer.countDocuments({ restaurantId }),
            Customer.countDocuments({ restaurantId, firstVisitDate: { $gte: sevenDaysAgo } }),
            Customer.countDocuments({ restaurantId, firstVisitDate: { $gte: thirtyDaysAgo } }),
        ]);

        // --- Retention: first-time visitors in 30-60 days ago window who returned within 30 days ---
        const cohortCustomers = await Customer.find({
            restaurantId,
            firstVisitDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        }).select('_id phone firstVisitDate lastVisitDate');

        const cohortSize = cohortCustomers.length;
        const retained = cohortCustomers.filter(
            (c) => c.lastVisitDate > new Date(c.firstVisitDate.getTime() + 24 * 60 * 60 * 1000)
        ).length;
        const retentionRate = cohortSize > 0 ? +((retained / cohortSize) * 100).toFixed(1) : 0;

        // --- Churn: customers who haven't visited in 60+ days ---
        const churnedCount = await Customer.countDocuments({
            restaurantId,
            lastVisitDate: { $lt: sixtyDaysAgo },
        });
        const churnRate = totalCustomers > 0 ? +((churnedCount / totalCustomers) * 100).toFixed(1) : 0;

        // --- Average CLV ---
        const clvAgg = await Customer.aggregate([
            { $match: { restaurantId: rid } },
            { $group: { _id: null, avgSpend: { $avg: '$totalSpend' }, avgVisits: { $avg: '$totalVisits' } } },
        ]);
        const avgCLV = clvAgg[0]?.avgSpend || 0;

        // --- Top 10 customers by lifetime spend ---
        const topCustomers = await Customer.find({ restaurantId })
            .sort({ totalSpend: -1 })
            .limit(10)
            .select('name phone tier totalSpend totalVisits loyaltyPoints lastVisitDate');

        // --- Points liability ---
        const pointsAgg = await Customer.aggregate([
            { $match: { restaurantId: rid } },
            { $group: { _id: null, totalPoints: { $sum: '$loyaltyPoints' } } },
        ]);
        const totalPoints = pointsAgg[0]?.totalPoints || 0;

        // --- Acquisition over time (last 12 weeks) ---
        const acquisitionByWeek = await Customer.aggregate([
            { $match: { restaurantId: rid, firstVisitDate: { $gte: new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000) } } },
            {
                $group: {
                    _id: { $week: '$firstVisitDate' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id': 1 } },
        ]);

        return res.json({
            totalCustomers,
            newLast7,
            newLast30,
            retentionRate,
            churnRate,
            churnedCount,
            avgCLV: +avgCLV.toFixed(2),
            topCustomers,
            totalPoints,
            acquisitionByWeek,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};
