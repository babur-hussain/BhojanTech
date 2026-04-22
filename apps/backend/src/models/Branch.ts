import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
    restaurantId: mongoose.Types.ObjectId;
    name: string;
    address: string;
    city: string;
    pincode: string;
    phone: string;
    gstin?: string;
    fssaiNumber?: string;
    managerId?: mongoose.Types.ObjectId;
    isFranchise: boolean;
    franchiseeOwnerId?: mongoose.Types.ObjectId;
    invoicePrefix: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BranchSchema: Schema = new Schema(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
        name: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        pincode: { type: String, required: true },
        phone: { type: String, required: true },
        gstin: { type: String },
        fssaiNumber: { type: String },
        managerId: { type: Schema.Types.ObjectId, ref: 'User' },
        isFranchise: { type: Boolean, default: false },
        franchiseeOwnerId: { type: Schema.Types.ObjectId, ref: 'User' },
        invoicePrefix: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Allow searching by restaurant and branch quickly
BranchSchema.index({ restaurantId: 1, _id: 1 });

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema);
