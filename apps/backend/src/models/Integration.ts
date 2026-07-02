import mongoose, { Schema, Document } from 'mongoose';

export type IntegrationPlatform = 'ZOMATO' | 'SWIGGY' | 'ONDC' | 'MANUAL' | 'LOOMIFLOW';
export type IntegrationStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';

export interface IIntegration extends Document {
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    platform: IntegrationPlatform;
    restaurantIdOnPlatform: string;
    webhookSecret?: string;
    status: IntegrationStatus;
    lastSyncTimestamp?: Date;
    autoAccept: boolean;
    prepTimeMinutes: number;
    errorLog: { timestamp: Date, message: string }[];
    apiKey?: string;
    apiSecret?: string;
    whatsappConfig?: {
        invoiceTemplateName?: string;
        invoiceTemplateMapping?: Record<string, string>;
        bookingTemplateName?: string;
        bookingTemplateMapping?: Record<string, string>;
    };
}

const IntegrationSchema: Schema = new Schema(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
        branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
        platform: { type: String, enum: ['ZOMATO', 'SWIGGY', 'ONDC', 'MANUAL', 'LOOMIFLOW'], required: true },
        restaurantIdOnPlatform: { type: String, required: true },
        webhookSecret: { type: String },
        apiKey: { type: String },
        apiSecret: { type: String },
        status: { type: String, enum: ['ACTIVE', 'PAUSED', 'ERROR'], default: 'ACTIVE' },
        lastSyncTimestamp: { type: Date },
        autoAccept: { type: Boolean, default: true },
        prepTimeMinutes: { type: Number, default: 30 },
        whatsappConfig: {
            invoiceTemplateName: { type: String },
            invoiceTemplateMapping: { type: Map, of: String },
            bookingTemplateName: { type: String },
            bookingTemplateMapping: { type: Map, of: String },
        },
        errorLog: [
            {
                timestamp: { type: Date, default: Date.now },
                message: { type: String },
            }
        ],
    },
    { timestamps: true }
);

IntegrationSchema.index({ branchId: 1, platform: 1 }, { unique: true });

export const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);
