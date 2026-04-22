import mongoose, { Schema, Document } from 'mongoose';

export type CampaignOfferType = 'POINTS_BONUS' | 'FLAT_DISCOUNT' | 'FREE_ITEM';
export type CampaignStatus = 'DRAFT' | 'SENT' | 'COMPLETED';
export type CampaignTargetSegment = 'VIP' | 'REGULAR' | 'OCCASIONAL' | 'LAPSED' | 'NEW' | 'ALL';

export interface ICampaign extends Document {
    restaurantId: mongoose.Types.ObjectId;
    name: string;
    targetSegment: CampaignTargetSegment;
    offerType: CampaignOfferType;
    offerValue: number;          // points bonus amount, flat discount INR, or 0 for free item
    freeItemName?: string;
    message: string;             // SMS message text
    expiresAt: Date;
    status: CampaignStatus;
    totalRecipients: number;
    totalResponded: number;
    revenueGenerated: number;
    sentAt?: Date;
    createdBy: mongoose.Types.ObjectId;
}

const CampaignSchema: Schema = new Schema(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
        name: { type: String, required: true },
        targetSegment: {
            type: String,
            enum: ['VIP', 'REGULAR', 'OCCASIONAL', 'LAPSED', 'NEW', 'ALL'],
            required: true,
        },
        offerType: { type: String, enum: ['POINTS_BONUS', 'FLAT_DISCOUNT', 'FREE_ITEM'], required: true },
        offerValue: { type: Number, default: 0 },
        freeItemName: { type: String },
        message: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        status: { type: String, enum: ['DRAFT', 'SENT', 'COMPLETED'], default: 'DRAFT' },
        totalRecipients: { type: Number, default: 0 },
        totalResponded: { type: Number, default: 0 },
        revenueGenerated: { type: Number, default: 0 },
        sentAt: { type: Date },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
