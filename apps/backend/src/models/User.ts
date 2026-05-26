import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@restaurant/types';

export interface IUser extends Document {
  firebaseUid: string;
  email?: string;
  phoneNumber?: string;
  role: UserRole;
  restaurantId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId; // Scoped to singular branch
  accessibleBranches?: mongoose.Types.ObjectId[]; // Scoped to multiple for managers
  /** The branch the user last selected in the UI — persisted server-side so it syncs across devices.
   *  Can be an ObjectId string or the literal 'all' for consolidated view. */
  selectedBranchId?: string;
  name?: string;
  isActive: boolean;
  /** FCM push tokens — one per device (web + mobile). Max 10 stored per user. */
  fcmTokens?: string[];
}

const UserSchema: Schema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, sparse: true, unique: true },
    phoneNumber: { type: String, sparse: true, unique: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    accessibleBranches: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    selectedBranchId: { type: String, default: null },
    name: { type: String },
    isActive: { type: Boolean, default: true },
    fcmTokens: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
