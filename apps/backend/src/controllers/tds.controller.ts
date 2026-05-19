import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TdsLogModel } from '../models/TdsLog';

export const getTdsLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { branchId, quarter, year } = req.query;
        let query: any = { restaurantId: req.user!.restaurantId };

        if (branchId && branchId !== 'all') {
            query.branchId = branchId;
        }

        // basic fallback listing
        const logs = await TdsLogModel.find(query).sort({ paymentDate: -1 });
        return res.json(logs);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch TDS logs.' });
    }
};

export const createTdsLog = async (req: AuthRequest, res: Response) => {
    try {
        const { vendorName, panNumber, section, tdsAmount, tdsRate, paymentDate, branchId } = req.body;
        const log = new TdsLogModel({
            vendorName,
            panNumber,
            section,
            tdsAmount: Number(tdsAmount),
            tdsRate: Number(tdsRate),
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            branchId,
            restaurantId: req.user!.restaurantId,
            recordedBy: req.user!.userId
        });
        await log.save();
        return res.status(201).json(log);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to create TDS log.' });
    }
};

export const deleteTdsLog = async (req: AuthRequest, res: Response) => {
    try {
        await TdsLogModel.findOneAndDelete({
            _id: req.params.id,
            restaurantId: req.user!.restaurantId
        });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to delete TDS log.' });
    }
};
