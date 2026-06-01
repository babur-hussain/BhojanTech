import { Response } from 'express';
import { Order } from '../models/Order';
import { Table } from '../models/Table';
import { KOT } from '../models/KOT';
import { MenuItem } from '../models/MenuItem';
import { MenuCategory } from '../models/MenuCategory';
import { io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { getBaseQuery, getCreateBranchId } from '../utils/queryHelpers';
import mongoose from 'mongoose';

// Escape special regex characters to prevent ReDoS
const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getActiveOrders = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    // Include PAID orders so that Takeaway / Direct Invoices remain on LiveOrders until COMPLETED
    query.status = { $in: ['OPEN', 'BILLED', 'PAID'] };
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
      const escapedSearch = escapeRegex(search as string);
      query.$or = [
        { tableNumber: { $regex: escapedSearch, $options: 'i' } },
        { waiterName: { $regex: escapedSearch, $options: 'i' } },
        { customerName: { $regex: escapedSearch, $options: 'i' } },
        { customerPhone: { $regex: escapedSearch, $options: 'i' } },
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

    // Server-side price validation: look up actual prices from DB
    const menuItemIds = items.map((i: any) => i.menuItemId).filter(Boolean);
    const menuItemDocs = menuItemIds.length > 0
      ? await MenuItem.find({ _id: { $in: menuItemIds }, restaurantId })
      : [];
    const priceMap = new Map(menuItemDocs.map((mi: any) => [mi._id.toString(), mi.price]));

    const validatedItems = items.map((i: any) => {
      const dbPrice = priceMap.get(i.menuItemId);
      return {
        ...i,
        _id: new mongoose.Types.ObjectId(),
        priceAtOrderTime: dbPrice !== undefined ? dbPrice : i.priceAtOrderTime, // trust DB price
      };
    });

    const totalAmountINR = validatedItems.reduce((sum: number, item: any) => sum + (item.priceAtOrderTime * item.quantity), 0);

    const order = await Order.create({
      restaurantId,
      branchId,
      tableId,
      tableNumber: table.number,
      waiterId: req.user!.userId,
      waiterName: req.user!.name || 'Waiter',
      items: validatedItems,
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

export const completeOrder = async (req: AuthRequest, res: Response) => {
  try {
    const query = getBaseQuery(req);
    query._id = req.params.id;
    const order = await Order.findOne(query);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = 'COMPLETED';
    await order.save();

    const room = order.branchId
      ? `restaurant_${req.user!.restaurantId}_branch_${order.branchId}`
      : `restaurant_${req.user!.restaurantId}`;
      
    io.to(room).emit('order_update', { type: 'ORDER_COMPLETED', orderId: order._id });
    
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createTakeawayOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, customerName, customerPhone } = req.body;
    const restaurantId = req.user!.restaurantId;
    const branchId = getCreateBranchId(req); // undefined is OK for OWNER role

    if ((!items || items.length === 0) && (!req.body.retailItems || req.body.retailItems.length === 0)) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const menuItemsInput = items || [];
    const retailItemsInput = req.body.retailItems || [];

    const totalAmountINR = [...menuItemsInput, ...retailItemsInput].reduce(
      (sum: number, item: any) => sum + (Number(item.priceAtOrderTime || 0) * Number(item.quantity || 1)),
      0
    );

    const formattedItems = [
      ...menuItemsInput.map((i: any) => ({
        ...i,
        _id: new mongoose.Types.ObjectId(),
        sentToKitchen: true,
        priceAtOrderTime: Number(i.priceAtOrderTime || 0),
      })),
      ...retailItemsInput.map((i: any) => ({
        ...i,
        _id: new mongoose.Types.ObjectId(),
        retailItemId: i._id,
        isRetailItem: true,
        sentToKitchen: true,
        priceAtOrderTime: Number(i.priceAtOrderTime || 0),
      }))
    ];

    const order = await Order.create({
      restaurantId,
      ...(branchId ? { branchId } : {}),
      // Takeaway orders have no table — use null/undefined instead of a fake ObjectId
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

    // Create KOT only for real menu items (not retail/placeholder items)
    const menuItems = formattedItems.filter((item: any) => !!item.menuItemId);
    if (menuItems.length > 0) {
      const menuItemIds = menuItems.map((i: any) => i.menuItemId);
      
      const dbMenuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
      const categoryIds = dbMenuItems.map(m => m.categoryId);
      const categories = await MenuCategory.find({ _id: { $in: categoryIds } });

      const kotItems = menuItems.map((item: any) => {
        const menuItem = dbMenuItems.find(m => m._id.toString() === item.menuItemId.toString());
        const category = categories.find(c => c._id.toString() === menuItem?.categoryId.toString());
        return {
          orderItemId: item._id,
          menuItemId: item.menuItemId,
          categoryId: menuItem?.categoryId || new mongoose.Types.ObjectId(),
          station: category?.station || 'General',
          name: item.name,
          variantName: item.variantName,
          quantity: item.quantity,
          status: 'PENDING',
        };
      });

      const newKOT = new KOT({
        restaurantId: order.restaurantId,
        branchId: order.branchId,
        orderId: order._id,
        tableNumber: order.tableNumber,
        waiterName: order.waiterName,
        isOnlineOrder: false,
        customerName: order.customerName,
        items: kotItems,
        status: 'PENDING',
      });
      await newKOT.save();

      const room = branchId
        ? `restaurant_${restaurantId}_branch_${branchId}`
        : `restaurant_${restaurantId}`;
      io.to(room).emit('kot_created', newKOT);
    }

    const room = branchId
      ? `restaurant_${restaurantId}_branch_${branchId}`
      : `restaurant_${restaurantId}`;
    io.to(room).emit('order_update', { type: 'NEW_ORDER', order });

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
