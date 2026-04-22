import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant';
import { Branch } from '../models/Branch';
import { Order } from '../models/Order';
import { redis } from '../config/redis';

export const computeAndCacheAggregatedStats = async () => {
    try {
        const restaurants = await Restaurant.find();

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        for (const restaurant of restaurants) {
            const branches = await Branch.find({ restaurantId: restaurant._id });
            const result: Record<string, any> = {
                restaurantId: restaurant._id,
                totalRevenue: 0,
                totalOrders: 0,
                branches: {}
            };

            for (const branch of branches) {
                // Compute for this branch
                const stats = await Order.aggregate([
                    {
                        $match: {
                            restaurantId: restaurant._id,
                            branchId: branch._id,
                            createdAt: { $gte: startOfDay }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$totalAmountINR' },
                            orderCount: { $sum: 1 }
                        }
                    }
                ]);

                const branchStats = stats[0] || { totalRevenue: 0, orderCount: 0 };

                result.branches[branch._id.toString()] = {
                    name: branch.name,
                    ...branchStats
                };

                result.totalRevenue += branchStats.totalRevenue;
                result.totalOrders += branchStats.orderCount;
            }

            // Cache in Redis for 5 minutes
            const cacheKey = `restaurant_${restaurant._id}_aggregated_stats`;
            await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
        }

        console.log('Successfully completed multi-branch aggregation cache jobs');
    } catch (err) {
        console.error('Error computing aggregated stats:', err);
    }
};
