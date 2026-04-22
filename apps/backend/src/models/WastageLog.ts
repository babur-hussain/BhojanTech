import mongoose, { Schema, Document } from 'mongoose';

export interface IWastageLog extends Document {
  createdAt: Date;
  updatedAt: Date;
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  inventoryItemId: mongoose.Types.ObjectId;
  itemName: string;
  quantity: number;
  unit: string;
  reason: 'SPOILED' | 'DROPPED' | 'OVERCOOKED' | 'EXPIRED' | 'OTHER';
  notes?: string;
  estimatedCost: number;
  recordedBy: string;
}

const WastageLogSchema = new Schema<IWastageLog>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true },
    reason: { type: String, enum: ['SPOILED', 'DROPPED', 'OVERCOOKED', 'EXPIRED', 'OTHER'], required: true },
    notes: { type: String },
    estimatedCost: { type: Number, required: true, default: 0 },
    recordedBy: { type: String, required: true },
  },
  { timestamps: true }
);

WastageLogSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const WastageLog = mongoose.model<IWastageLog>('WastageLog', WastageLogSchema);
