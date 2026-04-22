import mongoose, { Schema, Document } from 'mongoose';

export interface ITierConfig {
    name: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    minSpend: number;
    maxSpend: number;       // -1 = unlimited
    discountPercent: number;
    perks: string[];
}

export interface IFestivalOffer {
    name: string;
    multiplier: number;
    from: Date;
    to: Date;
}

export interface ILoyaltySettings extends Document {
    restaurantId: mongoose.Types.ObjectId;
    // Earning
    pointsPerRupee: number;          // default 0.1 (1 pt per ₹10)
    // Redemption
    pointsPerRupeeRedemption: number; // default 10 (100 pts = ₹10)
    minimumRedemptionPoints: number; // default 500
    // Expiry
    expiryMonths: number;            // default 12
    // Bonus events
    firstVisitBonusPoints: number;   // default 500
    referralBonusPoints: number;     // default 200
    birthdayMultiplier: number;      // default 3
    festivalOffers: IFestivalOffer[];
    // Tiers
    tiers: ITierConfig[];
    // SMS
    smsLanguage: 'EN' | 'HI';
    msg91AuthKey: string;
    msg91SenderId: string;
    msg91TemplateOtp?: string;
    msg91TemplateCampaign?: string;
    msg91TemplatePoints?: string;
}

const LoyaltySettingsSchema: Schema = new Schema(
    {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true, index: true },
        pointsPerRupee: { type: Number, default: 0.1 },
        pointsPerRupeeRedemption: { type: Number, default: 10 },  // 100 pts = 10 rupees → 10 pts/rupee redeem rate
        minimumRedemptionPoints: { type: Number, default: 500 },
        expiryMonths: { type: Number, default: 12 },
        firstVisitBonusPoints: { type: Number, default: 500 },
        referralBonusPoints: { type: Number, default: 200 },
        birthdayMultiplier: { type: Number, default: 3 },
        festivalOffers: [
            {
                name: { type: String },
                multiplier: { type: Number },
                from: { type: Date },
                to: { type: Date },
            },
        ],
        tiers: {
            type: [
                {
                    name: { type: String, enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] },
                    minSpend: { type: Number },
                    maxSpend: { type: Number },
                    discountPercent: { type: Number },
                    perks: [{ type: String }],
                },
            ],
            default: [
                { name: 'BRONZE', minSpend: 0, maxSpend: 4999, discountPercent: 0, perks: [] },
                { name: 'SILVER', minSpend: 5000, maxSpend: 19999, discountPercent: 5, perks: ['5% discount on every bill'] },
                { name: 'GOLD', minSpend: 20000, maxSpend: 49999, discountPercent: 10, perks: ['10% discount', 'Priority seating'] },
                { name: 'PLATINUM', minSpend: 50000, maxSpend: -1, discountPercent: 15, perks: ['15% discount', 'Complimentary dessert on every visit'] },
            ],
        },
        smsLanguage: { type: String, enum: ['EN', 'HI'], default: 'EN' },
        msg91AuthKey: { type: String, default: '' },
        msg91SenderId: { type: String, default: 'RSTRNT' },
        msg91TemplateOtp: { type: String },
        msg91TemplateCampaign: { type: String },
        msg91TemplatePoints: { type: String },
    },
    { timestamps: true }
);

export const LoyaltySettings = mongoose.model<ILoyaltySettings>('LoyaltySettings', LoyaltySettingsSchema);
