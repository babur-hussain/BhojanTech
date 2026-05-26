import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { Customer } from '../models/Customer';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction';
import { Order } from '../models/Order';
import { resolveSegment } from '../services/loyaltyService';

// ─── Lookup by phone (for billing screen) ────────────────────────────────────

export const lookupCustomerByPhone = async (req: AuthRequest, res: Response) => {
    try {
        const { phone } = req.params;
        const restaurantId = req.user!.restaurantId;

        const customer = await Customer.findOne({ restaurantId, phone });
        if (!customer) return res.status(404).json({ found: false });

        // Get last order items for "Welcome back" message
        const lastOrder = await Order.findOne({ restaurantId, customerPhone: phone, status: 'PAID' })
            .sort({ createdAt: -1 })
            .select('items createdAt');

        const lastOrdered = lastOrder?.items.map((i) => i.name).join(', ') || '';

        return res.json({
            found: true,
            customer: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                tier: customer.tier,
                segment: customer.segment,
                loyaltyPoints: customer.loyaltyPoints,
                totalVisits: customer.totalVisits,
                totalSpend: customer.totalSpend,
                notes: customer.notes,
                birthdayMonth: customer.birthdayMonth,
                smsOptIn: customer.smsOptIn,
            },
            lastOrdered,
            lastVisitDate: customer.lastVisitDate,
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── List customers (CRM dashboard) ──────────────────────────────────────────

export const listCustomers = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;
        const { q, segment, tier, limit = 50, cursor, sortBy = 'totalSpend', order = 'desc' } = req.query;

        const filter: any = { restaurantId };
        if (cursor) {
            filter._id = { $lt: cursor };
        }
        if (segment) filter.segment = segment;
        if (tier) filter.tier = tier;

        const sortOrder = order === 'asc' ? 1 : -1;
        const sortField = ['totalSpend', 'totalVisits', 'lastVisitDate', 'loyaltyPoints'].includes(sortBy as string)
            ? (sortBy as string)
            : 'totalSpend';

        // If searching by query, check if it's numeric (phone search)
        const isPhoneSearch = q && /^\d+$/.test(q as string);

        if (q && !isPhoneSearch) {
            // Text search by name only (phone regex won't work on encrypted fields)
            filter.name = { $regex: q, $options: 'i' };
        }

        let customers;
        let total;

        if (isPhoneSearch) {
            console.log(`[listCustomers] Phone search triggered for q: ${q}, restaurantId: ${restaurantId}`);
            // For partial phone search, we must fetch and filter in memory because the DB field is encrypted
            const allCustomers = await Customer.find(filter).sort({ [sortField]: sortOrder }).select('-otp -otpExpiresAt');
            console.log(`[listCustomers] Fetched ${allCustomers.length} total customers for memory filter`);
            
            const matchedCustomers = [];
            for (const c of allCustomers) {
                if (c.decryptFieldsSync) c.decryptFieldsSync();
                if (c.phone && c.phone.includes(q as string)) {
                    matchedCustomers.push(c);
                }
            }
            console.log(`[listCustomers] Matched ${matchedCustomers.length} customers for q: ${q}`);
            total = matchedCustomers.length;
            customers = matchedCustomers.slice(0, Number(limit));
        } else {
            // Standard DB query
            const [dbCustomers, dbTotal] = await Promise.all([
                Customer.find(filter)
                    .sort({ _id: -1 }) // Sort exactly by ID for cursor approach
                    .limit(Number(limit))
                    .select('-otp -otpExpiresAt'),
                Customer.countDocuments(filter),
            ]);
            customers = dbCustomers;
            total = dbTotal;
        }

        const phones = customers.map((c: any) => c.phone).filter(Boolean);
        const orderStats = await Order.aggregate([
            { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId as string), customerPhone: { $in: phones }, status: { $in: ['PAID', 'COMPLETED'] } } },
            { $group: { _id: '$customerPhone', totalSpent: { $sum: '$totalAmountINR' }, visits: { $sum: 1 } } }
        ]);
        const statsMap = new Map(orderStats.map(s => [s._id, s]));

        const customersData = customers.map((c: any) => {
            if (c.decryptFieldsSync) c.decryptFieldsSync();
            const obj = c.toJSON ? c.toJSON() : c;
            
            const stats = statsMap.get(obj.phone);
            if (stats) {
                obj.totalSpend = Math.max(obj.totalSpend || 0, stats.totalSpent);
                obj.totalVisits = Math.max(obj.totalVisits || 0, stats.visits);
            }

            // Remove sensitive fields but return everything else
            delete obj.otp;
            delete obj.otpExpiresAt;
            delete obj.__enc_phone;
            delete obj.__enc_phone_d;
            return obj;
        });

        console.log(`[listCustomers] Returning ${customersData.length} customers`);
        const nextCursor = customers.length > 0 ? customers[customers.length - 1]._id : null;

        return res.json({ customers: customersData, total, nextCursor });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Customer detail ──────────────────────────────────────────────────────────

export const getCustomerDetail = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user!.restaurantId;

        const customer = await Customer.findOne({ _id: id, restaurantId }).select('-otp -otpExpiresAt');
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const [transactions, orders] = await Promise.all([
            LoyaltyTransaction.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(50),
            Order.find({ restaurantId, customerPhone: customer.phone, status: { $in: ['PAID', 'BILLED', 'COMPLETED'] } })
                .sort({ createdAt: -1 })
                .limit(20)
                .select('items totalAmountINR createdAt tableNumber waiterName status'),
        ]);

        const orderStats = await Order.aggregate([
            { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId as string), customerPhone: customer.phone, status: { $in: ['PAID', 'COMPLETED'] } } },
            { $group: { _id: null, totalSpent: { $sum: '$totalAmountINR' }, visits: { $sum: 1 } } }
        ]);
        
        if (orderStats.length > 0) {
            customer.totalSpend = Math.max(customer.totalSpend || 0, orderStats[0].totalSpent);
            customer.totalVisits = Math.max(customer.totalVisits || 0, orderStats[0].visits);
        }

        return res.json({ customer, transactions, orders });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Update customer notes / opt-in / birthday ───────────────────────────────

export const updateCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user!.restaurantId;
        const { notes, smsOptIn, whatsappOptIn, birthdayMonth, name, email } = req.body;

        const customer = await Customer.findOne({ _id: id, restaurantId });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        if (notes !== undefined) customer.notes = notes;
        if (smsOptIn !== undefined) customer.smsOptIn = smsOptIn;
        if (whatsappOptIn !== undefined) customer.whatsappOptIn = whatsappOptIn;
        if (birthdayMonth !== undefined) customer.birthdayMonth = birthdayMonth;
        if (name) customer.name = name;
        if (email !== undefined) customer.email = email;

        await customer.save();
        return res.json({ customer });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Segment summary ──────────────────────────────────────────────────────────

export const getSegmentSummary = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;

        // Re-sync segments live
        const all = await Customer.find({ restaurantId }).select(
            'phone totalVisits totalSpend lastVisitDate firstVisitDate segment loyaltyPoints'
        );

        const counts: Record<string, number> = {
            VIP: 0, REGULAR: 0, OCCASIONAL: 0, LAPSED: 0, NEW: 0,
        };
        const oldCounts: Record<string, number> = {
            VIP: 0, REGULAR: 0, OCCASIONAL: 0, LAPSED: 0, NEW: 0,
        };

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch recent orders to determine historical segments
        const recentActivity = await Order.aggregate([
            { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId as string), status: 'PAID', createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: '$customerPhone', recentVisits: { $sum: 1 }, recentSpend: { $sum: '$totalAmountINR' }, lastRecentVisit: { $max: '$createdAt' } } }
        ]);

        const recentActivityMap = new Map();
        for (const r of recentActivity) {
            recentActivityMap.set(r._id, r);
        }

        for (const c of all) {
            // Current segment
            const seg = resolveSegment({
                totalVisits: c.totalVisits,
                totalSpend: c.totalSpend,
                lastVisitDate: c.lastVisitDate,
                firstVisitDate: c.firstVisitDate,
            });
            c.segment = seg; // Update in memory
            counts[seg] = (counts[seg] || 0) + 1;

            // Historical segment computation (30 days ago)
            const activity = recentActivityMap.get(c.phone) || { recentVisits: 0, recentSpend: 0, lastRecentVisit: null };

            // Only count them in old segment if they had visited prior to 30 days ago
            if (c.firstVisitDate < thirtyDaysAgo) {
                // Approximate past state:
                const oldTotalVisits = Math.max(1, c.totalVisits - activity.recentVisits);
                const oldTotalSpend = Math.max(0, c.totalSpend - activity.recentSpend);

                let oldLastVisitDate = c.lastVisitDate;
                if (activity.lastRecentVisit && c.lastVisitDate.getTime() === activity.lastRecentVisit.getTime()) {
                    // Try to guess older last visit, fallback to 31 days ago to trigger lapsed if needed
                    const mockOldVisit = new Date(thirtyDaysAgo);
                    mockOldVisit.setDate(mockOldVisit.getDate() - 5);
                    oldLastVisitDate = mockOldVisit;
                }

                const oldSeg = resolveSegment({
                    totalVisits: oldTotalVisits,
                    totalSpend: oldTotalSpend,
                    lastVisitDate: oldLastVisitDate,
                    firstVisitDate: c.firstVisitDate,
                });
                oldCounts[oldSeg] = (oldCounts[oldSeg] || 0) + 1;
            }
        }

        // Calculate trends
        const trends: Record<string, number> = {};
        for (const key in counts) {
            const old = oldCounts[key] || 0;
            const current = counts[key] || 0;
            if (old === 0) {
                trends[key] = current > 0 ? 100 : 0;
            } else {
                trends[key] = +(((current - old) / old) * 100).toFixed(1);
            }
        }

        const newThisMonth = await Customer.countDocuments({
            restaurantId,
            firstVisitDate: { $gte: thirtyDaysAgo },
        });

        const totalPoints = await Customer.aggregate([
            { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId as string) } },
            { $group: { _id: null, total: { $sum: '$loyaltyPoints' } } },
        ]);

        return res.json({
            segments: counts,
            trends,
            total: all.length,
            newThisMonth,
            pointsLiability: totalPoints[0]?.total || 0,
        });
    } catch (err) {
        console.error('[Segmentation]', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Birthday list this month ─────────────────────────────────────────────────

export const getBirthdayList = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;
        const currentMonth = new Date().getMonth() + 1;

        const customers = await Customer.find({ restaurantId, birthdayMonth: currentMonth })
            .select('name phone tier loyaltyPoints whatsappOptIn smsOptIn')
            .limit(100);

        customers.forEach((c: any) => {
            if (c.decryptFieldsSync) c.decryptFieldsSync();
        });

        return res.json({ customers, month: currentMonth });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Customer Analytics (deep dashboard) ─────────────────────────────────────

export const customerAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;
        const rid = new mongoose.Types.ObjectId(restaurantId as string);
        const now = new Date();
        const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
        const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);

        // All customers
        const all = await Customer.find({ restaurantId });
        all.forEach((c: any) => {
            if (c.decryptFieldsSync) c.decryptFieldsSync();
        });

        // Segment counts
        const segments: Record<string, number> = { VIP: 0, REGULAR: 0, OCCASIONAL: 0, NEW: 0, LAPSED: 0 };
        const tiers: Record<string, number> = { PLATINUM: 0, GOLD: 0, SILVER: 0, BRONZE: 0 };
        all.forEach(c => {
            if (c.segment && segments[c.segment] !== undefined) segments[c.segment]++;
            if (c.tier && tiers[c.tier] !== undefined) tiers[c.tier]++;
        });

        // Top 10 by spend
        const top10BySpend = [...all]
            .sort((a, b) => b.totalSpend - a.totalSpend)
            .slice(0, 10)
            .map(c => ({ _id: c._id, name: c.name, phone: c.phone, tier: c.tier, segment: c.segment, totalSpend: c.totalSpend, totalVisits: c.totalVisits, loyaltyPoints: c.loyaltyPoints }));

        // Top 10 by visits
        const top10ByVisits = [...all]
            .sort((a, b) => b.totalVisits - a.totalVisits)
            .slice(0, 10)
            .map(c => ({ _id: c._id, name: c.name, phone: c.phone, tier: c.tier, segment: c.segment, totalSpend: c.totalSpend, totalVisits: c.totalVisits, loyaltyPoints: c.loyaltyPoints }));

        // New customers per week (last 8 weeks)
        const weeksData = await Customer.aggregate([
            { $match: { restaurantId: rid, firstVisitDate: { $gte: new Date(now.getTime() - 56 * 24 * 3600000) } } },
            {
                $group: {
                    _id: { $week: '$firstVisitDate' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Monthly new customers (last 6 months)
        const monthlyNew = await Customer.aggregate([
            { $match: { restaurantId: rid, firstVisitDate: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
            {
                $group: {
                    _id: { year: { $year: '$firstVisitDate' }, month: { $month: '$firstVisitDate' } },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalSpend' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Loyalty points totals
        const totalLoyaltyPoints = all.reduce((s, c) => s + (c.loyaltyPoints || 0), 0);
        const avgLoyaltyPoints = all.length > 0 ? Math.round(totalLoyaltyPoints / all.length) : 0;
        const totalSpend = all.reduce((s, c) => s + (c.totalSpend || 0), 0);
        const avgSpend = all.length > 0 ? Math.round(totalSpend / all.length) : 0;
        const avgVisits = all.length > 0 ? +(all.reduce((s, c) => s + (c.totalVisits || 0), 0) / all.length).toFixed(1) : 0;

        // Visit frequency buckets
        const visitBuckets = { once: 0, twoToFive: 0, sixToTen: 0, moreThanTen: 0 };
        all.forEach(c => {
            if (c.totalVisits === 1) visitBuckets.once++;
            else if (c.totalVisits <= 5) visitBuckets.twoToFive++;
            else if (c.totalVisits <= 10) visitBuckets.sixToTen++;
            else visitBuckets.moreThanTen++;
        });

        // SMS/WhatsApp opt-in counts
        const smsOptIn = all.filter(c => c.smsOptIn).length;
        const whatsappOptIn = all.filter((c: any) => c.whatsappOptIn).length;

        // Spend distribution buckets
        const spendBuckets = [
            { label: '< ₹500', min: 0, max: 500, count: 0 },
            { label: '₹500–2k', min: 500, max: 2000, count: 0 },
            { label: '₹2k–5k', min: 2000, max: 5000, count: 0 },
            { label: '₹5k–10k', min: 5000, max: 10000, count: 0 },
            { label: '₹10k+', min: 10000, max: Infinity, count: 0 },
        ];
        all.forEach(c => {
            const bucket = spendBuckets.find(b => c.totalSpend >= b.min && c.totalSpend < b.max);
            if (bucket) bucket.count++;
        });

        // Birthday this month
        const currentMonth = now.getMonth() + 1;
        const birthdayCount = all.filter(c => c.birthdayMonth === currentMonth).length;
        const newThisMonth = all.filter(c => new Date(c.firstVisitDate) >= new Date(now.getFullYear(), now.getMonth(), 1)).length;
        const lapsedCount = segments.LAPSED;
        const retentionRate = all.length > 0 ? +((1 - lapsedCount / all.length) * 100).toFixed(1) : 0;

        return res.json({
            totalCustomers: all.length,
            newThisMonth,
            totalSpend,
            avgSpend,
            avgVisits,
            totalLoyaltyPoints,
            avgLoyaltyPoints,
            smsOptIn,
            whatsappOptIn,
            retentionRate,
            birthdayCount,
            segments,
            tiers,
            top10BySpend,
            top10ByVisits,
            visitBuckets,
            spendBuckets: spendBuckets.map(b => ({ label: b.label, count: b.count })),
            monthlyNew: monthlyNew.map(m => ({
                label: new Date(m._id.year, m._id.month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                count: m.count,
                revenue: m.revenue,
            })),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};
