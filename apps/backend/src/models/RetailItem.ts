import mongoose, { Schema, Document } from 'mongoose';

export interface IRetailItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  brand?: string;
  category: string;
  priceINR: number;
  costPriceINR?: number;
  mrp?: number;
  taxInclusive: boolean;
  gstSlab: number;       // 0, 5, 12, 18, 28
  unit: string;          // 'pcs', 'bottle', 'pack', 'box', etc.
  stock: number;
  lowStockAlert: number;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RetailItemSchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    brand: { type: String, trim: true },
    category: { type: String, default: 'General', trim: true },
    priceINR: { type: Number, required: true, min: 0 },
    costPriceINR: { type: Number, min: 0 },
    mrp: { type: Number, min: 0 },
    taxInclusive: { type: Boolean, default: true },
    gstSlab: { type: Number, enum: [0, 5, 12, 18, 28], default: 18 },
    unit: { type: String, default: 'pcs', trim: true },
    stock: { type: Number, default: 0, min: 0 },
    lowStockAlert: { type: Number, default: 5 },
    sku: { type: String, trim: true },
    barcode: { type: String, trim: true },
    hsnCode: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const RetailItem = mongoose.model<IRetailItem>('RetailItem', RetailItemSchema);
