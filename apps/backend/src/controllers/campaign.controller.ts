import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { Campaign } from '../models/Campaign';
import { CampaignRecipient } from '../models/CampaignRecipient';
import { Customer } from '../models/Customer';
import { getOrInitSettings } from '../services/loyaltyService';
import { sendBulkSMS } from '../services/smsService';
import { sendCampaignWA } from '../services/whatsappService';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction';

// ─── List campaigns ───────────────────────────────────────────────────────────

export const listCampaigns = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;
        const campaigns = await Campaign.find({ restaurantId })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name');
        return res.json({ campaigns });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Create campaign ─────────────────────────────────────────────────────────

export const createCampaign = async (req: AuthRequest, res: Response) => {
    try {
        const restaurantId = req.user!.restaurantId;
        const { name, targetSegment, offerType, offerValue, freeItemName, message, expiresAt } = req.body;

        const campaign = await Campaign.create({
            restaurantId,
            name,
            targetSegment,
            offerType,
            offerValue,
            freeItemName,
            message,
            expiresAt,
            status: 'DRAFT',
            createdBy: req.user!.userId,
        });

        return res.status(201).json({ campaign });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Preview audience size ────────────────────────────────────────────────────

export const previewCampaignAudience = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user!.restaurantId;

        const campaign = await Campaign.findOne({ _id: id, restaurantId });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const filter: any = { restaurantId, smsOptIn: true };
        if (campaign.targetSegment !== 'ALL') filter.segment = campaign.targetSegment;

        const count = await Customer.countDocuments(filter);
        return res.json({ audienceSize: count, segment: campaign.targetSegment });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Send campaign ────────────────────────────────────────────────────────────

export const sendCampaign = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user!.restaurantId as string;

        const campaign = await Campaign.findOne({ _id: id, restaurantId });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        if (campaign.status === 'SENT') return res.status(400).json({ error: 'Campaign already sent' });

        const settings = await getOrInitSettings(restaurantId);

        const filter: any = { restaurantId, $or: [{ smsOptIn: true }, { whatsappOptIn: true }] };
        if (campaign.targetSegment !== 'ALL') filter.segment = campaign.targetSegment;

        const customers = await Customer.find(filter).select('_id phone name loyaltyPoints');

        // Create recipient records
        const recipients = customers.map((c) => ({
            campaignId: campaign._id,
            customerId: c._id,
            restaurantId,
            phone: c.phone,
        }));

        if (recipients.length > 0) {
            await CampaignRecipient.insertMany(recipients, { ordered: false });
        }

        // Send SMS if auth key is configured
        let smsResult = { sent: 0, failed: 0 };
        if (settings.msg91AuthKey) {
            const phones = customers.map((c) => c.phone);
            smsResult = await sendBulkSMS(phones, campaign.message, {
                authKey: settings.msg91AuthKey,
                senderId: settings.msg91SenderId,
                language: settings.smsLanguage,
            });

            // Mark recipients as sent
            await CampaignRecipient.updateMany(
                { campaignId: campaign._id },
                { $set: { smsSent: true, sentAt: new Date() } }
            );
        }

        // Send WhatsApp via LoomiFlow (non-blocking, fire-and-forget)
        const restaurant = await mongoose.model('Restaurant').findById(restaurantId).select('name').lean();
        const restaurantName = (restaurant as any)?.name || 'Your Restaurant';
        const waCustomers = customers.filter((c: any) => c.whatsappOptIn !== false);
        const waPromises = waCustomers.map(c =>
            sendCampaignWA(c.phone, restaurantName, campaign.message, 'limited time')
                .catch(err => console.error(`[Campaign WA] Failed for ${c.phone}: ${err.message}`))
        );
        // Run in batches of 10 to respect rate limits
        for (let i = 0; i < waPromises.length; i += 10) {
            await Promise.allSettled(waPromises.slice(i, i + 10));
        }

        // Apply POINTS_BONUS offers in a transaction to prevent race conditions
        if (campaign.offerType === 'POINTS_BONUS' && campaign.offerValue > 0) {
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    for (const customer of customers) {
                        const freshCustomer = await Customer.findById(customer._id).session(session);
                        if (!freshCustomer) continue;
                        const balanceBefore = freshCustomer.loyaltyPoints;
                        const balanceAfter = balanceBefore + campaign.offerValue;
                        await Customer.findByIdAndUpdate(customer._id, { loyaltyPoints: balanceAfter }, { session });
                        await LoyaltyTransaction.create([{
                            customerId: customer._id,
                            restaurantId,
                            type: 'BONUS',
                            points: campaign.offerValue,
                            balanceBefore,
                            balanceAfter,
                            description: `Campaign bonus: ${campaign.name}`,
                        }], { session });
                    }
                });
            } finally {
                await session.endSession();
            }
        }

        // Mark campaign as SENT only after all operations complete successfully
        campaign.status = 'SENT';
        campaign.sentAt = new Date();
        campaign.totalRecipients = customers.length;
        await campaign.save();

        return res.json({ campaign, smsResult });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── Campaign stats / ROI ─────────────────────────────────────────────────────

export const getCampaignStats = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user!.restaurantId;

        const campaign = await Campaign.findOne({ _id: id, restaurantId });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const recipients = await CampaignRecipient.find({ campaignId: id })
            .populate('customerId', 'name phone tier')
            .populate('orderId', 'totalAmountINR createdAt');

        const responded = recipients.filter((r) => r.responded);
        const revenue = recipients.reduce((s, r) => s + r.revenueFromOrder, 0);

        return res.json({
            campaign,
            totalRecipients: recipients.length,
            totalResponded: responded.length,
            responseRate: recipients.length > 0 ? +((responded.length / recipients.length) * 100).toFixed(1) : 0,
            revenueGenerated: revenue,
            recipients,
        });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};
