import { Response } from 'express';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { AuthRequest } from '../middleware/auth.middleware';
import { Invoice } from '../models/Invoice';
import { Order } from '../models/Order';
import { Table } from '../models/Table';
import { Attendance } from '../models/Attendance';
import { WastageLog } from '../models/WastageLog';
import { PurchaseLog } from '../models/PurchaseLog';
import { redis } from '../config/redis';
import { getBaseQuery } from '../utils/queryHelpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toINR = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

function dayRange(dateStr: string) {
  const d = new Date(dateStr);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthRange(ym: string) { // YYYY-MM
  const [y, m] = ym.split('-').map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) };
}

// ─── Live Activity (Deep Real-Time Monitor) ───────────────────────────────────

export const liveActivity = async (req: AuthRequest, res: Response) => {
  try {
    const rid = new mongoose.Types.ObjectId(req.user!.restaurantId);
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const query = getBaseQuery(req);

    const [tables, openOrders, todayInvoices, recentInvoices] = await Promise.all([
      Table.find(query).populate('currentOrderId').lean(),
      Order.find({ ...query, status: { $in: ['OPEN', 'BILLED'] } }).sort({ createdAt: -1 }).lean(),
      Invoice.find({ ...query, createdAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      Invoice.find(query).sort({ createdAt: -1 }).limit(15).lean(),
    ]);

    // Table enrichment
    const enrichedTables = tables.map(t => {
      const order = openOrders.find(o => o._id.toString() === (t.currentOrderId as any)?._id?.toString() || o._id.toString() === t.currentOrderId?.toString());
      const seatedMins = t.seatedAt ? Math.floor((now.getTime() - new Date(t.seatedAt).getTime()) / 60000) : null;
      return {
        ...t,
        seatedMins,
        currentOrder: order || null,
      };
    });

    // Hourly revenue for today (last 12 active hours)
    const hourMap: Record<number, { orders: number; revenue: number }> = {};
    todayInvoices.forEach(inv => {
      const h = new Date(inv.createdAt as Date).getHours();
      if (!hourMap[h]) hourMap[h] = { orders: 0, revenue: 0 };
      hourMap[h].orders++;
      hourMap[h].revenue += inv.grandTotalINR;
    });
    const currentHour = now.getHours();
    const hourlyData = Array.from({ length: currentHour + 1 }, (_, h) => ({
      hour: h,
      label: `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`,
      orders: hourMap[h]?.orders || 0,
      revenue: hourMap[h]?.revenue || 0,
    })).filter(h => h.hour >= 6);

    // Payment mode split today
    const modeMap: Record<string, { count: number; amount: number }> = {};
    todayInvoices.forEach(inv => {
      const m = inv.paymentMode || 'CASH';
      if (!modeMap[m]) modeMap[m] = { count: 0, amount: 0 };
      modeMap[m].count++;
      modeMap[m].amount += inv.grandTotalINR;
    });

    // Active order aging buckets
    const agingBuckets = { fresh: 0, moderate: 0, long: 0, critical: 0 };
    openOrders.forEach(o => {
      const mins = Math.floor((now.getTime() - new Date((o as any).createdAt as Date).getTime()) / 60000);
      if (mins < 20) agingBuckets.fresh++;
      else if (mins < 35) agingBuckets.moderate++;
      else if (mins < 50) agingBuckets.long++;
      else agingBuckets.critical++;
    });

    // Avg dine time (from billed orders today)
    const billedToday = openOrders.filter(o => o.status === 'BILLED');

    const payload = {
      sessionStart: todayStart,
      now,
      tables: enrichedTables,
      openOrdersCount: openOrders.filter(o => o.status === 'OPEN').length,
      billedOrdersCount: openOrders.filter(o => o.status === 'BILLED').length,
      totalActiveOrders: openOrders.length,
      occupiedTables: tables.filter(t => t.status === 'OCCUPIED').length,
      availableTables: tables.filter(t => t.status === 'AVAILABLE').length,
      reservedTables: tables.filter(t => t.status === 'RESERVED').length,
      totalTables: tables.length,
      todayRevenue: todayInvoices.reduce((s, i) => s + i.grandTotalINR, 0),
      todayOrders: todayInvoices.length,
      todayAvgBill: todayInvoices.length > 0 ? +(todayInvoices.reduce((s, i) => s + i.grandTotalINR, 0) / todayInvoices.length).toFixed(2) : 0,
      liveTabValue: openOrders.reduce((s, o) => s + o.totalAmountINR, 0),
      hourlyData,
      paymentModeSplit: Object.entries(modeMap).map(([mode, v]) => ({ mode, ...v })),
      agingBuckets,
      recentInvoices: recentInvoices.map(i => ({
        invoiceNumber: i.invoiceNumber,
        tableNumber: i.tableNumber,
        waiterName: i.waiterName,
        grandTotal: i.grandTotalINR,
        paymentMode: i.paymentMode,
        createdAt: i.createdAt,
      })),
    };

    return res.json(payload);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
};

// ─── Live Dashboard KPIs ──────────────────────────────────────────────────────

export const liveDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const rid = new mongoose.Types.ObjectId(req.user!.restaurantId);
    const bId = req.query.branchId || req.user!.branchId || 'all';
    const cacheKey = `analytics:liveDashboard:${rid.toString()}:${bId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch { /* Redis unavailable — fall through to DB */ }

    const todayStr = new Date().toISOString().slice(0, 10);
    const { start: todayStart, end: todayEnd } = dayRange(todayStr);

    const yday = new Date(todayStart); yday.setDate(yday.getDate() - 1);
    const lastWeekSameDay = new Date(todayStart); lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7);

    const query = getBaseQuery(req);
    if (req.query.branchId && req.query.branchId !== 'all' && req.query.branchId !== 'null') {
      query.branchId = req.query.branchId;
    } else if (req.query.branchId === 'all') {
      delete query.branchId; // allow fetching for all branches
    }

    const [todayInvoices, ydayInvoices, lwInvoices, tables, activeOrders, recentOrders] = await Promise.all([
      Invoice.find({ ...query, createdAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      Invoice.find({ ...query, createdAt: { $gte: new Date(yday.setHours(0, 0, 0, 0)), $lte: new Date(yday.setHours(23, 59, 59, 999)) } }).lean(),
      Invoice.find({ ...query, createdAt: { $gte: new Date(lastWeekSameDay.setHours(0, 0, 0, 0)), $lte: new Date(lastWeekSameDay.setHours(23, 59, 59, 999)) } }).lean(),
      Table.find(query).lean(),
      Order.countDocuments({ ...query, status: 'OPEN' }),
      Invoice.find(query).sort('-createdAt').limit(10).populate('branchId', 'name').lean(),
    ]);

    const todayRevenue = todayInvoices.reduce((s, i) => s + i.grandTotalINR, 0);
    const ydayRevenue = ydayInvoices.reduce((s, i) => s + i.grandTotalINR, 0);
    const lwRevenue = lwInvoices.reduce((s, i) => s + i.grandTotalINR, 0);

    const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length;
    const occupancyRate = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;

    const payload = {
      todayRevenue,
      todayOrders: todayInvoices.length,
      avgOrderValue: todayInvoices.length > 0 ? +(todayRevenue / todayInvoices.length).toFixed(2) : 0,
      vsYesterday: ydayRevenue > 0 ? +((todayRevenue - ydayRevenue) / ydayRevenue * 100).toFixed(1) : 0,
      vsLastWeek: lwRevenue > 0 ? +((todayRevenue - lwRevenue) / lwRevenue * 100).toFixed(1) : 0,
      occupancyRate,
      occupiedTables,
      totalTables: tables.length,
      activeOrders,
      recentOrders: recentOrders.map(i => ({
        invoiceNumber: i.invoiceNumber,
        tableNumber: i.tableNumber,
        waiterName: i.waiterName,
        grandTotal: i.grandTotalINR,
        paymentMode: i.paymentMode,
        createdAt: i.createdAt,
        branchName: (i.branchId as any)?.name || 'Main Branch',
      })),
    };

    try { await redis.set(cacheKey, JSON.stringify(payload), 'EX', 300); } catch { /* ignore */ }
    return res.json(payload);
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
};

// ─── 7-day Revenue Trend ──────────────────────────────────────────────────────

export const revenueTrend = async (req: AuthRequest, res: Response) => {
  try {
    const rid = new mongoose.Types.ObjectId(req.user!.restaurantId);
    const bId = req.user!.branchId || 'all';
    const cacheKey = `analytics:revenueTrend:${rid.toString()}:${bId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch { /* Redis unavailable — fall through to DB */ }

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10);
    });

    const query = getBaseQuery(req);

    const data = await Promise.all(days.map(async date => {
      const { start, end } = dayRange(date);
      const invoices = await Invoice.find({ ...query, createdAt: { $gte: start, $lte: end } }).lean();
      const revenue = invoices.reduce((s, i) => s + i.grandTotalINR, 0);
      return { date, revenue: +revenue.toFixed(2), orders: invoices.length };
    }));

    try { await redis.set(cacheKey, JSON.stringify(data), 'EX', 300); } catch { /* ignore */ }
    return res.json(data);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Hourly Order Volume ──────────────────────────────────────────────────────

export const hourlyVolume = async (req: AuthRequest, res: Response) => {
  try {
    const rid = new mongoose.Types.ObjectId(req.user!.restaurantId);
    const bId = req.user!.branchId || 'all';
    const cacheKey = `analytics:hourlyVolume:${rid.toString()}:${bId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch { /* Redis unavailable — fall through to DB */ }

    const todayStr = new Date().toISOString().slice(0, 10);
    const { start, end } = dayRange(todayStr);

    const query = getBaseQuery(req);
    const invoices = await Invoice.find({ ...query, createdAt: { $gte: start, $lte: end } }).lean();
    const hourMap = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0, revenue: 0 }));
    invoices.forEach(inv => {
      const h = new Date(inv.createdAt as Date).getHours();
      hourMap[h].orders++;
      hourMap[h].revenue += inv.grandTotalINR;
    });

    const payload = hourMap.filter(h => h.hour >= 7 && h.hour <= 23);
    try { await redis.set(cacheKey, JSON.stringify(payload), 'EX', 300); } catch { /* ignore */ }
    return res.json(payload);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Revenue by Category ──────────────────────────────────────────────────────

export const revenueByCategory = async (req: AuthRequest, res: Response) => {
  try {
    const rid = new mongoose.Types.ObjectId(req.user!.restaurantId);
    const bId = req.user!.branchId || 'all';
    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const cacheKey = `analytics:revenueByCategory:${rid.toString()}:${bId}:${dateStr}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch { /* Redis unavailable — fall through to DB */ }

    const { start, end } = dayRange(dateStr);
    const query = getBaseQuery(req);
    // aggregate match needs raw object
    const matchQuery = { ...query, createdAt: { $gte: start, $lte: end } };
    // Mongoose convert objectid
    matchQuery.restaurantId = rid;
    if (matchQuery.branchId) matchQuery.branchId = new mongoose.Types.ObjectId(matchQuery.branchId as string);

    const result = await Invoice.aggregate([
      { $match: matchQuery },
      { $unwind: '$lineItems' },
      { $group: { _id: '$lineItems.hsnCode', total: { $sum: '$lineItems.lineTotal' } } },
    ]);
    try { await redis.set(cacheKey, JSON.stringify(result), 'EX', 300); } catch { /* ignore */ }
    return res.json(result);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── GST Report (GSTR-1 ready) ────────────────────────────────────────────────

export const gstReport = async (req: AuthRequest, res: Response) => {
  try {
    const rid = new mongoose.Types.ObjectId(req.user!.restaurantId);
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const { start, end } = monthRange(month);

    const query = getBaseQuery(req);
    const invoices = await Invoice.find({ ...query, createdAt: { $gte: start, $lte: end } });

    // Aggregate by slab
    const slabMap: Record<number, { taxable: number; cgst: number; sgst: number; count: number }> = {};
    invoices.forEach(inv => {
      inv.gstBreakup.forEach(g => {
        if (!slabMap[g.slab]) slabMap[g.slab] = { taxable: 0, cgst: 0, sgst: 0, count: 0 };
        slabMap[g.slab].taxable += g.taxableAmount;
        slabMap[g.slab].cgst += g.cgst;
        slabMap[g.slab].sgst += g.sgst;
        slabMap[g.slab].count += 1;
      });
    });

    const totalGST = invoices.reduce((s, i) => s + i.totalGSTINR, 0);

    return res.json({
      month,
      totalInvoices: invoices.length,
      totalRevenue: +invoices.reduce((s, i) => s + i.grandTotalINR, 0).toFixed(2),
      totalGST: +totalGST.toFixed(2),
      totalCGST: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.cgst, 0), 0).toFixed(2),
      totalSGST: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.sgst, 0), 0).toFixed(2),
      slabBreakup: Object.entries(slabMap).map(([slab, v]) => ({ slab: +slab, ...v })),
      invoices: invoices.map(i => ({
        date: (i.createdAt as Date).toLocaleDateString('en-IN'),
        invoiceNumber: i.invoiceNumber,
        tableNumber: i.tableNumber,
        grandTotal: i.grandTotalINR,
        taxableAmount: i.gstBreakup.reduce((s, g) => s + g.taxableAmount, 0),
        cgst: i.gstBreakup.reduce((s, g) => s + g.cgst, 0),
        sgst: i.gstBreakup.reduce((s, g) => s + g.sgst, 0),
        totalGST: i.totalGSTINR,
        hsnCode: '9963',
      })),
    });
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Excel GST Export (GSTR-1 format) ────────────────────────────────────────

export const exportGSTExcel = async (req: AuthRequest, res: Response) => {
  try {
    const rid = new mongoose.Types.ObjectId(req.user!.restaurantId);
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const { start, end } = monthRange(month);

    const query = getBaseQuery(req);
    const invoices = await Invoice.find({ ...query, createdAt: { $gte: start, $lte: end } });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Restaurant Management System';

    // Sheet 1: B2C Summary (GSTR-1 Table 7)
    const ws = wb.addWorksheet('B2C GST Summary');
    ws.columns = [
      { header: 'Invoice No.', key: 'inv', width: 22 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Table', key: 'table', width: 8 },
      { header: 'HSN Code', key: 'hsn', width: 12 },
      { header: 'GST Rate %', key: 'rate', width: 12 },
      { header: 'Taxable Value (₹)', key: 'taxable', width: 20 },
      { header: 'CGST (₹)', key: 'cgst', width: 14 },
      { header: 'SGST (₹)', key: 'sgst', width: 14 },
      { header: 'Total GST (₹)', key: 'gst', width: 14 },
      { header: 'Invoice Value (₹)', key: 'total', width: 18 },
    ];

    const hdrRow = ws.getRow(1);
    hdrRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hdrRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800000' } };

    invoices.forEach(inv => {
      inv.gstBreakup.forEach(g => {
        ws.addRow({
          inv: inv.invoiceNumber,
          date: (inv.createdAt as Date).toLocaleDateString('en-IN'),
          table: inv.tableNumber,
          hsn: '9963',
          rate: `${g.slab}%`,
          taxable: +g.taxableAmount.toFixed(2),
          cgst: +g.cgst.toFixed(2),
          sgst: +g.sgst.toFixed(2),
          gst: +(g.cgst + g.sgst).toFixed(2),
          total: +inv.grandTotalINR.toFixed(2),
        });
      });
    });

    // Totals row
    const last = ws.lastRow!.number + 1;
    const totRow = ws.addRow({
      inv: 'TOTAL',
      taxable: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.taxableAmount, 0), 0).toFixed(2),
      cgst: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.cgst, 0), 0).toFixed(2),
      sgst: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.sgst, 0), 0).toFixed(2),
      gst: +invoices.reduce((s, i) => s + i.totalGSTINR, 0).toFixed(2),
      total: +invoices.reduce((s, i) => s + i.grandTotalINR, 0).toFixed(2),
    });
    totRow.font = { bold: true };
    totRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0E0' } };

    // Sheet 2: HSN Summary
    const ws2 = wb.addWorksheet('HSN Summary');
    ws2.columns = [
      { header: 'HSN/SAC', key: 'hsn', width: 12 },
      { header: 'Description', key: 'desc', width: 30 },
      { header: 'UQC', key: 'uqc', width: 8 },
      { header: 'Total Qty', key: 'qty', width: 12 },
      { header: 'Taxable Value (₹)', key: 'taxable', width: 20 },
      { header: 'CGST (₹)', key: 'cgst', width: 14 },
      { header: 'SGST (₹)', key: 'sgst', width: 14 },
    ];
    ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800000' } };
    ws2.addRow({
      hsn: '9963', desc: 'Restaurant Services', uqc: 'OTH',
      qty: invoices.reduce((s, i) => s + i.lineItems.reduce((ss, l) => ss + l.quantity, 0), 0),
      taxable: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.taxableAmount, 0), 0).toFixed(2),
      cgst: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.cgst, 0), 0).toFixed(2),
      sgst: +invoices.reduce((s, i) => s + i.gstBreakup.reduce((ss, g) => ss + g.sgst, 0), 0).toFixed(2),
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="GSTR1-${month}.xlsx"`);
    await wb.xlsx.write(res);
    return res.end();
  } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
};

// ─── Sales Report ─────────────────────────────────────────────────────────────

export const salesReport = async (req: AuthRequest, res: Response) => {
  try {
    const rid = new mongoose.Types.ObjectId(req.user!.restaurantId);
    const bId = req.user!.branchId || 'all';
    const { from, to } = req.query as { from: string; to: string };
    const cacheKey = `analytics:salesReport:${rid.toString()}:${bId}:${from || 'all'}:${to || 'all'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const start = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const query = getBaseQuery(req);
    const invoices = await Invoice.find({ ...query, createdAt: { $gte: start, $lte: end } }).read('secondaryPreferred').lean();

    // Payment mode split
    const modeMap: Record<string, number> = { CASH: 0, CARD: 0, UPI: 0, SPLIT: 0 };
    invoices.forEach(i => { modeMap[i.paymentMode] = (modeMap[i.paymentMode] || 0) + i.grandTotalINR; });

    // Top items
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    invoices.forEach(inv => inv.lineItems.forEach(l => {
      const k = l.name + (l.variantName ? ` (${l.variantName})` : '');
      if (!itemMap[k]) itemMap[k] = { name: k, qty: 0, revenue: 0 };
      itemMap[k].qty += l.quantity;
      itemMap[k].revenue += l.lineTotal;
    }));
    const sortedItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);

    const payload = {
      totalRevenue: +invoices.reduce((s, i) => s + i.grandTotalINR, 0).toFixed(2),
      totalOrders: invoices.length,
      avgBillValue: invoices.length > 0 ? +(invoices.reduce((s, i) => s + i.grandTotalINR, 0) / invoices.length).toFixed(2) : 0,
      paymentModeSplit: modeMap,
      top10Items: sortedItems.slice(0, 10),
      bottom10Items: sortedItems.slice(-10).reverse(),
    };
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 300);
    return res.json(payload);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};

// ─── Monthly Comparison ───────────────────────────────────────────────────────

export const monthlyComparison = async (req: AuthRequest, res: Response) => {
  try {
    const rid = new mongoose.Types.ObjectId(req.user!.restaurantId);
    const bId = req.user!.branchId || 'all';
    const cacheKey = `analytics:monthlyComparison:${rid.toString()}:${bId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch { /* Redis unavailable — fall through to DB */ }

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const query = getBaseQuery(req);

    const data = await Promise.all(months.map(async m => {
      const { start, end } = monthRange(m);
      const invoices = await Invoice.find({ ...query, createdAt: { $gte: start, $lte: end } }).lean();
      const revenue = invoices.reduce((s, i) => s + i.grandTotalINR, 0);
      return { month: m, revenue: +revenue.toFixed(2), orders: invoices.length };
    }));

    return res.json(data);
  } catch { return res.status(500).json({ error: 'Server error' }); }
};
