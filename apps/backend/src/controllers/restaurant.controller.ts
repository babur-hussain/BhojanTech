import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';

export const createRestaurant = async (req: Request, res: Response) => {
  try {
    const { name, address, gstin, fssaiNumber } = req.body;
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

    // Update the user's restaurantId
    await User.findByIdAndUpdate(user.userId, { restaurantId: restaurant._id });

    return res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant,
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    return res.status(500).json({ error: 'Internal server error while creating restaurant' });
  }
};
