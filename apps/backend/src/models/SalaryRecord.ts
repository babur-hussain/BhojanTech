import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryRecord extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  month: string;
  salaryType: string;
  baseSalary: number;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  deductions: number;
  advances: number;
  netPayable: number;
  isPaid: boolean;
  paidDate?: Date;
  paidBy?: string;
}

const SalaryRecordSchema = new Schema<ISalaryRecord>({
  restaurantId: { type: Schema.Types.ObjectId, required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  staffId:         { type: Schema.Types.ObjectId, ref: 'StaffMember', required: true },
  staffName:       { type: String, required: true },
  month:           { type: String, required: true },  // YYYY-MM
  salaryType:      { type: String, enum: ['MONTHLY','DAILY'] },
  baseSalary:      { type: Number, required: true },
  totalWorkingDays:{ type: Number, required: true },
  presentDays:     { type: Number, default: 0 },
  absentDays:      { type: Number, default: 0 },
  halfDays:        { type: Number, default: 0 },
  deductions:      { type: Number, default: 0 },
  advances:        { type: Number, default: 0 },
  netPayable:      { type: Number, required: true },
  isPaid:          { type: Boolean, default: false },
  paidDate:        { type: Date },
  paidBy:          { type: String },
}, { timestamps: true });

SalaryRecordSchema.index({ staffId: 1, month: 1 }, { unique: true });

SalaryRecordSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const SalaryRecord = mongoose.model<ISalaryRecord>('SalaryRecord', SalaryRecordSchema);
