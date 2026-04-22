import mongoose, { Document, Schema } from 'mongoose';

export interface IAIInsight extends Document {
    insightText: string;
    category: 'Sales' | 'Inventory' | 'Staff' | 'Marketing' | 'General';
    actionableInfo?: string;
    dateGenerated: Date;
    isRead: boolean;
}

const AIInsightSchema: Schema = new Schema({
    insightText: { type: String, required: true },
    category: {
        type: String,
        enum: ['Sales', 'Inventory', 'Staff', 'Marketing', 'General'],
        required: true
    },
    actionableInfo: { type: String },
    dateGenerated: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
});

export default mongoose.model<IAIInsight>('AIInsight', AIInsightSchema);
