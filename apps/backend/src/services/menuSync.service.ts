import { Worker, Job } from 'bullmq';
import { redisConnection, menuSyncQueue } from '../config/queue';
import { Integration } from '../models/Integration';
import { MenuItem } from '../models/MenuItem';

export async function scheduleMenuSync(menuItemId: string, branchId?: string) {
    // Add to queue
    await menuSyncQueue.add('sync-item', { menuItemId, branchId }, {
        jobId: `sync-${menuItemId}-${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: false
    });
}

const worker = new Worker('MenuSync', async (job: Job) => {
    const { menuItemId, branchId } = job.data;
    console.log(`[MenuSync] Processing sync for MenuItem: ${menuItemId}`);

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
        console.log(`[MenuSync] MenuItem ${menuItemId} not found, skipping sync.`);
        return;
    }

    // Find active integrations
    const query: any = { status: 'ACTIVE', restaurantId: menuItem.restaurantId };
    if (branchId) {
        query.branchId = branchId;
    }
    const activeIntegrations = await Integration.find(query);

    for (const integration of activeIntegrations) {
        try {
            if (integration.platform === 'ZOMATO' && menuItem.zomatoItemId) {
                // Mock Zomato pushing
                console.log(`[ZOMATO] Pushed update for itemId ${menuItem.zomatoItemId} (${menuItem.name}) - Availability: ${menuItem.isAvailable}, Price: ${menuItem.variants[0]?.priceINR}`);
            } else if (integration.platform === 'SWIGGY' && menuItem.swiggyItemId) {
                // Mock Swiggy pushing
                console.log(`[SWIGGY] Pushed update for itemId ${menuItem.swiggyItemId} (${menuItem.name}) - Availability: ${menuItem.isAvailable}`);
            }
        } catch (err) {
            console.error(`[MenuSync] Error syncing ${menuItemId} to ${integration.platform}:`, err);
            // Let BullMQ retry
            throw err;
        }
    }
}, {
    connection: redisConnection,
    limiter: {
        max: 5, // max 5 jobs
        duration: 1000, // per 1 second (rate limiting)
    }
});

worker.on('failed', (job, err) => {
    console.error(`[MenuSync] Job ${job?.id} failed with ${err.message}`);
});
