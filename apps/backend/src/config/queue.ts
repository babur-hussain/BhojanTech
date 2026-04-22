import { Queue, ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// BullMQ requires maxRetriesPerRequest to be null
export const redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

redisConnection.on('error', (err) => {
    console.error('[Redis] Error connecting to queue redis:', err);
});

export const menuSyncQueue = new Queue('MenuSync', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});

console.log('[Queue] MenuSync Queue initialized');
