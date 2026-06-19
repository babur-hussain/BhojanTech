import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';

export const createRestaurant = async (req: Request, res: Response) => {
  try {
    const { name, address, gstin, fssaiNumber, city, pincode, phone } = req.body;
    // @ts-ignore
    const user = req.user;

    if (!name) {
      return res.status(400).json({ error: 'Restaurant name is required' });
    }

    // Create the restaurant
    const restaurant = await Restaurant.create({
      ownerId: user.userId,
      name,
      address,
      gstin,
      fssaiNumber,
    });

    // Auto-create a default "Main Branch" so invoicing works from day one
    const mainBranch = await Branch.create({
      restaurantId: restaurant._id,
      name: 'Main Branch',
      address: address || 'Main Location',
      city: city || 'City',
      pincode: pincode || '000000',
      phone: phone || '0000000000',
      gstin,
      fssaiNumber,
      invoicePrefix: 'INV',
      isActive: true,
    });

    // Update the user's restaurantId AND branchId
    await User.findByIdAndUpdate(user.userId, {
      restaurantId: restaurant._id,
      branchId: mainBranch._id,
    });

    return res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant,
      branch: mainBranch,
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    return res.status(500).json({ error: 'Internal server error while creating restaurant' });
  }
};

export const getRestaurantInfo = async (req: AuthRequest, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.user!.restaurantId).lean();
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    return res.json(restaurant);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateRestaurantInfo = async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, contactNumber, gstin, fssaiNumber, logoUrl, upiId, printerName, businessType, bookingCategories, defaultBookingCategory } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.user!.restaurantId,
      { $set: { name, address, contactNumber, gstin, fssaiNumber, logoUrl, upiId, printerName, businessType, bookingCategories, defaultBookingCategory } },
      { new: true, runValidators: true }
    ).lean();
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    return res.json({ message: 'Restaurant updated successfully', restaurant });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
