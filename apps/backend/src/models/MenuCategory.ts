import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuCategory extends Document {
  restaurantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  name: string;
  station?: string;
  order: number;
  isAvailable: boolean;
}

const MenuCategorySchema: Schema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    name: { type: String, required: true },
    station: { type: String },
    order: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MenuCategory = mongoose.model<IMenuCategory>('MenuCategory', MenuCategorySchema);
