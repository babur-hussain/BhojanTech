import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceSequence extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  dateString: string; // e.g. "20260508"
  sequence: number;
}

const InvoiceSequenceSchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    dateString: { type: String, required: true },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound unique index to guarantee one counter per restaurant+branch+date
InvoiceSequenceSchema.index({ restaurantId: 1, branchId: 1, dateString: 1 }, { unique: true });

/**
 * Atomically get the next sequence number for a given restaurant/branch/date.
 * Uses MongoDB $inc + upsert so it is completely race-condition-free.
 */
InvoiceSequenceSchema.statics.getNextSequence = async function (
  restaurantId: mongoose.Types.ObjectId,
  branchId?: mongoose.Types.ObjectId,
  date?: Date
): Promise<number> {
  const d = date || new Date();
  const dateString = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const result = await this.findOneAndUpdate(
    { restaurantId, branchId: branchId || null, dateString },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return result.sequence;
};

export const InvoiceSequence = mongoose.model<IInvoiceSequence>('InvoiceSequence', InvoiceSequenceSchema);
