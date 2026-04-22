import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaignRecipient extends Document {
    campaignId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    phone: string;
    sentAt?: Date;
    smsSent: boolean;
    responded: boolean;
    respondedAt?: Date;
    orderId?: mongoose.Types.ObjectId;   // order placed after receiving campaign
    revenueFromOrder: number;
}

const CampaignRecipientSchema: Schema = new Schema(
    {
        campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
        phone: { type: String, required: true },
        sentAt: { type: Date },
        smsSent: { type: Boolean, default: false },
        responded: { type: Boolean, default: false },
        respondedAt: { type: Date },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
        revenueFromOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

CampaignRecipientSchema.index({ campaignId: 1, customerId: 1 }, { unique: true });

export const CampaignRecipient = mongoose.model<ICampaignRecipient>(
    'CampaignRecipient',
    CampaignRecipientSchema
);
