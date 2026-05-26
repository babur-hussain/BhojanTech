import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { KOT } from '../models/KOT';
import { Table } from '../models/Table';
import { Customer } from '../models/Customer';
import { Branch } from '../models/Branch';
import { MenuItem } from '../models/MenuItem';
import { razorpay } from '../config/razorpay';
import { sendOrderConfirmationWA } from '../services/whatsappService';
// Assuming io is exported from index.ts or a separate socket.ts file
import { io } from '../index';

export const lookupCustomerForOnlineOrder = async (req: Request, res: Response) => {
    try {
        const { restaurantId, phone } = req.params;
        const customer = await Customer.findOne({ restaurantId, phone }).select('name');
        if (customer) {
            return res.json({ name: customer.name });
        }
        return res.json({ name: null });
    } catch (error) {
        console.error('lookupCustomerForOnlineOrder Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createOnlineOrder = async (req: Request, res: Response) => {
    try {
        const { restaurantId, tableId, items, customerName, customerPhone, pickupTime, paymentMode } = req.body;

        // Server-side price validation: look up actual prices from DB
        const menuItemIds = items.map((item: any) => item.menuItemId).filter(Boolean);
        const menuItems = menuItemIds.length > 0
            ? await MenuItem.find({ _id: { $in: menuItemIds }, restaurantId })
            : [];

        const priceMap = new Map(menuItems.map((mi: any) => [mi._id.toString(), mi]));

        const sanitizedItems = items.map((item: any) => {
            const dbItem = priceMap.get(item.menuItemId);
            // Use DB price from variant if available, otherwise fallback to frontend price
            let price = item.priceAtOrderTime;
            if (dbItem && dbItem.variants && dbItem.variants.length > 0) {
                const variant = dbItem.variants.find((v: any) => v.name === item.variantName);
                if (variant) {
                    price = variant.specialPriceINR || variant.priceINR;
                } else {
                    // Fallback to first variant if variantName doesn't match for some reason
                    price = dbItem.variants[0].specialPriceINR || dbItem.variants[0].priceINR;
                }
            }
            return {
                menuItemId: mongoose.Types.ObjectId.isValid(item.menuItemId)
                    ? item.menuItemId
                    : new mongoose.Types.ObjectId().toString(),
                categoryId: item.categoryId || (dbItem?.categoryId?.toString()) || new mongoose.Types.ObjectId().toString(),
                name: item.name,
                variantName: item.variantName,
                quantity: item.quantity,
                priceAtOrderTime: price,
                notes: item.notes,
                gstSlab: dbItem?.gstSlab,
            };
        });

        const totalAmountINR = sanitizedItems.reduce((sum: number, item: any) => sum + (item.priceAtOrderTime * item.quantity), 0);

        let resolvedTableNumber = undefined;
        let branchId = undefined;
        if (tableId) {
            const table = await Table.findById(tableId);
            if (table) {
                resolvedTableNumber = table.number;
                branchId = table.branchId;
            }
        }

        // If no tableId or table has no branchId, fallback to the first branch of the restaurant
        if (!branchId) {
            const firstBranch = await Branch.findOne({ restaurantId });
            if (firstBranch) {
                branchId = firstBranch._id;
            }
        }

        if (tableId) {
            const existingOrder = await Order.findOne({ tableId, status: 'OPEN' });
            if (existingOrder) {
                const newOrderItemsCount = sanitizedItems.length;
                existingOrder.items.push(...sanitizedItems);
                existingOrder.totalAmountINR += totalAmountINR;
                await existingOrder.save();

                const newlyAddedItems = existingOrder.items.slice(-newOrderItemsCount);
                await createKOTForOnlineOrder(existingOrder, newlyAddedItems);

                return res.status(200).json({ orderId: existingOrder._id, message: 'Added to existing table order.' });
            }
        }

        const newOrder = new Order({
            restaurantId,
            branchId,
            tableId: tableId || undefined,
            tableNumber: resolvedTableNumber,
            isOnlineOrder: true,
            pickupTime,
            customerName,
            customerPhone,
            paymentMode,
            paymentStatus: paymentMode === 'PAY_AT_COUNTER' ? 'PENDING' : 'AWAITING_PAYMENT',
            items: sanitizedItems,
            totalAmountINR,
            status: 'OPEN'
        });

        await newOrder.save();

        if (paymentMode === 'RAZORPAY' && razorpay) {
            // Create Razorpay order
            const options = {
                amount: totalAmountINR * 100, // paise
                currency: 'INR',
                receipt: newOrder._id.toString()
            };
            const rpOrder = await razorpay.orders.create(options);

            return res.status(200).json({
                orderId: newOrder._id,
                razorpayOrderId: rpOrder.id,
                amount: options.amount
            });
        }

        // Pay at counter
        if (paymentMode === 'PAY_AT_COUNTER') {
            // Create KOT instantly
            await createKOTForOnlineOrder(newOrder);
            return res.status(200).json({ orderId: newOrder._id, message: 'Order created, pay at counter.' });
        }

        return res.status(500).json({ error: 'Invalid payment mode or Razorpay not configured' });

    } catch (error) {
        console.error('Create Online Order Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const verifyPaymentWebhook = async (req: Request, res: Response) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'Razorpay webhook secret not configured' });
        }

        // Validate signature using timing-safe comparison
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest('hex');
        const signature = req.headers['x-razorpay-signature'] as string;

        if (!signature || !crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(signature, 'utf8'))) {
            return res.status(400).json({ error: 'Invalid Signature' });
        }

        // signature is valid
        const event = req.body.event;

        if (event === 'payment.captured') {
            const paymentEntity = req.body.payload.payment.entity;
            // In razorpay order response, we stored our orderId in 'notes' or we correlate via razorpay order ID.
            // Easiest is to lookup via Razorpay order ID if we saved it, but here we can just assume 
            // the order ID is passed in notes.order_id for this setup.
            const orderId = paymentEntity.notes?.order_id;

            if (!orderId) {
                return res.status(400).json({ error: 'Missing order_id in notes' });
            }

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            order.paymentStatus = 'PAID';
            await order.save();

            // Create KOT to send to Kitchen
            await createKOTForOnlineOrder(order);

            // Send WhatsApp confirmation
            if (order.customerPhone) {
                // Assume 30 min prep
                await sendOrderConfirmationWA(order.customerPhone, order._id.toString(), 30);
            }

            return res.status(200).json({ status: 'ok' });
        }

        return res.status(200).json({ status: 'ignored' });
    } catch (error) {
        console.error('Razorpay Webhook Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const createKOTForOnlineOrder = async (order: any, specificItems?: any[]) => {
    const itemsToProcess = specificItems || order.items;
    const kotItems = itemsToProcess.map((item: any) => ({
        orderItemId: item._id,
        menuItemId: item.menuItemId,
        categoryId: item.categoryId || item.menuItemId, // Assuming category structure
        name: item.name,
        variantName: item.variantName,
        quantity: item.quantity,
        notes: item.notes,
        status: 'PENDING'
    }));

    const newKOT = new KOT({
        restaurantId: order.restaurantId,
        branchId: order.branchId,
        orderId: order._id,
        tableNumber: order.tableNumber,
        isOnlineOrder: true,
        customerName: order.customerName,
        items: kotItems,
        status: 'PENDING'
    });

    await newKOT.save();

    // Mark items as sent to kitchen
    if (order.items) {
        order.items.forEach((item: any) => {
            if (itemsToProcess.some((i: any) => i._id.toString() === item._id.toString())) {
                item.sentToKitchen = true;
            }
        });
        await order.save();
    }

    // Notify Kitchen via Socket.io
    const emitRoom = `restaurant_${order.restaurantId}_branch_${order.branchId}`;
    console.log(`[Socket Emit] Emitting kot_created to room: ${emitRoom}`);
    io.to(emitRoom).emit('kot_created', newKOT);
    io.to(emitRoom).emit('order_update', { type: 'KOT_SENT', order });
};

export const getLiveTableOrder = async (req: Request, res: Response) => {
    try {
        const { tableId } = req.params;
        const order = await Order.findOne({ tableId, status: { $in: ['OPEN', 'BILLED'] } }).populate('items.menuItemId', 'name price');
        if (!order) {
            return res.status(404).json({ message: 'No live order found for this table' });
        }
        res.status(200).json(order);
    } catch (error) {
        console.error('getLiveTableOrder Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTableInfo = async (req: Request, res: Response) => {
    try {
        const { tableId } = req.params;
        const table = await Table.findById(tableId);
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.status(200).json(table);
    } catch (error) {
        console.error('getTableInfo Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const requestBill = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        order.status = 'BILLED';
        await order.save();
        
        // Notify Waiter via Socket.io
        io.to(`restaurant_${order.restaurantId}_branch_${order.branchId}`).emit('bill_requested', { tableNumber: order.tableNumber, orderId: order._id });
        io.to(`restaurant_${order.restaurantId}_branch_${order.branchId}`).emit('order_update', { type: 'BILL_REQUESTED', order });
        io.to(`order_${order._id}`).emit('order_update', { type: 'BILL_REQUESTED', order });
        
        res.status(200).json({ message: 'Bill requested successfully', order });
    } catch (error) {
        console.error('requestBill Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const payOnlineOrder = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (!razorpay) return res.status(500).json({ error: 'Razorpay not configured' });
        
        const options = {
            amount: order.totalAmountINR * 100, // paise
            currency: 'INR',
            receipt: order._id.toString()
        };
        const rpOrder = await razorpay.orders.create(options);
        
        res.status(200).json({
            orderId: order._id,
            razorpayOrderId: rpOrder.id,
            amount: options.amount
        });
    } catch (error) {
        console.error('payOnlineOrder Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).select('status');
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        return res.json({ status: order.status });
    } catch (error) {
        console.error('Error fetching order status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
