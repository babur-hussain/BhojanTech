import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ExpenseModel } from '../models/Expense';

export const getExpenses = async (req: AuthRequest, res: Response) => {
    try {
        const { branchId, month, year } = req.query;
        let query: any = { restaurantId: req.user!.restaurantId };

        if (branchId && branchId !== 'all') {
            query.branchId = branchId;
        }

        if (month && year) {
            const m = parseInt(month as string) - 1;
            const y = parseInt(year as string);
            query.date = {
                $gte: new Date(y, m, 1),
                $lte: new Date(y, m + 1, 0, 23, 59, 59)
            };
        }

        const expenses = await ExpenseModel.find(query).sort({ date: -1 });
        return res.json(expenses);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch expenses.' });
    }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
    try {
        const expense = new ExpenseModel({
            ...req.body,
            restaurantId: req.user!.restaurantId,
            recordedBy: req.user!.userId
        });
        await expense.save();
        return res.status(201).json(expense);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to create expense.' });
    }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
    try {
        await ExpenseModel.findOneAndDelete({
            _id: req.params.id,
            restaurantId: req.user!.restaurantId
        });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete expense.' });
    }
};
