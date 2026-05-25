import mongoose, { Schema, Document } from 'mongoose';
import { fieldEncryption } from 'mongoose-field-encryption';

export type CustomerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type CustomerSegment = 'VIP' | 'REGULAR' | 'OCCASIONAL' | 'LAPSED' | 'NEW';

export interface ICustomer extends Document {
    restaurantId: mongoose.Types.ObjectId;
    phone: string;
    name: string;
    email?: string;
    firstVisitDate: Date;
    lastVisitDate: Date;
    totalVisits: number;
    totalSpend: number;
    avgOrderValue: number;
    favoriteItems: { menuItemId: mongoose.Types.ObjectId; name: string; count: number }[];
    birthdayMonth?: number; // 1-12
    loyaltyPoints: number;
    tier: CustomerTier;
    segment: CustomerSegment;
    referralCode: string;
    referredBy?: string; // referral code of the referrer
    smsOptIn: boolean;
    whatsappOptIn: boolean;
    dob?: Date;
    notes: string;
    otp?: string;
    otpExpiresAt?: Date;
}

const CustomerSchema: Schema = new Schema(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
        phone: { type: String, required: true, index: true },
        name: { type: String, required: true },
        email: { type: String },
        firstVisitDate: { type: Date, required: true },
        lastVisitDate: { type: Date, required: true },
        totalVisits: { type: Number, default: 0 },
        totalSpend: { type: Number, default: 0 },
        avgOrderValue: { type: Number, default: 0 },
        favoriteItems: [
            {
                menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
                name: { type: String },
                count: { type: Number, default: 1 },
            },
        ],
        birthdayMonth: { type: Number, min: 1, max: 12 },
        loyaltyPoints: { type: Number, default: 0 },
        tier: { type: String, enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'], default: 'BRONZE' },
        segment: { type: String, enum: ['VIP', 'REGULAR', 'OCCASIONAL', 'LAPSED', 'NEW'], default: 'NEW' },
        referralCode: { type: String, unique: true, required: true, index: true },
        referredBy: { type: String },
        smsOptIn: { type: Boolean, default: true },
        whatsappOptIn: { type: Boolean, default: true },
        dob: { type: Date },
        notes: { type: String, default: '' },
        otp: { type: String },
        otpExpiresAt: { type: Date },
    },
    { timestamps: true }
);

// Compound unique — one customer profile per phone per restaurant
CustomerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true });
CustomerSchema.index({ restaurantId: 1, segment: 1 });
CustomerSchema.index({ restaurantId: 1, tier: 1 });
CustomerSchema.index({ restaurantId: 1, birthdayMonth: 1 });

// Encrypt phone at rest for PII compliance
CustomerSchema.plugin(fieldEncryption, {
    fields: ['phone'],
    secret: process.env.FIELD_ENCRYPTION_SECRET || 'change-me-to-a-32-char-secret!!',
    saltGenerator: (secret: string) => secret.substring(0, 16),
});

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
