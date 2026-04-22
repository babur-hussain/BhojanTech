import { Request, Response } from 'express';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';
import { io } from '../index';
import { generatePresignedUrl } from '../utils/s3';
import { AuthRequest } from '../middleware/auth.middleware';
import { scheduleMenuSync } from '../services/menuSync.service';
import { redis } from '../config/redis';

const clearMenuCache = async (restaurantId?: string, branchId?: string | null) => {
  if (!restaurantId) return;
  const bId = branchId || 'all';
  await redis.del(`menu_categories:${restaurantId}:${bId}`);
  await redis.del(`menu_items:${restaurantId}:${bId}`);
  // If global update, probably best to clear patterns but let's stick to exact keys or wildcard
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

// CATEGORIES
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : 'all';
    const cacheKey = `menu_categories:${req.user!.restaurantId}:${branchId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const categories = await MenuCategory.find({ restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}) }).sort('order').lean();

    await redis.set(cacheKey, JSON.stringify(categories), 'EX', 3600);
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const category = await MenuCategory.create({
      restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}),
      name: req.body.name,
      order: req.body.order || 0,
    });
    await clearMenuCache(req.user!.restaurantId, typeof req.query.branchId === 'string' ? req.query.branchId : undefined);
    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateCategoryAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const category = await MenuCategory.findOneAndUpdate(
      { _id: id, restaurantId: req.user!.restaurantId },
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
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : 'all';
    const cacheKey = `menu_items:${req.user!.restaurantId}:${branchId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const items = await MenuItem.find({ restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}) }).lean();

    await redis.set(cacheKey, JSON.stringify(items), 'EX', 3600);
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const item = await MenuItem.create({
      ...req.body,
      restaurantId: req.user!.restaurantId,
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
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user!.restaurantId },
      req.body,
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

export const updateItemAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, restaurantId: req.user!.restaurantId },
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
