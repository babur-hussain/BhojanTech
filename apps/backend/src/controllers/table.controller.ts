import { Response } from 'express';
import { Table } from '../models/Table';
import { io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { getBaseQuery, getCreateBranchId } from '../utils/queryHelpers';

export const getTables = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    const tables = await Table.find(query).populate('currentOrderId');
    return res.json(tables);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createTable = async (req: AuthRequest, res: Response) => {
  try {
    const { number, capacity } = req.body;
    const branchId = getCreateBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Branch ID is required' });

    const table = await Table.create({
      restaurantId: req.user!.restaurantId,
      branchId,
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
    const query = getBaseQuery(req);
    query._id = req.params.id;
    const table = await Table.findOneAndUpdate(
      query,
      { status },
      { new: true }
    ).populate('currentOrderId');

    if (!table) return res.status(404).json({ error: 'Not found' });

    io.to(`restaurant_${req.user!.restaurantId}_branch_${table.branchId}`).emit('table_update', { type: 'STATUS_CHANGED', table });
    return res.json(table);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};
