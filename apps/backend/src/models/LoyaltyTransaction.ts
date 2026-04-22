import mongoose, { Schema, Document } from 'mongoose';

export type LoyaltyTxType = 'EARNED' | 'REDEEMED' | 'BONUS' | 'EXPIRED' | 'APOLOGY_BONUS';

export interface ILoyaltyTransaction extends Document {
    customerId: mongoose.Types.ObjectId;
    restaurantId: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    type: LoyaltyTxType;
    points: number;          // positive = credit, negative = debit
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    expiresAt?: Date;        // for EARNED transactions — when they will expire
}

const LoyaltyTransactionSchema: Schema = new Schema(
    {
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
        type: { type: String, enum: ['EARNED', 'REDEEMED', 'BONUS', 'EXPIRED', 'APOLOGY_BONUS'], required: true },
        points: { type: Number, required: true },
        balanceBefore: { type: Number, required: true },
        balanceAfter: { type: Number, required: true },
        description: { type: String, required: true },
        expiresAt: { type: Date },
    },
    { timestamps: true }
);

LoyaltyTransactionSchema.index({ customerId: 1, createdAt: -1 });

export const LoyaltyTransaction = mongoose.model<ILoyaltyTransaction>(
    'LoyaltyTransaction',
    LoyaltyTransactionSchema
);
