import cron from 'node-cron';
import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant';
import { AIInsight } from '../models/AIModels';
import { buildRestaurantContext, generateDailyInsights } from './claude.service';

/**
 * Runs every morning at 9:00 AM IST (3:30 AM UTC) — generates 3 AI insights
 * per restaurant and stores them in MongoDB for the dashboard widget.
 */
export function startDailyInsightsCron() {
  // 9:00 AM IST = 03:30 UTC
  cron.schedule('30 3 * * *', async () => {
    console.log('[AI Cron] Generating daily insights for all restaurants...');
    try {
      const restaurants = await Restaurant.find({});
      const today = new Date().toISOString().slice(0, 10);

      for (const r of restaurants) {
        try {
          const alreadyGenerated = await AIInsight.findOne({
            restaurantId: r._id, date: today,
          });
          if (alreadyGenerated) continue;

          const context = await buildRestaurantContext(r._id.toString());
          const jsonText = await generateDailyInsights(r._id.toString(), context);
          const insights = JSON.parse(jsonText);

          await AIInsight.findOneAndUpdate(
            { restaurantId: r._id, date: today },
            { $set: { insights, generatedAt: new Date() } },
            { upsert: true }
          );
          console.log(`[AI Cron] ✓ Insights generated for: ${r.name}`);
          // Throttle between restaurants to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          console.error(`[AI Cron] Failed for ${r._id}:`, err);
        }
      }
    } catch (err) {
      console.error('[AI Cron] Fatal error:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[AI Cron] Daily insights cron scheduled for 9:00 AM IST');
}
