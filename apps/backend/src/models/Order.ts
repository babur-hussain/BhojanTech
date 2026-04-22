import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  _id: string;
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  variantName?: string;
  quantity: number;
  priceAtOrderTime: number;
  notes?: string;
  sentToKitchen: boolean;
}

export interface IOrder extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  tableId: mongoose.Types.ObjectId;
  tableNumber: string;
  waiterId: mongoose.Types.ObjectId;
  waiterName: string;
  isOnlineOrder: boolean;
  pickupTime?: Date;
  customerName?: string;
  customerPhone?: string;
  paymentMode?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  items: IOrderItem[];
  status: 'OPEN' | 'BILLED' | 'PAID' | 'CANCELLED';
  totalAmountINR: number;
  deliveryPlatform?: 'ZOMATO' | 'SWIGGY' | 'ONDC' | 'MANUAL';
  externalOrderId?: string;
  deliveryPartner?: { name?: string; phone?: string };
  estimatedDeliveryTime?: Date;
  commissionEstimated?: number;
}

const OrderSchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: function () { return !this.isOnlineOrder; } },
    tableNumber: { type: String, required: function () { return !this.isOnlineOrder; } },
    waiterId: { type: Schema.Types.ObjectId, ref: 'User', required: function () { return !this.isOnlineOrder; } },
    waiterName: { type: String, required: function () { return !this.isOnlineOrder; } },
    isOnlineOrder: { type: Boolean, default: false },
    pickupTime: { type: Date },
    customerName: { type: String },
    customerPhone: { type: String },
    paymentMode: { type: String },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'] },
    items: [
      {
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        name: { type: String, required: true },
        variantName: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        priceAtOrderTime: { type: Number, required: true },
        notes: { type: String },
        sentToKitchen: { type: Boolean, default: false },
      },
    ],
    status: { type: String, enum: ['OPEN', 'BILLED', 'PAID', 'CANCELLED'], default: 'OPEN' },
    totalAmountINR: { type: Number, required: true, default: 0 },
    deliveryPlatform: { type: String, enum: ['ZOMATO', 'SWIGGY', 'ONDC', 'MANUAL'] },
    externalOrderId: { type: String, index: true },
    deliveryPartner: {
      name: { type: String },
      phone: { type: String },
    },
    estimatedDeliveryTime: { type: Date },
    commissionEstimated: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
