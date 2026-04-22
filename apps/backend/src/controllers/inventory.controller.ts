import { Response } from 'express';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { InventoryItem } from '../models/InventoryItem';
import { Supplier } from '../models/Supplier';
import { PurchaseLog } from '../models/PurchaseLog';
import { WastageLog } from '../models/WastageLog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockStatus(item: { currentQty: number; minThreshold: number }): 'HEALTHY' | 'LOW' | 'CRITICAL' {
  if (item.currentQty <= 0) return 'CRITICAL';
  if (item.currentQty <= item.minThreshold) return 'LOW';
  if (item.currentQty <= item.minThreshold * 1.5) return 'LOW';
  return 'HEALTHY';
}

async function fireAlertIfLow(item: any, restaurantId: string) {
  if (stockStatus(item) !== 'HEALTHY') {
    // Real: call Firebase Admin SDK messaging.sendMulticast to OWNER + MANAGER FCM tokens
    console.log(`[LOW STOCK ALERT] ${item.name}: ${item.currentQty} ${item.unit} remaining (threshold: ${item.minThreshold})`);
  }
}

// ─── Inventory Items ──────────────────────────────────────────────────────────

export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const items = await InventoryItem.find({ restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}), isActive: true })
      .sort('category name');
    const enriched = items.map(i => ({
      ...i.toObject(),
      status: stockStatus(i),
    }));
    return res.json(enriched);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const createItem = async (req: AuthRequest, res: Response) => {
  try {
    const item = await InventoryItem.create({
      ...req.body,
      restaurantId: req.user!.restaurantId,
    });
    return res.status(201).json({ ...item.toObject(), status: stockStatus(item) });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user!.restaurantId },
      req.body, { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json({ ...item.toObject(), status: stockStatus(item) });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const deleteItem = async (req: AuthRequest, res: Response) => {
  try {
    await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user!.restaurantId },
      { isActive: false }
    );
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Purchase (Stock Addition) ────────────────────────────────────────────────

export const addStock = async (req: AuthRequest, res: Response) => {
  try {
    const {
      inventoryItemId, quantityAdded, costPerUnit, supplierName,
      supplierId, invoiceNumber, purchaseDate,
    } = req.body;

    const item = await InventoryItem.findOne({
      _id: inventoryItemId,
      restaurantId: req.user!.restaurantId,
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const totalCost = +(quantityAdded * costPerUnit).toFixed(2);

    // Update inventory quantity and latest cost
    item.currentQty = +(item.currentQty + quantityAdded).toFixed(3);
    item.costPerUnit = costPerUnit;
    if (supplierId) item.supplierId = supplierId;
    if (supplierName) item.supplierName = supplierName;
    await item.save();

    const log = await PurchaseLog.create({
      restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}),
      inventoryItemId: item._id,
      itemName: item.name,
      supplierId,
      supplierName,
      quantityAdded,
      unit: item.unit,
      costPerUnit,
      totalCost,
      invoiceNumber,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      recordedBy: req.user!.name || req.user!.userId,
    });

    return res.status(201).json({ item: { ...item.toObject(), status: stockStatus(item) }, log });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Wastage ──────────────────────────────────────────────────────────────────

export const logWastage = async (req: AuthRequest, res: Response) => {
  try {
    const { inventoryItemId, quantity, reason, notes } = req.body;

    const item = await InventoryItem.findOne({
      _id: inventoryItemId,
      restaurantId: req.user!.restaurantId,
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.currentQty < quantity) return res.status(400).json({ error: 'Insufficient stock to log wastage' });

    item.currentQty = +(item.currentQty - quantity).toFixed(3);
    await item.save();
    await fireAlertIfLow(item, req.user!.restaurantId!);

    const log = await WastageLog.create({
      restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}),
      inventoryItemId: item._id,
      itemName: item.name,
      quantity,
      unit: item.unit,
      reason,
      notes,
      estimatedCost: +(quantity * item.costPerUnit).toFixed(2),
      recordedBy: req.user!.name || req.user!.userId,
    });

    return res.status(201).json({ item: { ...item.toObject(), status: stockStatus(item) }, log });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const getSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const suppliers = await Supplier.find({ restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}), ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}) }).sort('name');
    return res.json(suppliers);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const createSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.create({ ...req.body, restaurantId: req.user!.restaurantId });
    return res.status(201).json(supplier);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const updateSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user!.restaurantId },
      req.body, { new: true }
    );
    if (!supplier) return res.status(404).json({ error: 'Not found' });
    return res.json(supplier);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Low Stock Summary ────────────────────────────────────────────────────────

export const getLowStockSummary = async (req: AuthRequest, res: Response) => {
  try {
    const items = await InventoryItem.find({ restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}), isActive: true });
    const low = items.filter(i => stockStatus(i) === 'LOW');
    const critical = items.filter(i => stockStatus(i) === 'CRITICAL');
    return res.json({ lowCount: low.length, criticalCount: critical.length, items: [...critical, ...low] });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Reports ──────────────────────────────────────────────────────────────────

const dateRange = (months: number) => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  return { $gte: start, $lte: end };
};

export const exportPurchaseReport = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await PurchaseLog.find({
      restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}),
      createdAt: dateRange(1),
    }).sort('-purchaseDate');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Purchase Report');

    ws.columns = [
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Item', key: 'item', width: 24 },
      { header: 'Supplier', key: 'supplier', width: 20 },
      { header: 'Qty Added', key: 'qty', width: 12 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Cost/Unit (₹)', key: 'cpu', width: 14 },
      { header: 'Total Cost (₹)', key: 'total', width: 16 },
      { header: 'Invoice #', key: 'inv', width: 16 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800000' } };

    for (const l of logs) {
      ws.addRow({
        date: l.purchaseDate.toLocaleDateString('en-IN'),
        item: l.itemName,
        supplier: l.supplierName || '',
        qty: l.quantityAdded,
        unit: l.unit,
        cpu: l.costPerUnit,
        total: l.totalCost,
        inv: l.invoiceNumber || '',
      });
    }

    const totals = ws.addRow({ item: 'TOTAL', total: logs.reduce((s, l) => s + l.totalCost, 0) });
    totals.font = { bold: true };
    totals.getCell('total').numFmt = '₹#,##0.00';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="purchase-report-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    await wb.xlsx.write(res);
    return res.end();
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

export const exportWastageReport = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await WastageLog.find({
      restaurantId: req.user!.restaurantId, ...(req.query.branchId && typeof req.query.branchId === 'string' ? { branchId: req.query.branchId } : {}),
      createdAt: dateRange(1),
    }).sort('-createdAt');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Wastage Report');

    ws.columns = [
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Item', key: 'item', width: 24 },
      { header: 'Qty Wasted', key: 'qty', width: 12 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Reason', key: 'reason', width: 14 },
      { header: 'Notes', key: 'notes', width: 28 },
      { header: 'Est. Cost (₹)', key: 'cost', width: 14 },
      { header: 'Recorded By', key: 'by', width: 18 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC0000' } };

    for (const l of logs) {
      ws.addRow({
        date: ((l as any).createdAt as Date).toLocaleDateString('en-IN'),
        item: l.itemName,
        qty: l.quantity,
        unit: l.unit,
        reason: l.reason,
        notes: l.notes || '',
        cost: l.estimatedCost,
        by: l.recordedBy,
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="wastage-report-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    await wb.xlsx.write(res);
    return res.end();
  } catch { return res.status(500).json({ error: 'Server error' }); }
};
