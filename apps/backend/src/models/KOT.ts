import mongoose, { Schema, Document } from 'mongoose';

export interface IKOT extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  tableNumber: string;
  waiterName: string;
  isOnlineOrder?: boolean;
  customerName?: string;
  items: {
    _id: mongoose.Types.ObjectId;
    orderItemId: mongoose.Types.ObjectId;
    menuItemId: mongoose.Types.ObjectId;
    categoryId: mongoose.Types.ObjectId;
    station?: string;
    name: string;
    variantName?: string;
    quantity: number;
    notes?: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
  }[];
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
}

const KOTSchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: false, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    tableNumber: { type: String, required: function () { return !this.isOnlineOrder; } },
    waiterName: { type: String, required: function () { return !this.isOnlineOrder; } },
    isOnlineOrder: { type: Boolean, default: false },
    customerName: { type: String },
    items: [
      {
        orderItemId: { type: Schema.Types.ObjectId, required: true },
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
        station: { type: String },
        name: { type: String, required: true },
        variantName: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        notes: { type: String },
        status: { type: String, enum: ['PENDING', 'PREPARING', 'READY', 'COMPLETED'], default: 'PENDING' },
      },
    ],
    status: { type: String, enum: ['PENDING', 'PREPARING', 'READY', 'COMPLETED'], default: 'PENDING' },
  },
  { timestamps: true }
);

export const KOT = mongoose.model<IKOT>('KOT', KOTSchema);
