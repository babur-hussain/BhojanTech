import mongoose, { Schema, Document } from 'mongoose';

export interface ITable extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  number: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  currentOrderId?: mongoose.Types.ObjectId;
  seatedAt?: Date;
}

const TableSchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: false, index: true },
    number: { type: String, required: true },
    capacity: { type: Number, required: true, default: 4 },
    status: { type: String, enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED'], default: 'AVAILABLE' },
    currentOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    seatedAt: { type: Date },
  },
  { timestamps: true }
);

export const Table = mongoose.model<ITable>('Table', TableSchema);
