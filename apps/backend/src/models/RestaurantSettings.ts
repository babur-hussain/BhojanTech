import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurantSettings extends Document {
    restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
    isOnlineOrderingEnabled: boolean;
    estimatedPrepTime: number; // in minutes
    minimumOrderValue: number; // in INR
    pickupSlots: number; // minutes interval, e.g., 15
}

const RestaurantSettingsSchema: Schema = new Schema(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true, unique: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
        isOnlineOrderingEnabled: { type: Boolean, default: true },
        estimatedPrepTime: { type: Number, default: 30 },
        minimumOrderValue: { type: Number, default: 200 },
        pickupSlots: { type: Number, default: 15 },
    },
    { timestamps: true }
);

export const RestaurantSettings = mongoose.model<IRestaurantSettings>('RestaurantSettings', RestaurantSettingsSchema);
