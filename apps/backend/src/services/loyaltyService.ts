import { Customer, ICustomer, CustomerTier, CustomerSegment } from '../models/Customer';
import { LoyaltySettings, ILoyaltySettings, ITierConfig } from '../models/LoyaltySettings';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction';
import { Order } from '../models/Order';
import mongoose from 'mongoose';

function generateReferralCode(length = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Tier resolution ─────────────────────────────────────────────────────────

export function resolveTier(totalSpend: number, tiers: ITierConfig[]): ITierConfig {
    const sorted = [...tiers].sort((a, b) => b.minSpend - a.minSpend);
    return sorted.find((t) => totalSpend >= t.minSpend) || sorted[sorted.length - 1];
}

// ─── Segment resolution ──────────────────────────────────────────────────────

export function resolveSegment(customer: {
    totalVisits: number;
    totalSpend: number;
    lastVisitDate: Date;
    firstVisitDate: Date;
}): CustomerSegment {
    const now = Date.now();
    const daysSinceLast = (now - customer.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceFirst = (now - customer.firstVisitDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLast > 60) return 'LAPSED';
    if (daysSinceFirst <= 7 && customer.totalVisits === 1) return 'NEW';
    if (customer.totalVisits >= 10 || customer.totalSpend >= 10000) return 'VIP';
    if (customer.totalVisits >= 3) return 'REGULAR';
    return 'OCCASIONAL';
}

// ─── Get or init settings ────────────────────────────────────────────────────

export async function getOrInitSettings(restaurantId: string): Promise<ILoyaltySettings> {
    let settings = await LoyaltySettings.findOne({ restaurantId });
    if (!settings) {
        settings = await LoyaltySettings.create({ restaurantId });
    }
    return settings;
}

// ─── Calculate points to earn ────────────────────────────────────────────────

export function calculatePointsToEarn(
    amountINR: number,
    settings: ILoyaltySettings,
    options: {
        isFirstVisit?: boolean;
        isBirthdayMonth?: boolean;
        visitDate?: Date;
    } = {}
): { basePoints: number; bonusPoints: number; multiplier: number; totalPoints: number } {
    const date = options.visitDate || new Date();
    let multiplier = 1;

    if (options.isBirthdayMonth) {
        multiplier = Math.max(multiplier, settings.birthdayMultiplier);
    }

    // Check festival offers
    for (const fest of settings.festivalOffers) {
        if (date >= new Date(fest.from) && date <= new Date(fest.to)) {
            multiplier = Math.max(multiplier, fest.multiplier);
        }
    }

    const basePoints = Math.floor(amountINR * settings.pointsPerRupee * multiplier);
    const bonusPoints = options.isFirstVisit ? settings.firstVisitBonusPoints : 0;
    return { basePoints, bonusPoints, multiplier, totalPoints: basePoints + bonusPoints };
}

// ─── Apply tier discount ──────────────────────────────────────────────────────

export function applyTierDiscount(
    subtotalINR: number,
    tier: ITierConfig | undefined
): number {
    if (!tier || tier.discountPercent === 0) return 0;
    return +(subtotalINR * (tier.discountPercent / 100)).toFixed(2);
}

// ─── Upsert customer on billing ──────────────────────────────────────────────

export async function upsertCustomer(
    restaurantId: string,
    phone: string,
    name: string,
    amountPaid: number,
    orderId: string,
    orderItems: { name: string; menuItemId: string; quantity: number }[],
    referredByCode?: string,
    dob?: Date | null
): Promise<{
    customer: ICustomer;
    isFirstVisit: boolean;
    isBirthdayMonth: boolean;
    tierConfig: ITierConfig | undefined;
    settings: ILoyaltySettings;
}> {
    const settings = await getOrInitSettings(restaurantId);
    const now = new Date();

    let customer = await Customer.findOne({ restaurantId, phone });
    const isFirstVisit = !customer;

    if (!customer) {
        // Generate a unique referral code
        let referralCode = generateReferralCode();
        while (await Customer.findOne({ referralCode })) {
            referralCode = generateReferralCode();
        }

        customer = await Customer.create({
            restaurantId,
            phone,
            name,
            firstVisitDate: now,
            lastVisitDate: now,
            totalVisits: 1,
            totalSpend: amountPaid,
            avgOrderValue: amountPaid,
            tier: 'BRONZE',
            segment: 'NEW',
            referralCode,
            referredBy: referredByCode,
            loyaltyPoints: 0,
            dob,
            birthdayMonth: dob ? dob.getMonth() + 1 : undefined,
        });

        // Award referrer points if valid code
        if (referredByCode) {
            const referrer = await Customer.findOne({ restaurantId, referralCode: referredByCode });
            if (referrer && settings.referralBonusPoints > 0) {
                const balanceBefore = referrer.loyaltyPoints;
                const balanceAfter = balanceBefore + settings.referralBonusPoints;
                referrer.loyaltyPoints = balanceAfter;
                await referrer.save();

                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + settings.expiryMonths);

                await LoyaltyTransaction.create({
                    customerId: referrer._id,
                    restaurantId,
                    type: 'BONUS',
                    points: settings.referralBonusPoints,
                    balanceBefore,
                    balanceAfter,
                    description: `Referral bonus for referring ${phone}`,
                    expiresAt,
                });
            }
        }
    } else {
        customer.name = name || customer.name;
        customer.totalVisits += 1;
        customer.totalSpend += amountPaid;
        customer.avgOrderValue = +(customer.totalSpend / customer.totalVisits).toFixed(2);
        customer.lastVisitDate = now;
        if (dob) {
            customer.dob = dob;
            customer.birthdayMonth = dob.getMonth() + 1;
        } else if (dob === null) {
            customer.dob = undefined;
            customer.birthdayMonth = undefined;
        }
    }

    // Update favorite items
    for (const item of orderItems) {
        const existing = customer.favoriteItems.find(
            (fi) => fi.menuItemId.toString() === item.menuItemId
        );
        if (existing) {
            existing.count += item.quantity;
        } else {
            customer.favoriteItems.push({
                menuItemId: new mongoose.Types.ObjectId(item.menuItemId) as any,
                name: item.name,
                count: item.quantity,
            });
        }
    }
    // Keep top 10 favourites sorted by count
    customer.favoriteItems.sort((a, b) => b.count - a.count);
    if (customer.favoriteItems.length > 10) customer.favoriteItems = customer.favoriteItems.slice(0, 10);

    // Recompute tier
    const tierConfig = resolveTier(customer.totalSpend, settings.tiers);
    customer.tier = tierConfig.name as CustomerTier;

    // Recompute segment
    customer.segment = resolveSegment(customer) as any;

    await customer.save();

    const isBirthdayMonth = !!(customer.birthdayMonth && customer.birthdayMonth === now.getMonth() + 1);

    return { customer, isFirstVisit, isBirthdayMonth, tierConfig, settings };
}

// ─── Earn points after billing ───────────────────────────────────────────────

export async function earnPoints(
    customer: ICustomer,
    amountINR: number,
    orderId: string,
    settings: ILoyaltySettings,
    isFirstVisit: boolean,
    isBirthdayMonth: boolean
): Promise<{ pointsEarned: number; newBalance: number }> {
    const { totalPoints } = calculatePointsToEarn(amountINR, settings, {
        isFirstVisit,
        isBirthdayMonth,
    });

    const balanceBefore = customer.loyaltyPoints;
    const balanceAfter = balanceBefore + totalPoints;

    customer.loyaltyPoints = balanceAfter;
    await customer.save();

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + settings.expiryMonths);

    await LoyaltyTransaction.create({
        customerId: customer._id,
        restaurantId: customer.restaurantId,
        orderId: new mongoose.Types.ObjectId(orderId),
        type: isFirstVisit && settings.firstVisitBonusPoints > 0 ? 'BONUS' : 'EARNED',
        points: totalPoints,
        balanceBefore,
        balanceAfter,
        description: isFirstVisit
            ? `Welcome bonus + ₹${amountINR} spend`
            : `Earned for ₹${amountINR} spend`,
        expiresAt,
    });

    return { pointsEarned: totalPoints, newBalance: balanceAfter };
}

// ─── Redeem points ───────────────────────────────────────────────────────────

export async function redeemPoints(
    customerId: string,
    restaurantId: string,
    pointsToRedeem: number,
    orderId: string,
    settings: ILoyaltySettings
): Promise<{ discountINR: number; newBalance: number } | { error: string }> {
    if (pointsToRedeem < settings.minimumRedemptionPoints) {
        return { error: `Minimum redemption is ${settings.minimumRedemptionPoints} points` };
    }

    const customer = await Customer.findOne({ _id: customerId, restaurantId });
    if (!customer) return { error: 'Customer not found' };
    if (customer.loyaltyPoints < pointsToRedeem) return { error: 'Insufficient points' };

    const discountINR = +(pointsToRedeem / settings.pointsPerRupeeRedemption).toFixed(2);
    const balanceBefore = customer.loyaltyPoints;
    const balanceAfter = balanceBefore - pointsToRedeem;

    customer.loyaltyPoints = balanceAfter;
    await customer.save();

    await LoyaltyTransaction.create({
        customerId: customer._id,
        restaurantId,
        orderId: new mongoose.Types.ObjectId(orderId),
        type: 'REDEEMED',
        points: -pointsToRedeem,
        balanceBefore,
        balanceAfter,
        description: `Redeemed ${pointsToRedeem} pts for ₹${discountINR} discount`,
    });

    return { discountINR, newBalance: balanceAfter };
}

// ─── Expire old points (monthly cron) ────────────────────────────────────────

export async function expireOldPoints(): Promise<void> {
    const cutoffDate = new Date();
    const settings = await LoyaltySettings.find();

    for (const setting of settings) {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - setting.expiryMonths);

        // Find customers with points who haven't had activity
        const staleCustomers = await Customer.find({
            restaurantId: setting.restaurantId,
            loyaltyPoints: { $gt: 0 },
            lastVisitDate: { $lt: cutoff },
        });

        for (const customer of staleCustomers) {
            const balanceBefore = customer.loyaltyPoints;
            customer.loyaltyPoints = 0;
            await customer.save();

            await LoyaltyTransaction.create({
                customerId: customer._id,
                restaurantId: customer.restaurantId,
                type: 'EXPIRED',
                points: -balanceBefore,
                balanceBefore,
                balanceAfter: 0,
                description: `Points expired due to ${setting.expiryMonths} months inactivity`,
            });
        }
    }
}
