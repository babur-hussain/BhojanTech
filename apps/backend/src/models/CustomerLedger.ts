import mongoose, { Schema, Document } from 'mongoose';

export type LedgerEntryType =
  | 'INVOICE'
  | 'PAYMENT'
  | 'REFUND'
  | 'CREDIT_NOTE'
  | 'ADVANCE_DEPOSIT'
  | 'ADVANCE_USED'
  | 'LOYALTY_REDEEM'
  | 'OPENING_BALANCE'
  | 'ADJUSTMENT';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export interface ICustomerLedger extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  type: LedgerEntryType;
  direction: LedgerDirection;
  amountINR: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: 'Invoice' | 'Order' | 'Booking';
  referenceId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  paymentMode?: 'CASH' | 'CARD' | 'UPI' | 'SPLIT' | 'ADVANCE';
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
}

const CustomerLedgerSchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    type: {
      type: String,
      enum: ['INVOICE', 'PAYMENT', 'REFUND', 'CREDIT_NOTE', 'ADVANCE_DEPOSIT', 'ADVANCE_USED', 'LOYALTY_REDEEM', 'OPENING_BALANCE', 'ADJUSTMENT'],
      required: true,
    },
    direction: {
      type: String,
      enum: ['DEBIT', 'CREDIT'],
      required: true,
    },
    amountINR: { type: Number, required: true },
    balanceBefore: { type: Number, required: true, default: 0 },
    balanceAfter: { type: Number, required: true, default: 0 },
    referenceType: { type: String, enum: ['Invoice', 'Order', 'Booking'] },
    referenceId: { type: Schema.Types.ObjectId },
    invoiceNumber: { type: String },
    paymentMode: { type: String, enum: ['CASH', 'CARD', 'UPI', 'SPLIT', 'ADVANCE'] },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
  },
  { timestamps: true }
);

// Performance indexes
CustomerLedgerSchema.index({ customerId: 1, createdAt: -1 });
CustomerLedgerSchema.index({ restaurantId: 1, customerId: 1 });
CustomerLedgerSchema.index({ restaurantId: 1, direction: 1, createdAt: -1 });
CustomerLedgerSchema.index({ restaurantId: 1, type: 1 });
CustomerLedgerSchema.index({ referenceId: 1 });

export const CustomerLedger = mongoose.model<ICustomerLedger>('CustomerLedger', CustomerLedgerSchema);
