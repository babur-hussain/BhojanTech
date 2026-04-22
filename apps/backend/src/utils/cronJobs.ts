import cron from 'node-cron';
import { Restaurant } from '../models/Restaurant';
import { generateDailyInsights } from '../services/aiService';
import AIInsight from '../models/AIInsight';
import { computeAndCacheAggregatedStats } from '../services/aggregationService';

export const initCronJobs = () => {
    // Run every 5 minutes for caching real-time dashboards
    cron.schedule('*/5 * * * *', async () => {
        await computeAndCacheAggregatedStats();
    });

    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily AI insights cron job...');
        try {
            // Find all active restaurants to generate insights for
            const restaurants = await Restaurant.find();
            for (const restaurant of restaurants) {
                // Generate insights via Claude
                const insightsTexts = await generateDailyInsights(restaurant._id as any);

                // Save them to DB
                for (const text of insightsTexts) {
                    await AIInsight.create({
                        insightText: text,
                        category: 'General',
                    });
                }
            }
        } catch (err) {
            console.error('Error in daily AI insights cron job:', err);
        }
    });
    console.log('Cron jobs initialized');
};
