import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RetailItem } from '../models/RetailItem';
import { StockLog } from '../models/StockLog';
import { getBaseQuery, getCreateBranchId } from '../utils/queryHelpers';
import mongoose from 'mongoose';

// ─── Shared: write one audit log row ─────────────────────────────────────────
async function writeStockLog(params: {
  req: AuthRequest;
  item: any;
  action: 'GRN' | 'MANUAL_ADD' | 'MANUAL_REMOVE' | 'SALE' | 'WASTAGE' | 'CORRECTION' | 'INITIAL';
  quantityBefore: number;
  quantityChanged: number;
  note?: string;
}) {
  const { req, item, action, quantityBefore, quantityChanged, note } = params;
  const user = req.user!;

  // Extract real client IP (handles proxies)
  const deviceIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  await StockLog.create({
    restaurantId:    item.restaurantId,
    branchId:        item.branchId,
    retailItemId:    item._id,
    itemName:        item.name,
    barcode:         item.barcode,
    sku:             item.sku,
    action,
    quantityBefore,
    quantityChanged,
    quantityAfter:   quantityBefore + quantityChanged,
    userId:          new mongoose.Types.ObjectId(user.userId),
    userName:        user.name || 'Unknown',
    userRole:        user.role || 'STAFF',
    note,
    deviceIp,
    userAgent:       req.headers['user-agent'] || '',
  });
}

// ─── List all retail items ───────────────────────────────────────────────────
export const listRetailItems = async (req: AuthRequest, res: Response) => {
  try {
    // If Mongoose is not connected, return 503 so frontend knows to retry
    if (mongoose.connection.readyState !== 1) {
      console.warn('[listRetailItems] MongoDB not connected (readyState:', mongoose.connection.readyState, ')');
      return res.status(503).json({ error: 'Database temporarily unavailable' });
    }

    const query: any = { restaurantId: req.user!.restaurantId };

    // Branch scoping: include items for the selected branch AND items with no branch
    // (legacy items created before branch support, or global items)
    if (req.user!.branchId) {
      query.$or = [
        { branchId: req.user!.branchId },
        { branchId: { $exists: false } },
        { branchId: null },
      ];
    }

    const items = await RetailItem.find(query).sort({ category: 1, name: 1 }).lean();
    return res.json(items);
  } catch (err: any) {
    console.error('[listRetailItems] Failed:', {
      error: err?.message,
      restaurantId: req.user?.restaurantId,
      branchId: req.user?.branchId,
    });
    return res.status(500).json({ error: 'Server error fetching retail items' });
  }
};

// ─── Lookup by barcode ───────────────────────────────────────────────────────
export const lookupByBarcode = async (req: AuthRequest, res: Response) => {
  try {
    const { barcode } = req.params;
    const base = getBaseQuery(req);
    const item = await RetailItem.findOne({ ...base, barcode, isActive: true }).lean();
    if (!item) return res.status(404).json({ found: false });
    return res.json({ found: true, item });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Create retail item ──────────────────────────────────────────────────────
// PRODUCTION RULE: If the submitted barcode already exists for this branch,
// do NOT create a new item — return 409 DUPLICATE with the existing item so
// the frontend can open the Stock Receive (GRN) flow instead.
export const createRetailItem = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, description, brand, category,
      priceINR, costPriceINR, mrp, taxInclusive, gstSlab,
      unit, stock, lowStockAlert, sku, barcode, hsnCode,
    } = req.body;

    if (!name || priceINR == null) {
      return res.status(400).json({ error: 'name and priceINR are required' });
    }

    const branchId = getCreateBranchId(req);
    const base = { restaurantId: req.user!.restaurantId, branchId: branchId || undefined };

    // ── BARCODE DUPLICATE CHECK ──────────────────────────────────────────────
    if (barcode && barcode.trim()) {
      const existing = await RetailItem.findOne({
        restaurantId: base.restaurantId,
        ...(branchId ? { branchId } : {}),
        barcode: barcode.trim(),
      }).lean();

      if (existing) {
        // Return 409 with the existing item so frontend can open GRN modal
        return res.status(409).json({
          error: 'BARCODE_EXISTS',
          message: `Barcode already registered to "${existing.name}". Use stock receive instead.`,
          existingItem: existing,
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const item = await RetailItem.create({
      ...base,
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
      stock: stock !== undefined ? Number(stock) : 0,
      lowStockAlert: lowStockAlert !== undefined ? Number(lowStockAlert) : 5,
      sku: sku || undefined,
      barcode: barcode?.trim() || undefined,
      hsnCode: hsnCode || undefined,
    });

    const parsedStock = stock !== undefined ? Number(stock) : 0;
    // Log initial stock if stock > 0
    if (parsedStock > 0) {
      await writeStockLog({
        req, item,
        action: 'INITIAL',
        quantityBefore: 0,
        quantityChanged: parsedStock,
        note: 'Initial stock on item creation',
      });
    }

    return res.status(201).json(item);
  } catch (err: any) {
    if (err.code === 11000) {
      // MongoDB unique index violation (race condition safety net)
      const existing = await RetailItem.findOne({
        restaurantId: req.user!.restaurantId,
        barcode: req.body.barcode?.trim(),
      }).lean();
      return res.status(409).json({
        error: 'BARCODE_EXISTS',
        message: 'Barcode already exists.',
        existingItem: existing,
      });
    }
    console.error('[createRetailItem]', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Update retail item metadata ─────────────────────────────────────────────
export const updateRetailItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stock: newStockRaw, ...metaBody } = req.body;

    // First fetch current item so we can detect stock changes
    const itemBefore = await RetailItem.findOne({ _id: id, restaurantId: req.user!.restaurantId });
    if (!itemBefore) return res.status(404).json({ error: 'Item not found' });

    const updatePayload: any = { ...metaBody };

    // Allow stock override via edit form — log as CORRECTION
    if (newStockRaw != null && newStockRaw !== '' && Number(newStockRaw) !== itemBefore.stock) {
      const newStock = Math.max(0, Number(newStockRaw));
      updatePayload.stock = newStock;
    }

    const item = await RetailItem.findByIdAndUpdate(id, { $set: updatePayload }, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Write CORRECTION log if stock changed
    const stockBefore = itemBefore.stock;
    const stockAfter  = item.stock;
    if (stockAfter !== stockBefore) {
      await writeStockLog({
        req, item,
        action: 'CORRECTION',
        quantityBefore: stockBefore,
        quantityChanged: stockAfter - stockBefore,
        note: 'Stock corrected via item edit form',
      });
    }

    return res.json(item);
  } catch (err) {
    console.error('[updateRetailItem]', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Delete (soft deactivate) retail item ────────────────────────────────────
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

// ─── Adjust stock (GRN / manual) — FULL AUDIT LOG ───────────────────────────
// action: 'GRN' (scanner/receive), 'MANUAL_ADD', 'MANUAL_REMOVE', 'WASTAGE', 'CORRECTION'
export const adjustStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { delta, action = 'MANUAL_ADD', note } = req.body;
    if (delta == null) return res.status(400).json({ error: 'delta is required' });

    // Fetch current stock first (for the log)
    const itemBefore = await RetailItem.findOne({
      _id: id,
      restaurantId: req.user!.restaurantId,
    });
    if (!itemBefore) return res.status(404).json({ error: 'Item not found' });

    const stockBefore = itemBefore.stock;
    const newStock = Math.max(0, stockBefore + Number(delta));

    const updatedItem = await RetailItem.findByIdAndUpdate(
      id,
      { $set: { stock: newStock } },
      { new: true }
    );

    // Write immutable audit log
    await writeStockLog({
      req,
      item: updatedItem!,
      action: action as any,
      quantityBefore: stockBefore,
      quantityChanged: Number(delta),
      note,
    });

    return res.json({
      item: updatedItem,
      log: {
        action,
        quantityBefore: stockBefore,
        quantityChanged: Number(delta),
        quantityAfter: newStock,
      },
    });
  } catch (err) {
    console.error('[adjustStock]', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── GRN via barcode (scanner receive flow) ──────────────────────────────────
// Called when scanner finds existing item: receives qty and logs as GRN
export const receiveStockByBarcode = async (req: AuthRequest, res: Response) => {
  try {
    const { barcode } = req.params;
    const { quantity, note, costPriceINR } = req.body;

    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'quantity must be a positive number' });
    }

    const base = getBaseQuery(req);
    const item = await RetailItem.findOne({ ...base, barcode: barcode.trim(), isActive: true });
    if (!item) return res.status(404).json({ found: false, error: 'No active item with that barcode' });

    const stockBefore = item.stock;
    const qty = Number(quantity);
    item.stock = stockBefore + qty;

    // Optionally update cost price if provided (for FIFO/LIFO setups later)
    if (costPriceINR != null) {
      item.costPriceINR = Number(costPriceINR);
    }

    await item.save();

    await writeStockLog({
      req, item,
      action: 'GRN',
      quantityBefore: stockBefore,
      quantityChanged: qty,
      note: note || 'Stock received via barcode scan',
    });

    return res.json({
      success: true,
      item,
      log: { action: 'GRN', quantityBefore: stockBefore, quantityChanged: qty, quantityAfter: item.stock },
    });
  } catch (err) {
    console.error('[receiveStockByBarcode]', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Get stock audit log for an item ─────────────────────────────────────────
export const getStockLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const [logs, total] = await Promise.all([
      StockLog.find({ retailItemId: id, restaurantId: req.user!.restaurantId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StockLog.countDocuments({ retailItemId: id, restaurantId: req.user!.restaurantId }),
    ]);

    return res.json({ logs, total, page, limit });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
