import { Request, Response } from 'express';
import crypto from 'crypto';
import { Order } from '../models/Order';
import { KOT } from '../models/KOT';
import { razorpay } from '../config/razorpay';
import { sendOrderConfirmationWA } from '../services/whatsappService';
// Assuming io is exported from index.ts or a separate socket.ts file
import { io } from '../index';

export const createOnlineOrder = async (req: Request, res: Response) => {
    try {
        const { restaurantId, items, customerName, customerPhone, pickupTime, paymentMode } = req.body;

        // In a real scenario, we'd fetch actual prices from DB. Here we trust the request for stub purposes
        const totalAmountINR = items.reduce((sum: number, item: any) => sum + (item.priceAtOrderTime * item.quantity), 0);

        const newOrder = new Order({
            restaurantId,
            isOnlineOrder: true,
            pickupTime,
            customerName,
            customerPhone,
            paymentMode,
            paymentStatus: paymentMode === 'PAY_AT_COUNTER' ? 'PENDING' : 'PENDING',
            items,
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
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'fallback_secret';

        // Validate signature
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest('hex');

        if (digest !== req.headers['x-razorpay-signature']) {
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

const createKOTForOnlineOrder = async (order: any) => {
    const kotItems = order.items.map((item: any) => ({
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
        orderId: order._id,
        isOnlineOrder: true,
        customerName: order.customerName,
        items: kotItems,
        status: 'PENDING'
    });

    await newKOT.save();

    // Notify Kitchen via Socket.io
    io.to(`restaurant_${order.restaurantId}_branch_${order.branchId}`).emit('new_kot', { kot: newKOT, isOnlineOrder: true });
};
