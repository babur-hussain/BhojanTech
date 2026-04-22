import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name:         { type: String, required: true },
    contactName:  { type: String },
    phone:        { type: String },
    email:        { type: String },
    address:      { type: String },
    notes:        { type: String },
  },
  { timestamps: true }
);

SupplierSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
