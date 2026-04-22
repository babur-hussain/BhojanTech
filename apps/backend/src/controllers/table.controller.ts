import { Response } from 'express';
import { Table } from '../models/Table';
import { io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const getTables = async (req: AuthRequest, res: Response) => {
  try {
    const tables = await Table.find({ restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}), ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}) }).populate('currentOrderId');
    return res.json(tables);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createTable = async (req: AuthRequest, res: Response) => {
  try {
    const { number, capacity, branchId: bodyBranchId } = req.body;
    const queryBranchId = req.query.branchId && typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
    const branchId = queryBranchId || bodyBranchId || req.user!.branchId;

    const table = await Table.create({
      restaurantId: req.user!.restaurantId,
      ...(branchId ? { branchId } : {}),
      number,
      capacity,
    });

    io.to(`restaurant_${req.user!.restaurantId}_branch_${branchId}`).emit('table_update', { type: 'TABLE_ADDED', table });
    return res.status(201).json(table);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateTableStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const table = await Table.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user!.restaurantId },
      { status },
      { new: true }
    ).populate('currentOrderId');

    if (!table) return res.status(404).json({ error: 'Not found' });

    io.to(`restaurant_${req.user!.restaurantId}_branch_${req.user!.branchId}`).emit('table_update', { type: 'STATUS_CHANGED', table });
    return res.json(table);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
