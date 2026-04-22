import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  unit: string;
  currentQty: number;
  minThreshold: number;
  reorderQty: number;
  costPerUnit: number;
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  linkedMenuItems: mongoose.Types.ObjectId[];
  gramsPerServing?: number;
  isActive: boolean;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name:           { type: String, required: true },
    category:       { type: String, required: true, default: 'Other' },
    unit:           { type: String, enum: ['kg','grams','litres','ml','pieces','dozen','packets'], required: true },
    currentQty:     { type: Number, required: true, default: 0, min: 0 },
    minThreshold:   { type: Number, required: true, default: 0 },
    reorderQty:     { type: Number, required: true, default: 0 },
    costPerUnit:    { type: Number, required: true, default: 0 },
    supplierId:     { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName:   { type: String },
    linkedMenuItems:[ { type: Schema.Types.ObjectId, ref: 'MenuItem' } ],
    gramsPerServing:{ type: Number },
    isActive:       { type: Boolean, default: true },
  },
  { timestamps: true }
);

InventoryItemSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
