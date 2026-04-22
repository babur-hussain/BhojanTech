import mongoose from 'mongoose';

const shareLinkSchema = new mongoose.Schema({
    restaurantId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    month: { type: String, required: true },
    createdBy: { type: String, required: true },
}, { timestamps: true });

shareLinkSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

export const ShareLinkModel = mongoose.model('ShareLink', shareLinkSchema);
