import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { Branch } from '../models/Branch';

export const listBranches = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = new mongoose.Types.ObjectId(req.user!.restaurantId);
        // Include manager info if needed
        const branches = await Branch.find({ restaurantId }).populate('managerId', 'name email').sort({ createdAt: -1 });
        return res.json(branches);
    } catch (err: any) {
        console.error('List Branches Error:', err);
        return res.status(500).json({ error: 'Server error fetching branches' });
    }
};

export const createBranch = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = new mongoose.Types.ObjectId(req.user!.restaurantId);

        // Auto-uppercase prefix
        const invoicePrefix = req.body.invoicePrefix?.toUpperCase() || 'BR';

        const { name, address, city, phone, gstNumber, managerId } = req.body;
        const branch = new Branch({
            name,
            address,
            city,
            phone,
            gstNumber,
            managerId,
            restaurantId,
            invoicePrefix,
            isActive: true,
        });

        await branch.save();
        const populated = await Branch.findById(branch._id).populate('managerId', 'name email');
        return res.status(201).json(populated);
    } catch (err: any) {
        console.error('Create Branch Error:', err);
        return res.status(500).json({ error: 'Error creating branch' });
    }
};

export const updateBranch = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = new mongoose.Types.ObjectId(req.user!.restaurantId);
        const branchId = new mongoose.Types.ObjectId(req.params.id);

        // Whitelist updatable fields — prevent overwriting restaurantId/_id
        const { name, address, city, state, phone, gstNumber, invoicePrefix, managerId, isActive } = req.body;
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;
        if (state !== undefined) updateData.state = state;
        if (phone !== undefined) updateData.phone = phone;
        if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
        if (invoicePrefix !== undefined) updateData.invoicePrefix = invoicePrefix.toUpperCase();
        if (managerId !== undefined) updateData.managerId = managerId;
        if (isActive !== undefined) updateData.isActive = isActive;

        const branch = await Branch.findOneAndUpdate(
            { _id: branchId, restaurantId },
            { $set: updateData },
            { new: true }
        ).populate('managerId', 'name email');

        if (!branch) return res.status(404).json({ error: 'Branch not found' });
        return res.json(branch);
    } catch (err: any) {
        console.error('Update Branch Error:', err);
        return res.status(500).json({ error: 'Error updating branch' });
    }
};
