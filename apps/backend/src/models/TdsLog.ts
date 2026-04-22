import mongoose from 'mongoose';
import { fieldEncryption } from 'mongoose-field-encryption';

const tdsLogSchema = new mongoose.Schema({
    restaurantId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    vendorName: { type: String, required: true },
    panNumber: { type: String, required: true },
    paymentAmount: { type: Number, required: true },
    tdsRate: { type: Number, required: true },
    tdsAmount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    section: { type: String, required: true },
    recordedBy: { type: String, required: true },
}, { timestamps: true });

// Encrypt PAN number at rest — requires FIELD_ENCRYPTION_SECRET env var (min 32 chars)
tdsLogSchema.plugin(fieldEncryption, {
    fields: ['panNumber'],
    secret: process.env.FIELD_ENCRYPTION_SECRET || 'change-me-to-a-32-char-secret!!',
    saltGenerator: (secret: string) => secret.substring(0, 16),
});

tdsLogSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

export const TdsLogModel = mongoose.model('TdsLog', tdsLogSchema);
