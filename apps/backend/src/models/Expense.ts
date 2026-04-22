import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
    restaurantId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    gstin: { type: String },
    isGstEligible: { type: Boolean, default: false },
    notes: { type: String },
    receiptUrl: { type: String },
    recordedBy: { type: String, required: true },
}, { timestamps: true });

expenseSchema.set('toJSON', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

export const ExpenseModel = mongoose.model('Expense', expenseSchema);
