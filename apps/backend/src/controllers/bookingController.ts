import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Booking } from '../models/Booking';
import { Table } from '../models/Table';

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const { customerName, customerPhone, date, time, guests, branchId, specialRequests, source, depositAmount, category, productName, quantity, weight, totalAmount, discountType, discountValue } = req.body;

    const newBooking = new Booking({
      restaurantId,
      branchId,
      customerName,
      customerPhone,
      date: new Date(date),
      time,
      guests,
      productName,
      quantity,
      weight,
      category,
      specialRequests,
      source,
      totalAmount,
      discountType,
      discountValue,
      depositAmount
    });

    const savedBooking = await newBooking.save();
    res.status(201).json(savedBooking);
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
};

export const getBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { date, status, branchId } = req.query;

    if (!restaurantId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const query: any = { restaurantId };
    
    if (branchId && branchId !== 'all') {
      query.branchId = branchId;
    }
    
    if (date) {
      // Query bookings for a specific date
      const queryDate = new Date(date as string);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('tableId', 'number capacity')
      .sort({ date: 1, time: 1 });

    res.status(200).json(bookings);
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const restaurantId = req.user?.restaurantId;

    const booking = await Booking.findOneAndUpdate(
      { _id: id, restaurantId },
      { status },
      { new: true }
    ).populate('tableId', 'number capacity');

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    res.status(200).json(booking);
  } catch (error: any) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status', details: error.message });
  }
};

export const assignTable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tableId } = req.body;
    const restaurantId = req.user?.restaurantId;

    const booking = await Booking.findOne({ _id: id, restaurantId });
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (tableId) {
      const table = await Table.findOne({ _id: tableId, restaurantId });
      if (!table) {
        res.status(404).json({ error: 'Table not found' });
        return;
      }
      booking.tableId = tableId;
      booking.status = 'SEATED';
      
      // Optionally update table status to OCCUPIED or RESERVED
      table.status = 'RESERVED';
      await table.save();
    } else {
      booking.tableId = undefined;
    }

    await booking.save();
    
    const updatedBooking = await Booking.findById(id).populate('tableId', 'number capacity');
    res.status(200).json(updatedBooking);
  } catch (error: any) {
    console.error('Error assigning table to booking:', error);
    res.status(500).json({ error: 'Failed to assign table', details: error.message });
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user?.restaurantId;

    const result = await Booking.findOneAndDelete({ _id: id, restaurantId });
    if (!result) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking', details: error.message });
  }
};
