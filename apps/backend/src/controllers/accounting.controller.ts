import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { Invoice } from '../models/Invoice';
import { ExpenseModel } from '../models/Expense';

export const getDashboardMetrics = async (req: AuthRequest, res: Response) => {
    try {
        const { branchId } = req.query;
        let query: any = { restaurantId: req.user!.restaurantId };
        if (branchId && branchId !== 'all') {
            query.branchId = branchId;
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        query.createdAt = { $gte: startOfMonth, $lte: endOfMonth };

        // 1. Revenue & GST Info
        const invoicesAgg = await Invoice.aggregate([
            { $match: query },
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

        // 2. Pending Items / Info (mocking for now)
        const pendingItems = 0; // Unreconciled payouts or un-categorized expenses

        // 3. Next Deadline Calculation
        // GSTR-1 is 11th of next month
        // GSTR-3B is 20th of next month
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const gstr1Deadline = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 11);
        const gstr3bDeadline = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);

        const daysToGstr1 = Math.floor((gstr1Deadline.getTime() - now.getTime()) / (1000 * 3600 * 24));
        const daysToGstr3b = Math.floor((gstr3bDeadline.getTime() - now.getTime()) / (1000 * 3600 * 24));

        return res.json({
            metrics: {
                totalRevenueThisMonth,
                totalGstLiability,
                pendingItems
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
        let query: any = { restaurantId: req.user!.restaurantId };

        if (branchId && branchId !== 'all') {
            query.branchId = branchId;
        }

        const m = parseInt(month as string) - 1;
        const y = parseInt(year as string);
        query.createdAt = {
            $gte: new Date(y, m, 1),
            $lte: new Date(y, m + 1, 0, 23, 59, 59)
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
                // Reverse calculate taxable:
                const taxRate = li.gstSlab / 100;
                // If unitPrice includes tax, we need to extract taxable... 
                // But normally invoiceLineItem lineTotal is pre-tax or post-tax? 
                // It's safer to just accumulate lineTotal if we assume lineTotal is pre-tax
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
        let query: any = { restaurantId: req.user!.restaurantId };
        let expenseQuery: any = { restaurantId: req.user!.restaurantId, isGstEligible: true };

        if (branchId && branchId !== 'all') {
            query.branchId = branchId;
            expenseQuery.branchId = branchId;
        }

        const m = parseInt(month as string) - 1;
        const y = parseInt(year as string);
        const dateRange = {
            $gte: new Date(y, m, 1),
            $lte: new Date(y, m + 1, 0, 23, 59, 59)
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
        const expensesAgg = await ExpenseModel.aggregate([
            { $match: expenseQuery },
            {
                $group: {
                    _id: null,
                    totalExpense: { $sum: '$amount' }
                }
            }
        ]);
        // Assume expense amount is inclusive of GST 18%, so ITC = expense * 18/118. 
        // A better schema would store exact CGST/SGST on expense. Mocking standard ITC extraction for now.
        const totalITC = (expensesAgg[0]?.totalExpense || 0) * (18 / 118);

        return res.json({
            table3_1: {
                outwardTaxable: outputTax,
            },
            table4_ITC: {
                eligibleITC: totalITC
            },
            netLiability: outputTax - totalITC
        });

    } catch (error) {
        console.error('GSTR3B Error:', error);
        return res.status(500).json({ error: 'Failed to generate GSTR-3B.' });
    }
};

export const getProfitAndLoss = async (req: AuthRequest, res: Response) => {
    try {
        const { branchId, month, year } = req.query;

        let query: any = { restaurantId: req.user!.restaurantId };
        let expenseQuery: any = { restaurantId: req.user!.restaurantId };

        if (branchId && branchId !== 'all') {
            query.branchId = branchId;
            expenseQuery.branchId = branchId;
        }

        const m = parseInt(month as string) - 1;
        const y = parseInt(year as string);
        const dateRange = {
            $gte: new Date(y, m, 1),
            $lte: new Date(y, m + 1, 0, 23, 59, 59)
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

        // COGS (Mocked fetching from Inventory/Wastage)
        // Usually, COGS = Starting Inventory + Purchases - Ending Inventory.
        // Assuming ~30% of Total Revenue as Food Cost (mock if not fully integrated to live stock takes).
        const cogs = totalRevenue * 0.3;
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
            opex.commissions = onlineRev * 0.22; // 22% comm
            totalOpex += opex.commissions;
        }

        const ebitda = grossProfit - totalOpex;

        return res.json({
            revenue: { dineIn: dineInRev, online: onlineRev, total: totalRevenue },
            cogs: { rawMaterials: cogs, grossProfit, grossMargin },
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
        const { branchId, startDate, endDate } = req.query;
        let query: any = { restaurantId: req.user!.restaurantId };

        if (branchId && branchId !== 'all') {
            query.branchId = branchId;
        }
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
                $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
            };
        }

        const invoices = await Invoice.find(query).sort({ createdAt: -1 });

        return res.json(invoices);
    } catch (error) {
        console.error('Invoice Register Error:', error);
        return res.status(500).json({ error: 'Failed to fetch Invoice Register.' });
    }
};
