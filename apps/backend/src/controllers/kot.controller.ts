import { Response } from 'express';
import { KOT } from '../models/KOT';
import { io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const getActiveKOTs = async (req: AuthRequest, res: Response) => {
  try {
    const kots = await KOT.find({ restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}),
      status: { $in: ['PENDING', 'PREPARING', 'READY'] } 
    }).sort('createdAt');
    return res.json(kots);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateKOTItemStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { kotId, itemId } = req.params;
    const { status } = req.body;

    const kot = await KOT.findOne({ _id: kotId, restaurantId: req.user!.restaurantId });
    if (!kot) return res.status(404).json({ error: 'KOT not found' });

    const item = kot.items.find((i: any) => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.status = status;

    // Check if all items are ready
    const allReady = kot.items.every(i => i.status === 'READY');
    if (allReady) {
      kot.status = 'READY';
    } else if (kot.items.some(i => i.status === 'PREPARING' || i.status === 'READY')) {
      kot.status = 'PREPARING';
    }

    await kot.save();

    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('kot_update', { type: 'ITEM_STATUS_CHANGED', kot });

    return res.json(kot);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const notifyWaiter = async (req: AuthRequest, res: Response) => {
  try {
    const { kotId } = req.params;
    // const kot = await KOT.findById(kotId);
    // Real implementation: trigger FCM push notification to the waiter's device using firebase-admin

    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('waiter_notification', {
      type: 'KOT_READY',
      kotId
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
