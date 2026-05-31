import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MenuItem } from './src/models/MenuItem';
import { MenuCategory } from './src/models/MenuCategory';
import { extractS3Key } from './src/utils/s3';
import { connectDB } from './src/config/db';

dotenv.config();

const runMigration = async () => {
    try {
        console.log('Connecting to database...');
        await connectDB();
        console.log('Connected to database.');

        const s3UrlPattern = /https?:\/\/[^/]*\.s3[^/]*\.amazonaws\.com\//;
        let migratedItems = 0;
        let migratedCategories = 0;

        console.log('Fetching menu items...');
        const items = await MenuItem.find({
            $or: [
                { imageUrl: { $regex: s3UrlPattern } },
                { imageUrls: { $elemMatch: { $regex: s3UrlPattern } } },
                { thumbnailUrl: { $regex: s3UrlPattern } },
            ]
        });

        console.log(`Found ${items.length} items to migrate.`);

        for (const item of items) {
            let changed = false;

            if (item.imageUrl && s3UrlPattern.test(item.imageUrl)) {
                const key = extractS3Key(item.imageUrl);
                if (key) {
                    item.imageUrl = `/api/media/${key}`;
                    changed = true;
                }
            }

            if (item.imageUrls && item.imageUrls.length > 0) {
                item.imageUrls = item.imageUrls.map((url: string) => {
                    if (s3UrlPattern.test(url)) {
                        const key = extractS3Key(url);
                        if (key) {
                            changed = true;
                            return `/api/media/${key}`;
                        }
                    }
                    return url;
                });
            }

            if (item.thumbnailUrl && s3UrlPattern.test(item.thumbnailUrl)) {
                const key = extractS3Key(item.thumbnailUrl);
                if (key) {
                    item.thumbnailUrl = `/api/media/${key}`;
                    changed = true;
                }
            }

            if (changed) {
                await item.save();
                migratedItems++;
            }
        }

        console.log('Fetching menu categories...');
        const categories = await MenuCategory.find({
            imageUrl: { $regex: s3UrlPattern }
        });

        console.log(`Found ${categories.length} categories to migrate.`);

        for (const cat of categories) {
            if (cat.imageUrl && s3UrlPattern.test(cat.imageUrl)) {
                const key = extractS3Key(cat.imageUrl);
                if (key) {
                    cat.imageUrl = `/api/media/${key}`;
                    await cat.save();
                    migratedCategories++;
                }
            }
        }

        console.log(`Migration complete. Migrated ${migratedItems} items and ${migratedCategories} categories.`);

        // Also clear redis cache
        try {
            const { redis } = require('./src/config/redis');
            const keys = await redis.keys('menu_*');
            if (keys.length) {
                await redis.del(...keys);
                console.log(`Cleared ${keys.length} cache keys.`);
            }
            await redis.quit();
        } catch (e) {
            console.log('Redis cache clear skipped (not available or failed).');
        }

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

runMigration();
