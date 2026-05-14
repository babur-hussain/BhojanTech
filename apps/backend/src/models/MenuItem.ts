import mongoose, { Schema, Document } from 'mongoose';

export interface IItemVariant {
  name: string;
  priceINR: number;
  specialPriceINR?: number;
}

export interface IMenuItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  name: string;
  hindiName?: string;
  description?: string;
  isVeg: boolean;
  variants: IItemVariant[];
  gstSlab: 0 | 5 | 12 | 18;
  isAvailable: boolean;
  isAvailableOnline: boolean;
  isBestseller: boolean;
  isChefSpecial: boolean;
  spiceLevel?: 'MILD' | 'MEDIUM' | 'SPICY';
  imageUrl?: string;
  imageUrls?: string[];
  thumbnailUrl?: string;
  allergenTags: string[];
  dietaryTags?: string[];
  preparationTime?: number;
  packingCharges?: number;
  barcode?: string;
  shortCode?: string;
  costPriceINR?: number;
  calories?: number;
  branchOverrides?: { branchId: mongoose.Types.ObjectId, isAvailable: boolean, priceOverride?: number }[];
  zomatoItemId?: string;
  swiggyItemId?: string;
  ondcItemId?: string;
}

const MenuItemSchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true, index: true },
    name: { type: String, required: true },
    hindiName: { type: String },
    description: { type: String },
    isVeg: { type: Boolean, required: true, default: true },
    variants: [
      {
        name: { type: String, required: true },
        priceINR: { type: Number, required: true },
        specialPriceINR: { type: Number },
      },
    ],
    gstSlab: { type: Number, enum: [0, 5, 12, 18], required: true },
    isAvailable: { type: Boolean, default: true },
    isAvailableOnline: { type: Boolean, default: true },
    isBestseller: { type: Boolean, default: false },
    isChefSpecial: { type: Boolean, default: false },
    spiceLevel: { type: String, enum: ['MILD', 'MEDIUM', 'SPICY'] },
    imageUrl: { type: String },
    imageUrls: [{ type: String }],
    thumbnailUrl: { type: String },
    allergenTags: [{ type: String }],
    dietaryTags: [{ type: String }],
    preparationTime: { type: Number },
    packingCharges: { type: Number },
    barcode: { type: String },
    shortCode: { type: String },
    costPriceINR: { type: Number },
    calories: { type: Number },
    branchOverrides: [
      {
        branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
        isAvailable: { type: Boolean, required: true },
        priceOverride: { type: Number },
      }
    ],
    zomatoItemId: { type: String },
    swiggyItemId: { type: String },
    ondcItemId: { type: String }
  },
  { timestamps: true }
);

MenuItemSchema.index({ restaurantId: 1, branchId: 1 });

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
