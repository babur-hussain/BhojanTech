import mongoose, { Schema, Document } from 'mongoose';

/**
 * StockLog — Production-grade inventory audit trail.
 * Every stock change (GRN receive, manual adjustment, sale deduction)
 * is logged here. Never deleted, only appended.
 */
export interface IStockLog extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  retailItemId: mongoose.Types.ObjectId;
  itemName: string;
  barcode?: string;
  sku?: string;

  // What changed
  action: 'GRN' | 'MANUAL_ADD' | 'MANUAL_REMOVE' | 'SALE' | 'WASTAGE' | 'CORRECTION' | 'INITIAL';
  quantityBefore: number;
  quantityChanged: number;  // +ve = added, -ve = removed
  quantityAfter: number;

  // Who did it
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;

  // Context
  note?: string;
  deviceIp?: string;
  userAgent?: string;
  createdAt: Date;
}

const StockLogSchema = new Schema<IStockLog>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId:     { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    retailItemId: { type: Schema.Types.ObjectId, ref: 'RetailItem', required: true, index: true },
    itemName:     { type: String, required: true },
    barcode:      { type: String },
    sku:          { type: String },

    action:          { type: String, enum: ['GRN', 'MANUAL_ADD', 'MANUAL_REMOVE', 'SALE', 'WASTAGE', 'CORRECTION', 'INITIAL'], required: true },
    quantityBefore:  { type: Number, required: true },
    quantityChanged: { type: Number, required: true },
    quantityAfter:   { type: Number, required: true },

    userId:   { type: Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },

    note:      { type: String },
    deviceIp:  { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    // Logs are append-only — never update
  }
);

// Compound index for fast per-item log queries
StockLogSchema.index({ retailItemId: 1, createdAt: -1 });
StockLogSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const StockLog = mongoose.model<IStockLog>('StockLog', StockLogSchema);
