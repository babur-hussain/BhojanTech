import { Worker } from 'bullmq';
import { MenuItem } from '../models/MenuItem';
import { redisConnection, menuSyncQueue } from '../config/queue';

// Re-export queue so existing imports from integration.controller still work
export { menuSyncQueue };

export const menuSyncWorker = new Worker('menu-sync', async (job) => {
  const { integrationId, restaurantId, branchId, platform } = job.data;
  
  console.log(`[MenuSyncWorker] Starting menu sync for ${platform} (Integration: ${integrationId})`);

  try {
    // 1. Fetch all menu items for the restaurant/branch
    const menuItems = await MenuItem.find({ restaurantId }); // Filtering by branchId could be added here if needed

    console.log(`[MenuSyncWorker] Found ${menuItems.length} items to sync for ${platform}.`);

    // 2. Simulate API calls to Zomato/Swiggy to push menu data
    // In reality, this would map the menu to Zomato/Swiggy's required catalog schema
    // and use axios to POST to their specific endpoints with appropriate auth tokens.

    for (let i = 0; i < menuItems.length; i++) {
        // Simulate network delay for each batch of items
        await new Promise((resolve) => setTimeout(resolve, 50)); 
    }

    // 3. Mark the integration's lastSyncTimestamp
    // Assuming you have access to update the integration document here:
    // await Integration.findByIdAndUpdate(integrationId, { lastSyncTimestamp: new Date() });

    console.log(`[MenuSyncWorker] Successfully synced menu for ${platform}!`);
    return { success: true, count: menuItems.length };
  } catch (error: any) {
    console.error(`[MenuSyncWorker] Failed to sync menu for ${platform}:`, error.message);
    throw error;
  }
}, { connection: redisConnection });

menuSyncWorker.on('completed', job => {
  console.log(`[MenuSyncWorker] Job ${job.id} has completed!`);
});

menuSyncWorker.on('failed', (job, err) => {
  console.log(`[MenuSyncWorker] Job ${job?.id} has failed with ${err.message}`);
});
