import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  date: Date;
  time: string;
  guests?: number;
  productName?: string;
  quantity?: number;
  weight?: string;
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'READY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  category: string;
  specialRequests?: string;
  tableId?: mongoose.Types.ObjectId;
  totalAmount?: number;
  discountType?: 'AMOUNT' | 'PERCENTAGE';
  discountValue?: number;
  depositAmount?: number;
  source?: 'WALK_IN' | 'PHONE' | 'ONLINE';
}

const BookingSchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    time: { type: String, required: true },
    guests: { type: Number, min: 1 },
    productName: { type: String },
    quantity: { type: Number, min: 1 },
    weight: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'SEATED', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      default: 'PENDING',
    },
    category: { type: String, required: true },
    specialRequests: { type: String },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table' },
    totalAmount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['AMOUNT', 'PERCENTAGE'], default: 'AMOUNT' },
    discountValue: { type: Number, default: 0 },
    depositAmount: { type: Number, default: 0 },
    source: { type: String, enum: ['WALK_IN', 'PHONE', 'ONLINE'], default: 'PHONE' },
  },
  { timestamps: true }
);

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
