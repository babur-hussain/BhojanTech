import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Booking } from '../models/Booking';
import { Table } from '../models/Table';
import { getBaseQuery, getCreateBranchId } from '../utils/queryHelpers';

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.restaurantId) { res.status(403).json({ error: 'Unauthorized' }); return; }

    // branchId comes from the auth middleware (x-branch-id header), fallback to body
    const branchId = getCreateBranchId(req);

    const {
      customerName, customerPhone, date, time, guests, specialRequests,
      source, depositAmount, category, productName, quantity, weight,
      totalAmount, discountType, discountValue,
    } = req.body;

    const newBooking = new Booking({
      restaurantId: req.user.restaurantId,
      branchId,                       // ← always from authenticated context
      customerName, customerPhone,
      date: new Date(date), time, guests,
      productName, quantity, weight, category,
      specialRequests, source,
      totalAmount, discountType, discountValue, depositAmount,
    });

    const saved = await newBooking.save();
    res.status(201).json(saved);
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
};

export const getBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.restaurantId) { res.status(403).json({ error: 'Unauthorized' }); return; }

    // getBaseQuery already scopes to restaurantId + branchId from middleware
    const query: any = getBaseQuery(req);

    const { date, status } = req.query;

    if (date) {
      const d = new Date(date as string);
      query.date = {
        $gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(d).setHours(23, 59, 59, 999)),
      };
    }

    if (status && status !== 'all') {
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
    const base = getBaseQuery(req);

    const booking = await Booking.findOneAndUpdate(
      { _id: id, restaurantId: base.restaurantId },
      { status },
      { new: true }
    ).populate('tableId', 'number capacity');

    if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
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
    const base = getBaseQuery(req);

    const booking = await Booking.findOne({ _id: id, restaurantId: base.restaurantId });
    if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }

    if (tableId) {
      const table = await Table.findOne({ _id: tableId, restaurantId: base.restaurantId });
      if (!table) { res.status(404).json({ error: 'Table not found' }); return; }
      booking.tableId = tableId;
      booking.status = 'SEATED';
      table.status = 'RESERVED';
      await table.save();
    } else {
      booking.tableId = undefined;
    }

    await booking.save();
    const updated = await Booking.findById(id).populate('tableId', 'number capacity');
    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Error assigning table to booking:', error);
    res.status(500).json({ error: 'Failed to assign table', details: error.message });
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const base = getBaseQuery(req);

    const result = await Booking.findOneAndDelete({ _id: id, restaurantId: base.restaurantId });
    if (!result) { res.status(404).json({ error: 'Booking not found' }); return; }

    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking', details: error.message });
  }
};
