import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  createdAt: Date;
  updatedAt: Date;
  invoiceNumber: string;
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  tableNumber: string;
  waiterName: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  lineItems: {
    name: string;
    hindiName?: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    gstSlab: number;
    lineTotal: number;
    hsnCode: string;
  }[];
  subtotalINR: number;
  gstBreakup: {
    slab: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    total: number;
  }[];
  totalGSTINR: number;
  discount?: {
    type: 'FLAT' | 'PERCENT';
    value: number;
    flatAmount: number;
    approvedBy?: string;
  };
  roundOff: number;
  grandTotalINR: number;
  payments: {
    mode: 'CASH' | 'CARD' | 'UPI';
    amountINR: number;
    transactionRef?: string;
  }[];
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'SPLIT';
  amountPaidINR: number;
  changeINR: number;
  totalInWords: string;
  totalInWordHindi: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  customerPhone?: string;
  dailySequence: number;
}

const InvoiceSchema: Schema = new Schema(
  {
    invoiceNumber: { type: String, required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    tableNumber: { type: String, default: 'DIRECT' },
    waiterName: { type: String, required: true },
    orderType: { type: String, enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'], default: 'DINE_IN' },
    lineItems: [{ name: String, hindiName: String, variantName: String, quantity: Number, unitPrice: Number, gstSlab: Number, lineTotal: Number, hsnCode: String }],
    subtotalINR: { type: Number, required: true },
    gstBreakup: [{ slab: Number, taxableAmount: Number, cgst: Number, sgst: Number, total: Number }],
    totalGSTINR: { type: Number, required: true },
    discount: { type: { type: String, value: Number, flatAmount: Number, approvedBy: String } },
    roundOff: { type: Number, default: 0 },
    grandTotalINR: { type: Number, required: true },
    payments: [{ mode: String, amountINR: Number, transactionRef: String }],
    paymentMode: { type: String, enum: ['CASH', 'CARD', 'UPI', 'SPLIT'], required: true },
    amountPaidINR: { type: Number, required: true },
    changeINR: { type: Number, default: 0 },
    totalInWords: { type: String },
    totalInWordHindi: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    customerPhone: { type: String },
    dailySequence: { type: Number, required: true },
  },
  { timestamps: true }
);

InvoiceSchema.index({ restaurantId: 1, invoiceNumber: 1 }, { unique: true });

// NOTE: Daily sequence generation is now handled by the InvoiceSequence model
// which uses atomic $inc operations for collision-free numbering.

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
