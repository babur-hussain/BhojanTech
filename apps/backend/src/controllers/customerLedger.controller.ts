import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { CustomerLedger, LedgerDirection, LedgerEntryType } from '../models/CustomerLedger';
import { Customer } from '../models/Customer';
import { Invoice } from '../models/Invoice';

// ─── Helper: Get current balance for a customer ──────────────────────────────

const getCurrentBalance = async (customerId: string, restaurantId: string): Promise<number> => {
  const lastEntry = await CustomerLedger.findOne({ customerId, restaurantId })
    .sort({ createdAt: -1 })
    .select('balanceAfter')
    .lean();
  return lastEntry?.balanceAfter ?? 0;
};

// ─── Helper: Create a ledger entry with atomic balance ───────────────────────

export const createLedgerEntry = async (params: {
  restaurantId: string;
  branchId?: string;
  customerId: string;
  type: LedgerEntryType;
  direction: LedgerDirection;
  amountINR: number;
  referenceType?: 'Invoice' | 'Order' | 'Booking';
  referenceId?: string;
  invoiceNumber?: string;
  paymentMode?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
}) => {
  const balance = await getCurrentBalance(params.customerId, params.restaurantId);
  // DEBIT = customer owes more (positive balance = customer owes)
  // CREDIT = customer paid / refund (reduces balance)
  const delta = params.direction === 'DEBIT' ? params.amountINR : -params.amountINR;
  const newBalance = +(balance + delta).toFixed(2);

  const entry = new CustomerLedger({
    restaurantId: params.restaurantId,
    branchId: params.branchId || undefined,
    customerId: params.customerId,
    type: params.type,
    direction: params.direction,
    amountINR: params.amountINR,
    balanceBefore: balance,
    balanceAfter: newBalance,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    invoiceNumber: params.invoiceNumber,
    paymentMode: params.paymentMode as any,
    notes: params.notes,
    createdBy: params.createdBy,
    createdByName: params.createdByName,
  });

  await entry.save();
  return entry;
};

// ─── GET /customer-ledger/:customerId — Paginated ledger ─────────────────────

export const getCustomerLedger = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;
    const restaurantId = req.user!.restaurantId;
    const { dateFrom, dateTo, type, branch, limit = 50, page = 1 } = req.query;

    const filter: any = { customerId, restaurantId };
    if (type) filter.type = type;
    if (branch && branch !== 'all') filter.branchId = branch;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [entries, total] = await Promise.all([
      CustomerLedger.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CustomerLedger.countDocuments(filter),
    ]);

    res.json({ entries, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    console.error('getCustomerLedger error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET /customer-ledger/:customerId/summary — Account summary ──────────────

export const getCustomerAccountSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;
    const restaurantId = req.user!.restaurantId;

    const customer = await Customer.findOne({ _id: customerId, restaurantId }).select('name phone tier segment totalSpend totalVisits loyaltyPoints');
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const currentBalance = await getCurrentBalance(customerId, restaurantId as string);

    // Aggregate stats
    const stats = await CustomerLedger.aggregate([
      { $match: { customerId: new mongoose.Types.ObjectId(customerId), restaurantId: new mongoose.Types.ObjectId(restaurantId as string) } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amountINR' },
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap: Record<string, { totalAmount: number; count: number }> = {};
    stats.forEach(s => { statsMap[s._id] = { totalAmount: s.totalAmount, count: s.count }; });

    // Outstanding invoices (balance > 0 means customer owes)
    const outstanding = currentBalance > 0 ? currentBalance : 0;
    const creditBalance = currentBalance < 0 ? Math.abs(currentBalance) : 0;

    // Aging analysis — get all DEBIT entries that haven't been fully offset
    const now = new Date();
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);

    const debitEntries = await CustomerLedger.find({
      customerId, restaurantId, direction: 'DEBIT',
    }).sort({ createdAt: 1 }).lean();

    const creditEntries = await CustomerLedger.find({
      customerId, restaurantId, direction: 'CREDIT',
    }).sort({ createdAt: 1 }).lean();

    let remainingCredit = creditEntries.reduce((sum, e) => sum + e.amountINR, 0);
    const aging = { current: 0, overdue7to30: 0, overdue30to60: 0, overdue60plus: 0 };

    for (const d of debitEntries) {
      if (remainingCredit >= d.amountINR) {
        remainingCredit -= d.amountINR;
        continue; // Fully paid
      }
      const unpaid = d.amountINR - Math.max(0, remainingCredit);
      remainingCredit = Math.max(0, remainingCredit - d.amountINR);
      const entryDate = new Date((d as any).createdAt);
      if (entryDate >= sevenDaysAgo) aging.current += unpaid;
      else if (entryDate >= thirtyDaysAgo) aging.overdue7to30 += unpaid;
      else if (entryDate >= sixtyDaysAgo) aging.overdue30to60 += unpaid;
      else aging.overdue60plus += unpaid;
    }

    res.json({
      customer,
      currentBalance,
      outstanding,
      creditBalance,
      aging,
      totalInvoices: statsMap['INVOICE']?.count || 0,
      totalInvoiceAmount: statsMap['INVOICE']?.totalAmount || 0,
      totalPayments: statsMap['PAYMENT']?.count || 0,
      totalPaymentAmount: statsMap['PAYMENT']?.totalAmount || 0,
      totalRefunds: statsMap['REFUND']?.count || 0,
      totalRefundAmount: statsMap['REFUND']?.totalAmount || 0,
      totalCreditNotes: statsMap['CREDIT_NOTE']?.count || 0,
      totalCreditNoteAmount: statsMap['CREDIT_NOTE']?.totalAmount || 0,
      totalAdvanceDeposits: statsMap['ADVANCE_DEPOSIT']?.count || 0,
      totalAdvanceAmount: statsMap['ADVANCE_DEPOSIT']?.totalAmount || 0,
    });
  } catch (error) {
    console.error('getCustomerAccountSummary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── POST /customer-ledger/payment — Record manual payment ───────────────────

export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amountINR, paymentMode, invoiceId, notes } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!customerId || !amountINR || amountINR <= 0) {
      return res.status(400).json({ error: 'Customer ID and positive amount required' });
    }

    const entry = await createLedgerEntry({
      restaurantId: restaurantId as string,
      branchId: req.user!.branchId?.toString(),
      customerId,
      type: 'PAYMENT',
      direction: 'CREDIT',
      amountINR,
      referenceType: invoiceId ? 'Invoice' : undefined,
      referenceId: invoiceId,
      paymentMode,
      notes: notes || `Manual payment recorded`,
      createdBy: req.user!.userId?.toString(),
      createdByName: req.user!.name || 'Staff',
    });

    res.json({ success: true, entry });
  } catch (error) {
    console.error('recordPayment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── POST /customer-ledger/credit-note — Issue credit note ───────────────────

export const recordCreditNote = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amountINR, reason, invoiceId } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!customerId || !amountINR || amountINR <= 0) {
      return res.status(400).json({ error: 'Customer ID and positive amount required' });
    }

    const entry = await createLedgerEntry({
      restaurantId: restaurantId as string,
      branchId: req.user!.branchId?.toString(),
      customerId,
      type: 'CREDIT_NOTE',
      direction: 'CREDIT',
      amountINR,
      referenceType: invoiceId ? 'Invoice' : undefined,
      referenceId: invoiceId,
      notes: reason || 'Credit note issued',
      createdBy: req.user!.userId?.toString(),
      createdByName: req.user!.name || 'Staff',
    });

    res.json({ success: true, entry });
  } catch (error) {
    console.error('recordCreditNote error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── POST /customer-ledger/advance — Record advance deposit ──────────────────

export const recordAdvanceDeposit = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amountINR, paymentMode, notes } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!customerId || !amountINR || amountINR <= 0) {
      return res.status(400).json({ error: 'Customer ID and positive amount required' });
    }

    const entry = await createLedgerEntry({
      restaurantId: restaurantId as string,
      branchId: req.user!.branchId?.toString(),
      customerId,
      type: 'ADVANCE_DEPOSIT',
      direction: 'CREDIT',
      amountINR,
      paymentMode,
      notes: notes || 'Advance deposit received',
      createdBy: req.user!.userId?.toString(),
      createdByName: req.user!.name || 'Staff',
    });

    res.json({ success: true, entry });
  } catch (error) {
    console.error('recordAdvanceDeposit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── POST /customer-ledger/apply-advance — Apply advance to invoice ──────────

export const applyAdvanceToInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, invoiceId, amountINR } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!customerId || !invoiceId || !amountINR || amountINR <= 0) {
      return res.status(400).json({ error: 'Customer ID, Invoice ID, and positive amount required' });
    }

    // Check credit balance
    const balance = await getCurrentBalance(customerId, restaurantId as string);
    if (balance >= 0) {
      return res.status(400).json({ error: 'No credit balance available to apply' });
    }
    const availableCredit = Math.abs(balance);
    if (amountINR > availableCredit) {
      return res.status(400).json({ error: `Only ₹${availableCredit.toFixed(2)} credit available` });
    }

    const invoice = await Invoice.findById(invoiceId);
    const entry = await createLedgerEntry({
      restaurantId: restaurantId as string,
      branchId: req.user!.branchId?.toString(),
      customerId,
      type: 'ADVANCE_USED',
      direction: 'DEBIT',
      amountINR,
      referenceType: 'Invoice',
      referenceId: invoiceId,
      invoiceNumber: invoice?.invoiceNumber,
      paymentMode: 'ADVANCE',
      notes: `Advance applied to invoice ${invoice?.invoiceNumber || invoiceId}`,
      createdBy: req.user!.userId?.toString(),
      createdByName: req.user!.name || 'Staff',
    });

    res.json({ success: true, entry });
  } catch (error) {
    console.error('applyAdvanceToInvoice error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── POST /customer-ledger/adjustment — Manual adjustment ────────────────────

export const recordAdjustment = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amountINR, direction, notes } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!customerId || !amountINR || amountINR <= 0 || !direction) {
      return res.status(400).json({ error: 'Customer ID, amount, direction, and notes required' });
    }

    const entry = await createLedgerEntry({
      restaurantId: restaurantId as string,
      branchId: req.user!.branchId?.toString(),
      customerId,
      type: 'ADJUSTMENT',
      direction,
      amountINR,
      notes: notes || 'Manual adjustment',
      createdBy: req.user!.userId?.toString(),
      createdByName: req.user!.name || 'Staff',
    });

    res.json({ success: true, entry });
  } catch (error) {
    console.error('recordAdjustment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── POST /customer-ledger/opening-balance — Set opening balance ─────────────

export const recordOpeningBalance = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amountINR, direction } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!customerId || !amountINR || amountINR <= 0 || !direction) {
      return res.status(400).json({ error: 'Customer ID, amount, and direction required' });
    }

    // Check if opening balance already exists
    const existing = await CustomerLedger.findOne({ customerId, restaurantId, type: 'OPENING_BALANCE' });
    if (existing) {
      return res.status(400).json({ error: 'Opening balance already recorded for this customer' });
    }

    const entry = await createLedgerEntry({
      restaurantId: restaurantId as string,
      branchId: req.user!.branchId?.toString(),
      customerId,
      type: 'OPENING_BALANCE',
      direction,
      amountINR,
      notes: `Opening balance set — ${direction === 'DEBIT' ? 'Customer owes' : 'Restaurant owes'}`,
      createdBy: req.user!.userId?.toString(),
      createdByName: req.user!.name || 'Staff',
    });

    res.json({ success: true, entry });
  } catch (error) {
    console.error('recordOpeningBalance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET /customer-ledger/reports/outstanding — Outstanding report ────────────

export const getOutstandingReport = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { branch } = req.query;

    const matchStage: any = { restaurantId: new mongoose.Types.ObjectId(restaurantId as string) };
    if (branch && branch !== 'all') matchStage.branchId = new mongoose.Types.ObjectId(branch as string);

    // Get last balance for each customer
    const balances = await CustomerLedger.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$customerId',
          currentBalance: { $first: '$balanceAfter' },
          lastTransaction: { $first: '$createdAt' },
          totalDebits: { $sum: { $cond: [{ $eq: ['$direction', 'DEBIT'] }, '$amountINR', 0] } },
          totalCredits: { $sum: { $cond: [{ $eq: ['$direction', 'CREDIT'] }, '$amountINR', 0] } },
          transactionCount: { $sum: 1 },
        },
      },
      { $match: { currentBalance: { $gt: 0 } } },
      { $sort: { currentBalance: -1 } },
    ]);

    // Enrich with customer details
    const customerIds = balances.map(b => b._id);
    const customers = await Customer.find({ _id: { $in: customerIds } }).select('name phone tier segment');
    customers.forEach((c: any) => { if (c.decryptFieldsSync) c.decryptFieldsSync(); });
    const customerMap = new Map(customers.map(c => [c._id.toString(), c]));

    const report = balances.map(b => {
      const customer = customerMap.get(b._id.toString());
      return {
        customerId: b._id,
        customerName: customer?.name || 'Unknown',
        customerPhone: customer?.phone || '',
        tier: customer?.tier || 'BRONZE',
        segment: customer?.segment || 'NEW',
        outstanding: b.currentBalance,
        totalDebits: b.totalDebits,
        totalCredits: b.totalCredits,
        lastTransaction: b.lastTransaction,
        transactionCount: b.transactionCount,
      };
    });

    const totalOutstanding = report.reduce((sum, r) => sum + r.outstanding, 0);

    res.json({ report, totalOutstanding, totalCustomers: report.length });
  } catch (error) {
    console.error('getOutstandingReport error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET /customer-ledger/reports/collections — Collection report ─────────────

export const getCollectionReport = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { dateFrom, dateTo } = req.query;

    const matchStage: any = {
      restaurantId: new mongoose.Types.ObjectId(restaurantId as string),
      direction: 'CREDIT',
      type: { $in: ['PAYMENT', 'ADVANCE_DEPOSIT'] },
    };

    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt.$lte = end;
      }
    }

    const collections = await CustomerLedger.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$customerId',
          totalCollected: { $sum: '$amountINR' },
          paymentCount: { $sum: 1 },
          lastPayment: { $max: '$createdAt' },
          byMode: {
            $push: {
              mode: '$paymentMode',
              amount: '$amountINR',
            },
          },
        },
      },
      { $sort: { totalCollected: -1 } },
    ]);

    const customerIds = collections.map(c => c._id);
    const customers = await Customer.find({ _id: { $in: customerIds } }).select('name phone');
    customers.forEach((c: any) => { if (c.decryptFieldsSync) c.decryptFieldsSync(); });
    const customerMap = new Map(customers.map(c => [c._id.toString(), c]));

    const report = collections.map(c => {
      const cust = customerMap.get(c._id.toString());
      // Aggregate by mode
      const modeBreakdown: Record<string, number> = {};
      c.byMode.forEach((m: any) => {
        modeBreakdown[m.mode || 'UNKNOWN'] = (modeBreakdown[m.mode || 'UNKNOWN'] || 0) + m.amount;
      });

      return {
        customerId: c._id,
        customerName: cust?.name || 'Unknown',
        customerPhone: cust?.phone || '',
        totalCollected: c.totalCollected,
        paymentCount: c.paymentCount,
        lastPayment: c.lastPayment,
        modeBreakdown,
      };
    });

    const totalCollected = report.reduce((sum, r) => sum + r.totalCollected, 0);

    res.json({ report, totalCollected, totalCustomers: report.length });
  } catch (error) {
    console.error('getCollectionReport error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET /customer-ledger/reports/receivables — Receivables summary ──────────

export const getReceivablesSummary = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const rid = new mongoose.Types.ObjectId(restaurantId as string);

    // Total outstanding across all customers
    const balances = await CustomerLedger.aggregate([
      { $match: { restaurantId: rid } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$customerId', currentBalance: { $first: '$balanceAfter' } } },
    ]);

    let totalReceivables = 0;
    let totalCredit = 0;
    let customersWithOutstanding = 0;
    let customersWithCredit = 0;

    balances.forEach(b => {
      if (b.currentBalance > 0) { totalReceivables += b.currentBalance; customersWithOutstanding++; }
      if (b.currentBalance < 0) { totalCredit += Math.abs(b.currentBalance); customersWithCredit++; }
    });

    // Recent payments (last 30 days)
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPayments = await CustomerLedger.aggregate([
      { $match: { restaurantId: rid, direction: 'CREDIT', type: 'PAYMENT', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amountINR' }, count: { $sum: 1 } } },
    ]);

    // Recent invoices (last 30 days)
    const recentInvoices = await CustomerLedger.aggregate([
      { $match: { restaurantId: rid, direction: 'DEBIT', type: 'INVOICE', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amountINR' }, count: { $sum: 1 } } },
    ]);

    res.json({
      totalReceivables,
      totalCredit,
      netPosition: totalReceivables - totalCredit,
      customersWithOutstanding,
      customersWithCredit,
      totalCustomersWithLedger: balances.length,
      recentPayments30d: recentPayments[0]?.total || 0,
      recentPaymentCount30d: recentPayments[0]?.count || 0,
      recentInvoices30d: recentInvoices[0]?.total || 0,
      recentInvoiceCount30d: recentInvoices[0]?.count || 0,
    });
  } catch (error) {
    console.error('getReceivablesSummary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── GET /customer-ledger/statement/:customerId — Statement data ─────────────

export const generateStatement = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;
    const restaurantId = req.user!.restaurantId;
    const { dateFrom, dateTo } = req.query;

    const customer = await Customer.findOne({ _id: customerId, restaurantId });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const filter: any = { customerId, restaurantId };
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const entries = await CustomerLedger.find(filter).sort({ createdAt: 1 }).lean();

    const balance = await getCurrentBalance(customerId, restaurantId as string);

    // Get restaurant details for header
    const Restaurant = mongoose.model('Restaurant');
    const restaurant = await Restaurant.findById(restaurantId).lean();

    res.json({
      restaurant,
      customer,
      entries,
      closingBalance: balance,
      generatedAt: new Date().toISOString(),
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    });
  } catch (error) {
    console.error('generateStatement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
