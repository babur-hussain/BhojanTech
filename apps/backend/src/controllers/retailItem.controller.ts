import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RetailItem } from '../models/RetailItem';
import { getBaseQuery, getCreateBranchId } from '../utils/queryHelpers';

// ─── List all retail items ───────────────────────────────────────────────────
export const listRetailItems = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    const items = await RetailItem.find(query).sort({ category: 1, name: 1 }).lean();
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Lookup by barcode ───────────────────────────────────────────────────────
export const lookupByBarcode = async (req: AuthRequest, res: Response) => {
  try {
    const { barcode } = req.params;
    const item = await RetailItem.findOne({
      barcode,
      restaurantId: req.user!.restaurantId,
      isActive: true,
    }).lean();
    if (!item) return res.status(404).json({ found: false, error: 'No item with that barcode' });
    return res.json({ found: true, item });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Create retail item ──────────────────────────────────────────────────────
export const createRetailItem = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      name, description, brand, category, 
      priceINR, costPriceINR, mrp, taxInclusive, gstSlab, 
      unit, stock, lowStockAlert, sku, barcode, hsnCode 
    } = req.body;
    
    if (!name || priceINR == null) return res.status(400).json({ error: 'name and priceINR are required' });

    const branchId = getCreateBranchId(req);
    const item = await RetailItem.create({
      restaurantId: req.user!.restaurantId,
      branchId: branchId || undefined,
      name, 
      description: description || undefined,
      brand: brand || undefined,
      category: category || 'General',
      priceINR, 
      costPriceINR: costPriceINR || undefined,
      mrp: mrp || undefined,
      taxInclusive: taxInclusive !== undefined ? taxInclusive : true,
      gstSlab: gstSlab ?? 18,
      unit: unit || 'pcs',
      stock: stock ?? 0,
      lowStockAlert: lowStockAlert ?? 5,
      sku: sku || undefined,
      barcode: barcode || undefined,
      hsnCode: hsnCode || undefined,
    });
    return res.status(201).json(item);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Update retail item ──────────────────────────────────────────────────────
export const updateRetailItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = await RetailItem.findOneAndUpdate(
      { _id: id, restaurantId: req.user!.restaurantId },
      { $set: req.body },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Delete (soft deactivate) retail item ───────────────────────────────────
export const deleteRetailItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await RetailItem.findOneAndUpdate(
      { _id: id, restaurantId: req.user!.restaurantId },
      { isActive: false }
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Adjust stock (add/remove) ───────────────────────────────────────────────
export const adjustStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { delta, note } = req.body; // delta: +N or -N
    if (delta == null) return res.status(400).json({ error: 'delta is required' });

    const item = await RetailItem.findOneAndUpdate(
      { _id: id, restaurantId: req.user!.restaurantId },
      { $inc: { stock: delta } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
