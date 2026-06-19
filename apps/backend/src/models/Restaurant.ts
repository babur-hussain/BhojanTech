import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  address?: string;
  contactNumber?: string;
  gstin?: string;
  fssaiNumber?: string;
  logoUrl?: string;
  upiId?: string;
  printerName?: string;
  businessType?: string;
  bookingCategories?: string[];
  defaultBookingCategory?: string;
}

const RestaurantSchema: Schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    address: { type: String },
    contactNumber: { type: String },
    gstin: { type: String },
    fssaiNumber: { type: String },
    logoUrl: { type: String },
    upiId: { type: String },
    printerName: { type: String },
    businessType: { type: String, enum: ['Restaurant', 'Bakery', 'Sweets Shop', 'Cafe', 'Retail'], default: 'Restaurant' },
    bookingCategories: [{ type: String }],
    defaultBookingCategory: { type: String },
  },
  { timestamps: true }
);

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
