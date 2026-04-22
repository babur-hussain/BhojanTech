import mongoose, { Schema, Document } from 'mongoose';

const ShiftSlotSchema = new Schema({
  staffId:   { type: Schema.Types.ObjectId, ref: 'StaffMember', required: true },
  staffName: { type: String, required: true },
  role:      { type: String },
}, { _id: false });

const DayScheduleSchema = new Schema({
  date:      { type: String, required: true },
  MORNING:   [ShiftSlotSchema],
  AFTERNOON: [ShiftSlotSchema],
  EVENING:   [ShiftSlotSchema],
  NIGHT:     [ShiftSlotSchema],
}, { _id: false });

export interface IWeeklySchedule extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  weekStartDate: string;
  days: any[];
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: string;
}

const WeeklyScheduleSchema = new Schema<IWeeklySchedule>({
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  weekStartDate: { type: String, required: true },
  days:          [DayScheduleSchema],
  isPublished:   { type: Boolean, default: false },
  publishedAt:   { type: Date },
  createdBy:     { type: String },
}, { timestamps: true });

ShiftSlotSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const WeeklySchedule = mongoose.model<IWeeklySchedule>('WeeklySchedule', WeeklyScheduleSchema);
