import { Response } from 'express';
import { Order } from '../models/Order';
import { Table } from '../models/Table';
import { KOT } from '../models/KOT';
import { io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { getBaseQuery, getCreateBranchId } from '../utils/queryHelpers';
import mongoose from 'mongoose';

export const getActiveOrders = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    query.status = { $in: ['OPEN', 'BILLED'] };
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { branchId, status, type, dateFrom, dateTo, search, page = '1', limit = '50' } = req.query as any;

    const query: any = { restaurantId };

    // Branch filter – SUPER_OWNER/OWNER can see all or filter, others are scoped
    if (branchId && branchId !== 'all') {
      query.branchId = branchId;
    } else if (req.user!.branchId) {
      query.branchId = req.user!.branchId;
    }

    if (status && status !== 'all') query.status = status;
    if (type === 'online') query.isOnlineOrder = true;
    if (type === 'dine-in') query.isOnlineOrder = { $ne: true };
    if (type === 'takeaway') query.tableNumber = 'TAKEAWAY';

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { tableNumber: { $regex: search, $options: 'i' } },
        { waiterName: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Order.countDocuments(query),
    ]);

    return res.json({ orders, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId, items } = req.body;
    const restaurantId = req.user!.restaurantId;
    const branchId = getCreateBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Branch ID is required' });

    const table = await Table.findOne({ _id: tableId, restaurantId, branchId });
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const totalAmountINR = items.reduce((sum: number, item: any) => sum + (item.priceAtOrderTime * item.quantity), 0);

    const order = await Order.create({
      restaurantId,
      branchId,
      tableId,
      tableNumber: table.number,
      waiterId: req.user!.userId,
      waiterName: req.user!.name || 'Waiter',
      items: items.map((i: any) => ({ ...i, _id: new mongoose.Types.ObjectId() })),
      totalAmountINR,
    });

    table.status = 'OCCUPIED';
    table.currentOrderId = order.id as any;
    table.seatedAt = new Date();
    await table.save();

    io.to(`restaurant_${restaurantId}_branch_${branchId}`).emit('table_update', { type: 'ORDER_STARTED', table });
    io.to(`restaurant_${restaurantId}_branch_${branchId}`).emit('order_update', { type: 'NEW_ORDER', order });

    return res.status(201).json(order);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const addItemsToOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;
    const query = getBaseQuery(req);
    query._id = req.params.id;
    const order = await Order.findOne(query);
    
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const newItemsAmount = items.reduce((sum: number, item: any) => sum + (item.priceAtOrderTime * item.quantity), 0);
    order.totalAmountINR += newItemsAmount;
    
    const formattedItems = items.map((i: any) => ({ ...i, _id: new mongoose.Types.ObjectId() }));
    order.items.push(...formattedItems);
    
    await order.save();

    io.to(`restaurant_${req.user!.restaurantId}_branch_${order.branchId}`).emit('order_update', { type: 'ITEMS_ADDED', order });

    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createTakeawayOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, customerName, customerPhone } = req.body;
    const restaurantId = req.user!.restaurantId;
    const branchId = getCreateBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'Branch ID is required' });

    const totalAmountINR = items.reduce((sum: number, item: any) => sum + (item.priceAtOrderTime * item.quantity), 0);

    const formattedItems = items.map((i: any) => ({ ...i, _id: new mongoose.Types.ObjectId(), sentToKitchen: true }));

    const order = await Order.create({
      restaurantId,
      branchId,
      tableId: new mongoose.Types.ObjectId(), // placeholder – takeaway has no real table
      tableNumber: 'TAKEAWAY',
      waiterId: req.user!.userId,
      waiterName: req.user!.name || 'Staff',
      items: formattedItems,
      totalAmountINR,
      customerName,
      customerPhone,
      status: 'OPEN',
      isOnlineOrder: false,
    });

    // Create KOT for Kitchen
    const kotItems = formattedItems.map((item: any) => ({
        orderItemId: item._id,
        menuItemId: item.menuItemId,
        name: item.name,
        variantName: item.variantName,
        quantity: item.quantity,
        status: 'PENDING'
    }));

    const newKOT = new KOT({
        restaurantId: order.restaurantId,
        branchId: order.branchId,
        orderId: order._id,
        tableNumber: order.tableNumber,
        isOnlineOrder: false,
        customerName: order.customerName,
        items: kotItems,
        status: 'PENDING'
    });
    await newKOT.save();

    io.to(`restaurant_${restaurantId}_branch_${branchId}`).emit('kot_created', newKOT);
    io.to(`restaurant_${restaurantId}_branch_${branchId}`).emit('order_update', { type: 'NEW_ORDER', order });

    return res.status(201).json(order);
  } catch (error) {
    console.error('Error creating takeaway order:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const generateKOT = async (req: AuthRequest, res: Response) => {
  try {
    const { itemIds } = req.body; // Array of orderItem _ids to send
    const query = getBaseQuery(req);
    query._id = req.params.id;
    const order = await Order.findOne(query);
    
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const itemsToSend = order.items.filter(i => itemIds.includes(i._id.toString()) && !i.sentToKitchen);
    if (itemsToSend.length === 0) return res.status(400).json({ error: 'No valid items to send' });

    // Mark items as sent
    order.items.forEach(i => {
      if (itemIds.includes(i._id.toString())) {
        i.sentToKitchen = true;
      }
    });
    await order.save();

    // Fetch menu items to get category/station
    const menuItemIds = itemsToSend.map(i => i.menuItemId);
    const { MenuItem } = await import('../models/MenuItem');
    const { MenuCategory } = await import('../models/MenuCategory');
    
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    const categoryIds = menuItems.map(m => m.categoryId);
    const categories = await MenuCategory.find({ _id: { $in: categoryIds } });

    const kot = await KOT.create({
      restaurantId: req.user!.restaurantId,
      branchId: order.branchId,
      orderId: order._id,
      tableNumber: order.tableNumber,
      waiterName: order.waiterName,
      items: itemsToSend.map(i => {
        const menuItem = menuItems.find(m => m._id.toString() === i.menuItemId.toString());
        const category = categories.find(c => c._id.toString() === menuItem?.categoryId.toString());
        return {
          orderItemId: i._id,
          menuItemId: i.menuItemId,
          categoryId: menuItem?.categoryId || new mongoose.Types.ObjectId(),
          station: category?.station || 'General',
          name: i.name,
          variantName: i.variantName,
          quantity: i.quantity,
          notes: i.notes,
          status: 'PENDING'
        };
      }),
    });

    io.to(`restaurant_${req.user!.restaurantId}_branch_${order.branchId}`).emit('kot_created', kot);
    io.to(`restaurant_${req.user!.restaurantId}_branch_${order.branchId}`).emit('order_update', { type: 'KOT_SENT', order });

    return res.status(201).json(kot);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
};
