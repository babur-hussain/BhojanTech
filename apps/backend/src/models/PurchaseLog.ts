import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseLog extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  inventoryItemId: mongoose.Types.ObjectId;
  itemName: string;
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  quantityAdded: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  invoiceNumber?: string;
  purchaseDate: Date;
  recordedBy: string;
}

const PurchaseLogSchema = new Schema<IPurchaseLog>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    itemName:        { type: String, required: true },
    supplierId:      { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName:    { type: String },
    quantityAdded:   { type: Number, required: true, min: 0.001 },
    unit:            { type: String, required: true },
    costPerUnit:     { type: Number, required: true, min: 0 },
    totalCost:       { type: Number, required: true, min: 0 },
    invoiceNumber:   { type: String },
    purchaseDate:    { type: Date, default: Date.now },
    recordedBy:      { type: String, required: true },
  },
  { timestamps: true }
);

PurchaseLogSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const PurchaseLog = mongoose.model<IPurchaseLog>('PurchaseLog', PurchaseLogSchema);
