import { Request, Response } from 'express';
import crypto from 'crypto';
import { Integration } from '../models/Integration';
import { Order } from '../models/Order';
import { normalizeZomatoOrder, normalizeSwiggyOrder, normalizeOndcOrder } from '../services/orderNormalizer.service';
import { io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import { getBaseQuery } from '../utils/queryHelpers';
import { menuSyncQueue } from '../workers/menuSync.worker';

export const handleZomatoWebhook = async (req: Request, res: Response): Promise<any> => {
    try {
        const signature = req.headers['x-zomato-signature'] as string;
        const branchIdStr = req.params.branchId;

        if (!branchIdStr) {
            return res.status(400).json({ error: 'Missing branchId parameter' });
        }

        const integration = await Integration.findOne({
            branchId: branchIdStr,
            platform: 'ZOMATO',
            status: 'ACTIVE'
        });

        if (!integration) {
            return res.status(404).json({ error: 'Zomato integration disabled or not found for this branch' });
        }

        // Verify HMAC signature (required if secret is set)
        if (integration.webhookSecret) {
            if (!signature) {
                return res.status(401).json({ error: 'Missing HMAC signature' });
            }
            const hmac = crypto.createHmac('sha256', integration.webhookSecret);
            const computedHash = hmac.update(JSON.stringify(req.body)).digest('hex');
            if (!crypto.timingSafeEqual(Buffer.from(computedHash, 'utf8'), Buffer.from(signature, 'utf8'))) {
                return res.status(401).json({ error: 'Invalid HMAC signature' });
            }
        }

        const payload = req.body;

        if (payload.event === 'order.placed') {
            const normalizedData = await normalizeZomatoOrder(
                payload,
                integration.restaurantId.toString(),
                integration.branchId.toString()
            );

            const newOrder = await Order.create(normalizedData);

            if (integration.autoAccept) {
                // In real world: Call Zomato API back to accept the order
                console.log(`[ZOMATO] Auto-accepted order ${normalizedData.externalOrderId}`);
            }

            // Notify KDS via sockets
            const room = `restaurant_${integration.restaurantId}_branch_${integration.branchId}`;
            io.to(room).emit('delivery_order_placed', {
                order: newOrder,
                platform: 'ZOMATO',
                badgeColor: 'red'
            });

            return res.status(200).json({
                status: 'Accepted',
                prepTime: integration.prepTimeMinutes
            });
        }

        if (payload.event === 'order.cancelled') {
            // Handle cancellation
            await Order.findOneAndUpdate(
                { externalOrderId: payload.orderId, deliveryPlatform: 'ZOMATO' },
                { status: 'CANCELLED' }
            );
            const room = `restaurant_${integration.restaurantId}_branch_${integration.branchId}`;
            io.to(room).emit('delivery_order_cancelled', { externalOrderId: payload.orderId });
            return res.status(200).json({ status: 'Cancelled' });
        }

        return res.status(200).json({ status: 'Event ignored' });

    } catch (error) {
        console.error('Zomato Webhook Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const handleSwiggyWebhook = async (req: Request, res: Response): Promise<any> => {
    try {
        const signature = req.headers['x-swiggy-signature'] as string;
        const branchIdStr = req.params.branchId;

        if (!branchIdStr) {
            return res.status(400).json({ error: 'Missing branchId parameter' });
        }

        const integration = await Integration.findOne({
            branchId: branchIdStr,
            platform: 'SWIGGY',
            status: 'ACTIVE'
        });

        if (!integration) {
            return res.status(404).json({ error: 'Swiggy integration disabled or not found for this branch' });
        }

        // Verify HMAC signature (required if secret is set)
        if (integration.webhookSecret) {
            if (!signature) {
                return res.status(401).json({ error: 'Missing HMAC signature' });
            }
            const hmac = crypto.createHmac('sha256', integration.webhookSecret);
            const computedHash = hmac.update(JSON.stringify(req.body)).digest('hex');
            if (!crypto.timingSafeEqual(Buffer.from(computedHash, 'utf8'), Buffer.from(signature, 'utf8'))) {
                return res.status(401).json({ error: 'Invalid HMAC signature' });
            }
        }

        const payload = req.body;

        if (payload.status === 'placed') {
            const normalizedData = await normalizeSwiggyOrder(
                payload,
                integration.restaurantId.toString(),
                integration.branchId.toString()
            );

            const newOrder = await Order.create(normalizedData);

            if (integration.autoAccept) {
                // In real world: Call Swiggy API back to accept the order
                console.log(`[SWIGGY] Auto-accepted order ${normalizedData.externalOrderId}`);
            }

            // Notify KDS via sockets
            const room = `restaurant_${integration.restaurantId}_branch_${integration.branchId}`;
            io.to(room).emit('delivery_order_placed', {
                order: newOrder,
                platform: 'SWIGGY',
                badgeColor: 'orange' // Distinct color for swiggy
            });

            return res.status(200).json({
                status: 'Accepted',
                prepTime: integration.prepTimeMinutes
            });
        }

        if (payload.status === 'cancelled') {
            await Order.findOneAndUpdate(
                { externalOrderId: payload.order_id, deliveryPlatform: 'SWIGGY' },
                { status: 'CANCELLED' }
            );
            const room = `restaurant_${integration.restaurantId}_branch_${integration.branchId}`;
            io.to(room).emit('delivery_order_cancelled', { externalOrderId: payload.order_id });
            return res.status(200).json({ status: 'Cancelled' });
        }

        return res.status(200).json({ status: 'Event ignored' });

    } catch (error) {
        console.error('Swiggy Webhook Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const handleOndcWebhook = async (req: Request, res: Response): Promise<any> => {
    try {
        const authorization = req.headers['authorization'] as string;
        const branchIdStr = req.params.branchId;

        if (!branchIdStr) {
            return res.status(400).json({ error: 'Missing branchId parameter' });
        }

        const integration = await Integration.findOne({
            branchId: branchIdStr,
            platform: 'ONDC',
            status: 'ACTIVE'
        });

        if (!integration) {
            return res.status(404).json({ error: 'ONDC integration disabled or not found for this branch' });
        }

        // ONDC Verification is complex (Verify Ed25519 signatures, lookup registry)
        // For now, we stub verification. In production use `ondc-crypto-sdk`
        console.log('[ONDC] Webhook received, bypassing signature check for development');

        const payload = req.body;
        const action = payload.context?.action;

        if (action === 'confirm') {
            const normalizedData = await normalizeOndcOrder(
                payload,
                integration.restaurantId.toString(),
                integration.branchId.toString()
            );

            const newOrder = await Order.create(normalizedData);

            if (integration.autoAccept) {
                // Send on_confirm payload back synchronously or asynchronously
                console.log(`[ONDC] Auto-accepted order ${normalizedData.externalOrderId}`);
            }

            const room = `restaurant_${integration.restaurantId}_branch_${integration.branchId}`;
            io.to(room).emit('delivery_order_placed', {
                order: newOrder,
                platform: 'ONDC',
                badgeColor: 'blue' // ONDC badge
            });

            return res.status(200).json({
                message: { ack: { status: "ACK" } }
            });
        }

        if (action === 'cancel') {
            const orderId = payload.message?.order_id;
            if (orderId) {
                await Order.findOneAndUpdate(
                    { externalOrderId: orderId, deliveryPlatform: 'ONDC' },
                    { status: 'CANCELLED' }
                );
                const room = `restaurant_${integration.restaurantId}_branch_${integration.branchId}`;
                io.to(room).emit('delivery_order_cancelled', { externalOrderId: orderId });
            }
            return res.status(200).json({ message: { ack: { status: "ACK" } } });
        }

        return res.status(200).json({ message: { ack: { status: "ACK" } } });

    } catch (error) {
        console.error('ONDC Webhook Error:', error);
        return res.status(500).json({ message: { ack: { status: "NACK" } } });
    }
};

export const getIntegrations = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const query = getBaseQuery(req);
        if (req.query.branchId && req.query.branchId !== 'all') {
            query.branchId = req.query.branchId;
        } else if (req.query.branchId === 'all') {
            delete query.branchId;
        }

        const integrations = await Integration.find(query).select('-webhookSecret -apiSecret');
        return res.json(integrations);
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
};

export const syncMenu = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const integration = await Integration.findOne({ 
            _id: req.params.id, 
            restaurantId: req.user!.restaurantId 
        });
        
        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        // Add a job to BullMQ
        await menuSyncQueue.add('sync-menu', {
            integrationId: integration._id,
            restaurantId: integration.restaurantId,
            branchId: integration.branchId,
            platform: integration.platform
        });

        return res.json({ message: 'Menu sync queued' });
    } catch (error) {
        console.error('Menu sync error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

export const createIntegration = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { platform, branchId, apiKey, apiSecret, webhookSecret, storeId, isActive } = req.body;
        const integration = await Integration.create({
            platform,
            branchId,
            apiKey,
            apiSecret,
            webhookSecret,
            storeId,
            isActive: isActive ?? true,
            status: 'ACTIVE',
            restaurantId: req.user!.restaurantId,
        });
        return res.status(201).json(integration);
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
};

export const updateIntegration = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { apiKey, apiSecret, webhookSecret, storeId, isActive } = req.body;
        const updateData: any = {};
        if (apiKey !== undefined) updateData.apiKey = apiKey;
        if (apiSecret !== undefined) updateData.apiSecret = apiSecret;
        if (webhookSecret !== undefined) updateData.webhookSecret = webhookSecret;
        if (storeId !== undefined) updateData.storeId = storeId;
        if (isActive !== undefined) updateData.isActive = isActive;

        const integration = await Integration.findOneAndUpdate(
            { _id: req.params.id, restaurantId: req.user!.restaurantId },
            updateData,
            { new: true }
        );
        if (!integration) return res.status(404).json({ error: 'Not found' });
        return res.json(integration);
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// Operations API
export const toggleIntegrationStatus = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { status } = req.body; // ACTIVE or PAUSED
        const integration = await Integration.findOneAndUpdate(
            { _id: req.params.id, restaurantId: req.user!.restaurantId },
            { status },
            { new: true }
        );
        if (!integration) return res.status(404).json({ error: 'Not found' });

        // In reality, this should trigger an API call to Zomato/Swiggy to turn off restaurant
        if (status === 'PAUSED') {
            console.log(`[EXTERNAL] Sent pause branch signal for platform ${integration.platform}`);
        } else {
            console.log(`[EXTERNAL] Sent resume branch signal for platform ${integration.platform}`);
        }

        return res.json(integration);
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// Financial Reconciliation
export const getReconciliationReport = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { month, year, branchId } = req.query;

        // Default to current month if not provided
        const targetDate = new Date();
        const m = month ? parseInt(month as string) - 1 : targetDate.getMonth();
        const y = year ? parseInt(year as string) : targetDate.getFullYear();

        const startDate = new Date(y, m, 1);
        const endDate = new Date(y, m + 1, 0, 23, 59, 59);

        const matchStage: any = {
            restaurantId: new mongoose.Types.ObjectId(req.user!.restaurantId),
            createdAt: { $gte: startDate, $lte: endDate },
            deliveryPlatform: { $in: ['ZOMATO', 'SWIGGY', 'ONDC'] }
        };

        if (branchId) {
            matchStage.branchId = new mongoose.Types.ObjectId(branchId as string);
        }

        const report = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$deliveryPlatform",
                    totalOrders: { $sum: 1 },
                    grossRevenue: { $sum: "$totalAmountINR" },
                    totalCommissionEstimated: { $sum: "$commissionEstimated" }
                }
            },
            {
                $project: {
                    platform: "$_id",
                    totalOrders: 1,
                    grossRevenue: 1,
                    totalCommissionEstimated: 1,
                    netPayoutEstimated: { $subtract: ["$grossRevenue", "$totalCommissionEstimated"] }
                }
            }
        ]);

        return res.json({
            period: { month: m + 1, year: y },
            report
        });
    } catch (error) {
        console.error('Reconciliation error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};
