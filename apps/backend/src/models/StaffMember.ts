import mongoose, { Schema, Document } from 'mongoose';
import { fieldEncryption } from 'mongoose-field-encryption';

export interface IStaffMember extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  designation?: string;
  photoUrl?: string;
  address?: string;
  joiningDate: Date;
  salaryType: 'MONTHLY' | 'DAILY';
  salaryAmount: number;
  currentShift?: string;
  isOnDuty: boolean;
  isActive: boolean;
  fcmToken?: string;
  totalAdvances: number;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
}

const EmergencyContactSchema = new Schema({
  name: { type: String },
  phone: { type: String },
  relation: { type: String },
}, { _id: false });

const BankDetailsSchema = new Schema({
  accountName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
}, { _id: false });

const StaffMemberSchema = new Schema<IStaffMember>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  role: { type: String, enum: ['SUPER_OWNER', 'BRANCH_MANAGER', 'WAITER', 'KITCHEN_STAFF'], required: true },
  designation: { type: String },
  photoUrl: { type: String },
  address: { type: String },
  joiningDate: { type: Date, default: Date.now },
  salaryType: { type: String, enum: ['MONTHLY', 'DAILY'], default: 'MONTHLY' },
  salaryAmount: { type: Number, default: 0 },
  currentShift: { type: String, enum: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] },
  isOnDuty: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  fcmToken: { type: String },
  totalAdvances: { type: Number, default: 0 },
  emergencyContact: { type: EmergencyContactSchema },
  bankDetails: { type: BankDetailsSchema },
}, { timestamps: true });

StaffMemberSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

// Encrypt salary and phone for payroll PII compliance
StaffMemberSchema.plugin(fieldEncryption, {
  fields: ['salaryAmount', 'phone'],
  secret: process.env.FIELD_ENCRYPTION_SECRET || 'change-me-to-a-32-char-secret!!',
  saltGenerator: (secret: string) => secret.substring(0, 16),
});

export const StaffMember = mongoose.model<IStaffMember>('StaffMember', StaffMemberSchema);
