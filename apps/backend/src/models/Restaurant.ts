import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  address?: string;
  gstin?: string;
  fssaiNumber?: string;
  logoUrl?: string;
}

const RestaurantSchema: Schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    address: { type: String },
    gstin: { type: String },
    fssaiNumber: { type: String },
    logoUrl: { type: String },
  },
  { timestamps: true }
);

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
