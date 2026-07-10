import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { Invoice } from '../models/Invoice';
import { ExpenseModel } from '../models/Expense';
import { PurchaseLog } from '../models/PurchaseLog';
import { WastageLog } from '../models/WastageLog';
import { getBaseQuery } from '../utils/queryHelpers';

// Helper: build a proper end-of-month date that includes the entire last day
const endOfMonthDate = (y: number, m: number) => new Date(y, m + 1, 0, 23, 59, 59, 999);

export const getDashboardMetrics = async (req: AuthRequest, res: Response) => {
    try {
        const query = getBaseQuery(req);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = endOfMonthDate(now.getFullYear(), now.getMonth());

        // This month's revenue & GST
        const thisMonthQuery = { ...query, createdAt: { $gte: startOfMonth, $lte: endOfMonth } };
        const invoicesAgg = await Invoice.aggregate([
            { $match: thisMonthQuery },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$grandTotalINR' },
                    totalGst: { $sum: '$totalGSTINR' }
                }
            }
        ]);

        const totalRevenueThisMonth = invoicesAgg[0]?.totalRevenue || 0;
        const totalGstLiability = invoicesAgg[0]?.totalGst || 0;

        // Last month's revenue for comparison
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = endOfMonthDate(now.getFullYear(), now.getMonth() - 1);
        const lastMonthQuery = { ...query, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } };
        const lastMonthAgg = await Invoice.aggregate([
            { $match: lastMonthQuery },
            { $group: { _id: null, totalRevenue: { $sum: '$grandTotalINR' } } }
        ]);
        const lastMonthRevenue = lastMonthAgg[0]?.totalRevenue || 0;
        const vsLastMonth = lastMonthRevenue > 0
            ? +((totalRevenueThisMonth - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
            : 0;

        // Pending Items (unreconciled expenses without receipts)
        const pendingItems = 0;

        // Next Deadline Calculation
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const gstr1Deadline = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 11);
        const gstr3bDeadline = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);

        const daysToGstr1 = Math.floor((gstr1Deadline.getTime() - now.getTime()) / (1000 * 3600 * 24));
        const daysToGstr3b = Math.floor((gstr3bDeadline.getTime() - now.getTime()) / (1000 * 3600 * 24));

        return res.json({
            metrics: {
                totalRevenueThisMonth,
                totalGstLiability,
                pendingItems,
                vsLastMonth
            },
            deadlines: {
                gstr1: { date: gstr1Deadline, daysLeft: daysToGstr1 },
                gstr3b: { date: gstr3bDeadline, daysLeft: daysToGstr3b }
            }
        });
    } catch (error) {
        console.error('getDashboardMetrics Error:', error);
        return res.status(500).json({ error: 'Failed to fetch dashboard metrics.' });
    }
};

export const getGSTR1 = async (req: AuthRequest, res: Response) => {
    try {
        const { branchId, month, year } = req.query; // e.g. month=4, year=2026
        // Use getBaseQuery for consistent restaurant scoping
        const query: any = getBaseQuery(req);

        const m = parseInt(month as string) - 1;
        const y = parseInt(year as string);
        query.createdAt = {
            $gte: new Date(y, m, 1),
            $lte: endOfMonthDate(y, m)
        };

        const invoices = await Invoice.find(query);

        let totalTaxable = 0;
        let totalCgst = 0;
        let totalSgst = 0;

        // Group by slab (B2C)
        const slabSummary = {
            '5': { taxable: 0, cgst: 0, sgst: 0 },
            '12': { taxable: 0, cgst: 0, sgst: 0 },
            '18': { taxable: 0, cgst: 0, sgst: 0 }
        };

        // HSN Summary
        const hsnSummary: Record<string, { qty: number, taxable: number }> = {};

        invoices.forEach(inv => {
            // Process gstBreakup
            inv.gstBreakup.forEach((b: any) => {
                if (slabSummary[b.slab.toString() as keyof typeof slabSummary]) {
                    slabSummary[b.slab.toString() as keyof typeof slabSummary].taxable += b.taxableAmount;
                    slabSummary[b.slab.toString() as keyof typeof slabSummary].cgst += b.cgst;
                    slabSummary[b.slab.toString() as keyof typeof slabSummary].sgst += b.sgst;

                    totalTaxable += b.taxableAmount;
                    totalCgst += b.cgst;
                    totalSgst += b.sgst;
                }
            });

            // Process line items for HSN
            inv.lineItems.forEach((li: any) => {
                if (!hsnSummary[li.hsnCode]) {
                    hsnSummary[li.hsnCode] = { qty: 0, taxable: 0 };
                }
                hsnSummary[li.hsnCode].qty += li.quantity;
                hsnSummary[li.hsnCode].taxable += li.lineTotal;
            });
        });

        // Document summary
        const docSummary = {
            fromCount: invoices[0]?.invoiceNumber || '-',
            toCount: invoices[invoices.length - 1]?.invoiceNumber || '-',
            totalCount: invoices.length,
            cancelledCount: 0 // If we had status 'CANCELLED' on invoices
        };

        const gstr1Data = {
            b2c: slabSummary,
            hsn: hsnSummary,
            docs: docSummary,
            totals: { totalTaxable, totalCgst, totalSgst }
        };

        return res.json(gstr1Data);
    } catch (error) {
        console.error('GSTR1 Error:', error);
        return res.status(500).json({ error: 'Failed to generate GSTR-1.' });
    }
};

export const getGSTR3B = async (req: AuthRequest, res: Response) => {
    try {
        const { branchId, month, year } = req.query;
        const query: any = getBaseQuery(req);
        const expenseQuery: any = { ...query, isGstEligible: true };

        const m = parseInt(month as string) - 1;
        const y = parseInt(year as string);
        const dateRange = {
            $gte: new Date(y, m, 1),
            $lte: endOfMonthDate(y, m)
        };

        query.createdAt = dateRange;
        expenseQuery.date = dateRange;

        // 1. Output Tax from Invoices
        const invoicesAgg = await Invoice.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalOutputTax: { $sum: '$totalGSTINR' }
                }
            }
        ]);
        const outputTax = invoicesAgg[0]?.totalOutputTax || 0;

        // 2. Input Tax Credit (ITC) from Expenses logged w/ GST eligible
        // Use actual CGST/SGST fields if stored on the expense, otherwise derive from GST slab
        const expensesAgg = await ExpenseModel.aggregate([
            { $match: expenseQuery },
            {
                $group: {
                    _id: null,
                    totalExpense: { $sum: '$amount' },
                    totalCgst: { $sum: { $ifNull: ['$cgstAmount', 0] } },
                    totalSgst: { $sum: { $ifNull: ['$sgstAmount', 0] } },
                }
            }
        ]);

        const storedITC = (expensesAgg[0]?.totalCgst || 0) + (expensesAgg[0]?.totalSgst || 0);
        // If no individual GST fields are stored, fall back to deriving ITC from total expense
        const totalITC = storedITC > 0
            ? storedITC
            : (expensesAgg[0]?.totalExpense || 0) * (18 / 118); // Fallback approximation

        return res.json({
            table3_1: {
                outwardTaxable: outputTax,
            },
            table4_ITC: {
                eligibleITC: +totalITC.toFixed(2),
                isApproximated: storedITC === 0,
            },
            netLiability: +(outputTax - totalITC).toFixed(2)
        });

    } catch (error) {
        console.error('GSTR3B Error:', error);
        return res.status(500).json({ error: 'Failed to generate GSTR-3B.' });
    }
};

export const getProfitAndLoss = async (req: AuthRequest, res: Response) => {
    try {
        const { branchId, month, year } = req.query;

        const query: any = getBaseQuery(req);
        let expenseQuery: any = { ...query };

        const m = parseInt(month as string) - 1;
        const y = parseInt(year as string);
        const dateRange = {
            $gte: new Date(y, m, 1),
            $lte: endOfMonthDate(y, m)
        };
        query.createdAt = dateRange;
        expenseQuery.date = dateRange;

        // Revenue (Dine-In vs Delivery/Online)
        const invoices = await Invoice.find(query);
        let dineInRev = 0;
        let onlineRev = 0;

        invoices.forEach(inv => {
            if (inv.orderType === 'DINE_IN' || inv.orderType === 'TAKEAWAY') {
                dineInRev += inv.subtotalINR; // Revenue net of GST
            } else {
                onlineRev += inv.subtotalINR;
            }
        });
        const totalRevenue = dineInRev + onlineRev;

        // COGS from actual PurchaseLog data (purchases in the period)
        const purchaseQuery: any = { ...getBaseQuery(req) };
        purchaseQuery.createdAt = dateRange;

        const purchaseAgg = await PurchaseLog.aggregate([
            { $match: purchaseQuery },
            { $group: { _id: null, totalPurchases: { $sum: '$totalCost' } } }
        ]);
        const wastageQuery: any = { ...getBaseQuery(req) };
        wastageQuery.createdAt = dateRange;
        const wastageAgg = await WastageLog.aggregate([
            { $match: wastageQuery },
            { $group: { _id: null, totalWastage: { $sum: '$estimatedCost' } } }
        ]);

        const totalPurchases = purchaseAgg[0]?.totalPurchases || 0;
        const totalWastage = wastageAgg[0]?.totalWastage || 0;
        // COGS = Purchases (if PurchaseLog has data), otherwise fall back to 30% estimate
        const cogs = totalPurchases > 0 ? (totalPurchases + totalWastage) : (totalRevenue * 0.3);
        const cogsIsEstimated = totalPurchases === 0;

        const grossProfit = totalRevenue - cogs;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // Expenses
        const expenses = await ExpenseModel.find(expenseQuery);
        const opex = {
            salaries: 0,
            commissions: 0,
            rent: 0,
            utilities: 0,
            marketing: 0,
            miscellaneous: 0
        };

        let totalOpex = 0;
        expenses.forEach(ex => {
            totalOpex += ex.amount;
            switch (ex.category.toUpperCase()) {
                case 'STAFF SALARIES': opex.salaries += ex.amount; break;
                case 'ZOMATO/SWIGGY COMMISSION': opex.commissions += ex.amount; break;
                case 'RENT': opex.rent += ex.amount; break;
                case 'UTILITIES': opex.utilities += ex.amount; break;
                case 'MARKETING': opex.marketing += ex.amount; break;
                default: opex.miscellaneous += ex.amount; break;
            }
        });

        // Add typical commissions for online orders if not manually input:
        if (opex.commissions === 0 && onlineRev > 0) {
            opex.commissions = onlineRev * 0.22; // 22% comm estimate
            totalOpex += opex.commissions;
        }

        const ebitda = grossProfit - totalOpex;

        return res.json({
            revenue: { dineIn: dineInRev, online: onlineRev, total: totalRevenue },
            cogs: { rawMaterials: cogs, grossProfit, grossMargin, isEstimated: cogsIsEstimated },
            opex: { ...opex, total: totalOpex },
            ebitda
        });

    } catch (error) {
        console.error('P&L Error:', error);
        return res.status(500).json({ error: 'Failed to generate Profit & Loss Statement.' });
    }
};

export const getInvoiceRegister = async (req: AuthRequest, res: Response) => {
    try {
        const { branchId, startDate, endDate, page = '1', limit = '50' } = req.query;
        const query: any = getBaseQuery(req);

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        } else {
            // Default to current month
            const now = new Date();
            query.createdAt = {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                $lte: endOfMonthDate(now.getFullYear(), now.getMonth())
            };
        }

        // Pagination
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 50));
        const skip = (pageNum - 1) * limitNum;

        const [invoices, total] = await Promise.all([
            Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            Invoice.countDocuments(query),
        ]);

        return res.json({
            invoices,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('Invoice Register Error:', error);
        return res.status(500).json({ error: 'Failed to fetch Invoice Register.' });
    }
};
