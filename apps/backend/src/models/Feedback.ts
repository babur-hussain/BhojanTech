import mongoose, { Schema, Document } from 'mongoose';

export type FeedbackStatus = 'PENDING' | 'SUBMITTED' | 'RESOLVED';

export interface IFeedback extends Document {
    customerId?: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;
    invoiceId?: mongoose.Types.ObjectId;
    phone: string;
    rating: number;          // 1-5
    comment?: string;
    feedbackSentAt: Date;    // when SMS was sent
    submittedAt?: Date;      // when customer replied
    status: FeedbackStatus;
    isLowRating: boolean;    // true if rating <= 2
    resolvedBy?: mongoose.Types.ObjectId;
    resolvedAt?: Date;
    resolutionNote?: string;
    bonusPointsGiven: number;
}

const FeedbackSchema: Schema = new Schema(
    {
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
        branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
        invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
        phone: { type: String, required: true },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        feedbackSentAt: { type: Date, default: Date.now },
        submittedAt: { type: Date },
        status: { type: String, enum: ['PENDING', 'SUBMITTED', 'RESOLVED'], default: 'PENDING' },
        isLowRating: { type: Boolean, default: false },
        resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: { type: Date },
        resolutionNote: { type: String },
        bonusPointsGiven: { type: Number, default: 0 },
    },
    { timestamps: true }
);

FeedbackSchema.index({ restaurantId: 1, status: 1 });
FeedbackSchema.index({ restaurantId: 1, isLowRating: 1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);
