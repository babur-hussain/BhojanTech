import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'HOLIDAY';
  clockInTime?: Date;
  clockOutTime?: Date;
  clockInLat?: number;
  clockInLng?: number;
  shift: string;
  markedBy?: string;
  notes?: string;
}

const AttendanceSchema = new Schema<IAttendance>({
  restaurantId: { type: Schema.Types.ObjectId, required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  staffId:      { type: Schema.Types.ObjectId, ref: 'StaffMember', required: true },
  staffName:    { type: String, required: true },
  date:         { type: String, required: true },  // YYYY-MM-DD
  status:       { type: String, enum: ['PRESENT','ABSENT','LATE','HALF_DAY','HOLIDAY'], default: 'ABSENT' },
  clockInTime:  { type: Date },
  clockOutTime: { type: Date },
  clockInLat:   { type: Number },
  clockInLng:   { type: Number },
  shift:        { type: String, enum: ['MORNING','AFTERNOON','EVENING','NIGHT'], required: true },
  markedBy:     { type: String },
  notes:        { type: String },
}, { timestamps: true });

AttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

AttendanceSchema.index({ restaurantId: 1, branchId: 1, createdAt: -1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
