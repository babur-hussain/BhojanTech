import { Request, Response } from 'express';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';
import { io } from '../index';
import { generatePresignedUrl, uploadToS3 } from '../utils/s3';
import { AuthRequest } from '../middleware/auth.middleware';
import { scheduleMenuSync } from '../services/menuSync.service';
import { redis } from '../config/redis';
import { getBaseQuery, getCreateBranchId } from '../utils/queryHelpers';

const clearMenuCache = async (restaurantId?: string, branchId?: string | null) => {
  if (!restaurantId) return;
  const bId = branchId || 'all';
  // Clear branch-specific keys
  await redis.del(`menu_categories_v3:${restaurantId}:${bId}`);
  await redis.del(`menu_items_v3:${restaurantId}:${bId}`);
  await redis.del(`menu_categories_v2:${restaurantId}:${bId}`);
  await redis.del(`menu_items_v2:${restaurantId}:${bId}`);
  await redis.del(`menu_categories:${restaurantId}:${bId}`);
  await redis.del(`menu_items:${restaurantId}:${bId}`);
  await redis.del(`menu_public:${restaurantId}:${bId}`);
  // Always also clear the 'all' public key — the customer menu uses this
  await redis.del(`menu_public:${restaurantId}:all`);
  await redis.del(`menu_categories_v4:${restaurantId}:all`);
  await redis.del(`menu_items_v4:${restaurantId}:all`);
  await redis.del(`menu_categories_v3:${restaurantId}:all`);
  await redis.del(`menu_items_v3:${restaurantId}:all`);
  await redis.del(`menu_categories_v2:${restaurantId}:all`);
  await redis.del(`menu_items_v2:${restaurantId}:all`);
  await redis.del(`menu_categories:${restaurantId}:all`);
  await redis.del(`menu_items:${restaurantId}:all`);
  // If it was a global (no-branch) update, wipe all related keys
  if (!branchId) {
    const keys = await redis.keys(`menu_*:${restaurantId}:*`);
    if (keys.length) await redis.del(...keys);
  }
};

export const getUploadUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }

    const { signedUrl, publicUrl } = await generatePresignedUrl(fileName, fileType);
    return res.json({ signedUrl, publicUrl });
  } catch (error) {
    console.error('Error generating upload URL', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

/**
 * Server-side image upload — accepts multipart files, uploads them to S3,
 * and returns the public URLs. No CORS config needed on S3.
 */
export const uploadImages = async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const urls: string[] = [];
    for (const file of files) {
      const { publicUrl } = await uploadToS3(file.buffer, file.originalname, file.mimetype);
      urls.push(publicUrl);
    }

    return res.json({ urls });
  } catch (error) {
    console.error('Error uploading images', error);
    return res.status(500).json({ error: 'Failed to upload images' });
  }
};

// CATEGORIES
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const requestedBranchId = (req.query.branchId as string) || (req.query._b as string) || (req.headers['x-branch-id'] as string);
    const branchId = req.user!.branchId || (requestedBranchId ? requestedBranchId : 'all');
    const cacheKey = `menu_categories_v4:${req.user!.restaurantId}:${branchId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const query = getBaseQuery(req);
    
    const categories = await MenuCategory.find(query).sort('order').lean();

    await redis.set(cacheKey, JSON.stringify(categories), 'EX', 3600);
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = getCreateBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Branch ID is required' });
    const category = await MenuCategory.create({
      restaurantId: req.user!.restaurantId,
      branchId,
      name: req.body.name,
      order: req.body.order || 0,
      imageUrl: req.body.imageUrl,
    });
    await clearMenuCache(req.user!.restaurantId, typeof req.query.branchId === 'string' ? req.query.branchId : undefined);
    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const query = getBaseQuery(req);
    query._id = id;

    // Whitelist updatable fields — prevent overwriting restaurantId/branchId
    const { name, order, imageUrl, isAvailable } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (order !== undefined) updateData.order = order;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const category = await MenuCategory.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    );

    if (!category) return res.status(404).json({ error: 'Not found' });
    
    // Clear cache
    await clearMenuCache(req.user!.restaurantId, category.branchId?.toString());

    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('menu_update', {
      type: 'CATEGORY_UPDATED',
      category,
    });

    return res.json(category);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const query = getBaseQuery(req);
    query._id = id;

    const category = await MenuCategory.findOneAndDelete(query);
    if (!category) return res.status(404).json({ error: 'Not found' });

    // Also delete associated items? Optional, but typical. For now, just clear cache.
    // Wait, let's keep items and maybe just disable them or leave them un-categorized?
    // Often it's better to just delete the category.

    await clearMenuCache(req.user!.restaurantId, category.branchId?.toString());

    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('menu_update', {
      type: 'CATEGORY_DELETED',
      categoryId: id,
    });

    return res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateCategoryAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const query = getBaseQuery(req);
    query._id = id;
    const category = await MenuCategory.findOneAndUpdate(
      query,
      { isAvailable },
      { new: true }
    );

    if (!category) return res.status(404).json({ error: 'Not found' });
    await clearMenuCache(req.user!.restaurantId, category.branchId?.toString());

    // Emit live update to waiters
    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('menu_update', {
      type: 'CATEGORY_AVAILABILITY',
      categoryId: id,
      isAvailable,
    });

    return res.json(category);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ITEMS
export const getMenuItems = async (req: AuthRequest, res: Response) => {
  try {
    const requestedBranchId = (req.query.branchId as string) || (req.query._b as string) || (req.headers['x-branch-id'] as string);
    const branchId = req.user!.branchId || (requestedBranchId ? requestedBranchId : 'all');
    const cacheKey = `menu_items_v4:${req.user!.restaurantId}:${branchId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const query = getBaseQuery(req);
    
    const items = await MenuItem.find(query).lean();

    await redis.set(cacheKey, JSON.stringify(items), 'EX', 3600);
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = getCreateBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Branch ID is required' });
    const { categoryId, name, hindiName, description, variants, isVeg, gstSlab, imageUrl, imageUrls, isAvailable, allergenTags, dietaryTags, preparationTime, packingCharges, barcode, shortCode, costPriceINR, calories, order: itemOrder } = req.body;
    const item = await MenuItem.create({
      categoryId, name, hindiName, description, variants, isVeg, gstSlab, imageUrl, imageUrls, isAvailable, allergenTags, dietaryTags, preparationTime, packingCharges, barcode, shortCode, costPriceINR, calories, order: itemOrder,
      restaurantId: req.user!.restaurantId,
      branchId,
    });

    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('menu_update', {
      type: 'ITEM_ADDED',
      item,
    });
    await clearMenuCache(req.user!.restaurantId, item.branchId?.toString());

    return res.status(201).json(item);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    query._id = req.params.id;
    const { categoryId, name, hindiName, description, variants, isVeg, gstSlab, imageUrl, imageUrls, isAvailable, allergenTags, dietaryTags, preparationTime, packingCharges, barcode, shortCode, costPriceINR, calories, order: itemOrder } = req.body;
    const updateData: any = {};
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (name !== undefined) updateData.name = name;
    if (hindiName !== undefined) updateData.hindiName = hindiName;
    if (description !== undefined) updateData.description = description;
    if (variants !== undefined) updateData.variants = variants;
    if (isVeg !== undefined) updateData.isVeg = isVeg;
    if (gstSlab !== undefined) updateData.gstSlab = gstSlab;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (imageUrls !== undefined) updateData.imageUrls = imageUrls;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (allergenTags !== undefined) updateData.allergenTags = allergenTags;
    if (dietaryTags !== undefined) updateData.dietaryTags = dietaryTags;
    if (preparationTime !== undefined) updateData.preparationTime = preparationTime;
    if (packingCharges !== undefined) updateData.packingCharges = packingCharges;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (shortCode !== undefined) updateData.shortCode = shortCode;
    if (costPriceINR !== undefined) updateData.costPriceINR = costPriceINR;
    if (calories !== undefined) updateData.calories = calories;
    if (itemOrder !== undefined) updateData.order = itemOrder;

    const item = await MenuItem.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    );

    if (!item) return res.status(404).json({ error: 'Not found' });

    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('menu_update', {
      type: 'ITEM_UPDATED',
      item,
    });

    // Enqueue third-party aggregator sync
    scheduleMenuSync(item._id.toString());
    await clearMenuCache(req.user!.restaurantId, item.branchId?.toString());

    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const deleteMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    query._id = req.params.id;
    const item = await MenuItem.findOneAndDelete(query);
    if (!item) return res.status(404).json({ error: 'Not found' });

    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('menu_update', {
      type: 'ITEM_DELETED',
      itemId: item._id,
    });

    await clearMenuCache(req.user!.restaurantId, item.branchId?.toString());
    return res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateItemAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const query = getBaseQuery(req);
    query._id = id;
    const item = await MenuItem.findOneAndUpdate(
      query,
      { isAvailable },
      { new: true }
    );

    if (!item) return res.status(404).json({ error: 'Not found' });

    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('menu_update', {
      type: 'ITEM_AVAILABILITY',
      itemId: id,
      isAvailable,
    });

    // Enqueue third-party aggregator sync
    scheduleMenuSync(item._id.toString());
    await clearMenuCache(req.user!.restaurantId, item.branchId?.toString());

    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const getPublicMenu = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : 'all';
    
    // We could use cache here as well, but for simplicity we fetch direct, or reuse the cache
    const cacheKey = `menu_public:${restaurantId}:${branchId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const queryParams: any = { restaurantId, isAvailable: true };
    if (branchId !== 'all') {
      queryParams.branchId = branchId;
    }

    const categories = await MenuCategory.find(queryParams).sort('order').lean();
    const items = await MenuItem.find(queryParams).lean();
    
    // Add Restaurant import at top, or just use mongoose model directly if imported
    const mongoose = require('mongoose');
    const Restaurant = mongoose.model('Restaurant');
    const restaurant = await Restaurant.findById(restaurantId).lean();

    const result = {
      restaurant,
      categories,
      items
    };

    await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    return res.json(result);
  } catch (error) {
    console.error('getPublicMenu error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * One-time migration: Convert all direct S3 URLs to proxy URLs (/api/media/...).
 * This fixes existing images that are inaccessible because the S3 bucket is private.
 */
export const migrateImageUrls = async (req: AuthRequest, res: Response) => {
  try {
    const { extractS3Key } = require('../utils/s3');
    
    // Pattern to match direct S3 URLs for the bhojan-tech bucket
    const s3UrlPattern = /https?:\/\/[^/]*\.s3[^/]*\.amazonaws\.com\//;

    let migratedItems = 0;
    let migratedCategories = 0;

    // Migrate MenuItem imageUrl and imageUrls
    const items = await MenuItem.find({
      $or: [
        { imageUrl: { $regex: s3UrlPattern } },
        { imageUrls: { $elemMatch: { $regex: s3UrlPattern } } },
        { thumbnailUrl: { $regex: s3UrlPattern } },
      ]
    });

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

    // Migrate MenuCategory imageUrl
    const categories = await MenuCategory.find({
      imageUrl: { $regex: s3UrlPattern }
    });

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

    // Clear all menu caches so the new URLs take effect
    const keys = await redis.keys('menu_*');
    if (keys.length) await redis.del(...keys);

    return res.json({
      success: true,
      migratedItems,
      migratedCategories,
      message: `Migrated ${migratedItems} items and ${migratedCategories} categories to proxy URLs.`
    });
  } catch (error) {
    console.error('migrateImageUrls error:', error);
    return res.status(500).json({ error: 'Migration failed' });
  }
};

export const shareMenu = async (req: AuthRequest, res: Response) => {
  try {
    const { targetBranchIds, categoryIds, itemIds, overwrite } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!targetBranchIds || !Array.isArray(targetBranchIds) || targetBranchIds.length === 0) {
      return res.status(400).json({ error: 'Target branches required' });
    }

    const mongoose = require('mongoose');

    // 1. Fetch source categories and items
    const sourceCategories = await MenuCategory.find({ _id: { $in: categoryIds }, restaurantId }).lean();
    const sourceItems = await MenuItem.find({ _id: { $in: itemIds }, restaurantId }).lean();

    for (const branchId of targetBranchIds) {
      // Create a map to link old category IDs to new category IDs for this branch
      const categoryMap = new Map<string, any>();

      // 2. Process Categories
      for (const cat of sourceCategories) {
        let existingCat = await MenuCategory.findOne({ name: cat.name, restaurantId, branchId });
        
        if (existingCat) {
          categoryMap.set(cat._id.toString(), existingCat._id);
        } else {
          const newCat = new MenuCategory({
            ...cat,
            _id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            branchId
          });
          await newCat.save();
          categoryMap.set(cat._id.toString(), newCat._id);
        }
      }

      // 3. Process Items
      for (const item of sourceItems) {
        const targetCategoryId = categoryMap.get(item.categoryId.toString());
        if (!targetCategoryId) continue;

        let existingItem = await MenuItem.findOne({ name: item.name, restaurantId, branchId });

        const itemData = { ...item };
        delete (itemData as any)._id;
        delete (itemData as any).createdAt;
        delete (itemData as any).updatedAt;
        delete (itemData as any).__v;

        if (existingItem) {
          if (overwrite) {
            await MenuItem.updateOne({ _id: existingItem._id }, {
              $set: {
                ...itemData,
                categoryId: targetCategoryId,
                branchId
              }
            });
          }
        } else {
          const newItem = new MenuItem({
            ...itemData,
            categoryId: targetCategoryId,
            branchId
          });
          await newItem.save();
        }
      }

      // Clear cache for target branch
      await clearMenuCache(restaurantId?.toString(), branchId);
      io.to(`restaurant_${restaurantId}_branch_${branchId}`).emit('menu_update', { timestamp: new Date().toISOString() });
    }

    res.json({ success: true, message: 'Menu shared successfully' });
  } catch (error) {
    console.error('Share Menu Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

