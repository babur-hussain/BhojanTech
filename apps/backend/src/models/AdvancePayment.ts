import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvancePayment extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  amount: number;
  reason?: string;
  date: Date;
  approvedBy: string;
  status: 'ACTIVE' | 'DEDUCTED' | 'CANCELLED';
  deductedInMonth?: string; // YYYY-MM — set when payroll deducts it
  salaryRecordId?: mongoose.Types.ObjectId;
  recordedBy: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelReason?: string;
}

const AdvancePaymentSchema = new Schema<IAdvancePayment>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  staffId: { type: Schema.Types.ObjectId, ref: 'StaffMember', required: true },
  staffName: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  reason: { type: String },
  date: { type: Date, default: Date.now },
  approvedBy: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'DEDUCTED', 'CANCELLED'], default: 'ACTIVE' },
  deductedInMonth: { type: String },
  salaryRecordId: { type: Schema.Types.ObjectId, ref: 'SalaryRecord' },
  recordedBy: { type: String, required: true },
  cancelledAt: { type: Date },
  cancelledBy: { type: String },
  cancelReason: { type: String },
}, { timestamps: true });

AdvancePaymentSchema.index({ staffId: 1, status: 1 });
AdvancePaymentSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const AdvancePayment = mongoose.model<IAdvancePayment>('AdvancePayment', AdvancePaymentSchema);
