// Mirrored from packages/types/src/index.ts for use in React Native CLI project
// Keep in sync with the monorepo shared types.

export enum UserRole {
    OWNER = 'OWNER',
    MANAGER = 'MANAGER',
    WAITER = 'WAITER',
    KITCHEN_STAFF = 'KITCHEN_STAFF',
}

export interface User {
    id: string;
    firebaseUid: string;
    email?: string;
    phoneNumber?: string;
    role: UserRole;
    restaurantId?: string;
    name?: string;
    isActive: boolean;
    createdAt: Date;
}

export interface Restaurant {
    id: string;
    ownerId: string;
    name: string;
    address?: string;
    gstin?: string;
    fssaiNumber?: string;
    logoUrl?: string;
    createdAt: Date;
}

export interface MenuCategory {
    id: string;
    restaurantId: string;
    name: string;
    station?: string;
    order: number;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ItemVariant {
    name: string;
    priceINR: number;
}

export interface MenuItem {
    id: string;
    restaurantId: string;
    categoryId: string;
    name: string;
    hindiName?: string;
    description?: string;
    isVeg: boolean;
    variants: ItemVariant[];
    gstSlab: 5 | 12 | 18;
    isAvailable: boolean;
    imageUrl?: string;
    thumbnailUrl?: string;
    allergenTags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Table {
    id: string;
    restaurantId: string;
    number: string;
    capacity: number;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
    currentOrderId?: string;
    seatedAt?: Date;
}

export interface OrderItem {
    id: string;
    menuItemId: string;
    name: string;
    variantName?: string;
    quantity: number;
    priceAtOrderTime: number;
    notes?: string;
    sentToKitchen: boolean;
}

export interface Order {
    id: string;
    restaurantId: string;
    tableId: string;
    tableNumber: string;
    waiterId: string;
    waiterName: string;
    items: OrderItem[];
    status: 'OPEN' | 'BILLED' | 'PAID' | 'CANCELLED';
    totalAmountINR: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface KOTItem {
    _id?: string;
    orderItemId: string;
    menuItemId: string;
    categoryId: string;
    station?: string;
    name: string;
    variantName?: string;
    quantity: number;
    notes?: string;
    status: 'PENDING' | 'PREPARING' | 'READY';
}

export interface KOT {
    id: string;
    restaurantId: string;
    orderId: string;
    tableNumber: string;
    waiterName: string;
    items: KOTItem[];
    status: 'PENDING' | 'PREPARING' | 'READY';
    createdAt: Date;
}

export type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'SPLIT';

export interface GSTSlabBreakup {
    slab: 5 | 12 | 18;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    total: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    restaurantId: string;
    orderId: string;
    tableNumber: string;
    waiterName: string;
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    subtotalINR: number;
    gstBreakup: GSTSlabBreakup[];
    totalGSTINR: number;
    grandTotalINR: number;
    paymentMode: PaymentMode;
    amountPaidINR: number;
    changeINR: number;
    totalInWords: string;
    createdAt: Date;
}

export interface EODSummary {
    date: string;
    restaurantId: string;
    totalOrders: number;
    totalRevenue: number;
    cashCollected: number;
    cardCollected: number;
    upiCollected: number;
    totalGSTCollected: number;
    totalDiscounts: number;
}

export type InventoryUnit = 'kg' | 'grams' | 'litres' | 'ml' | 'pieces' | 'dozen' | 'packets';

export interface InventoryItem {
    id: string;
    restaurantId: string;
    name: string;
    category: string;
    unit: InventoryUnit;
    currentQty: number;
    minThreshold: number;
    reorderQty: number;
    costPerUnit: number;
    supplierName?: string;
    isActive: boolean;
}

export type StockStatus = 'HEALTHY' | 'LOW' | 'CRITICAL';

export interface StaffMember {
    id: string;
    restaurantId: string;
    userId: string;
    name: string;
    phone: string;
    role: UserRole;
    photoUrl?: string;
    isOnDuty: boolean;
    isActive: boolean;
    fcmToken?: string;
}

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'HOLIDAY';

export interface AttendanceRecord {
    id: string;
    staffId: string;
    staffName: string;
    date: string;
    status: AttendanceStatus;
    clockInTime?: Date;
    clockOutTime?: Date;
    shift: ShiftType;
}

export interface StaffPerformance {
    staffId: string;
    staffName: string;
    month: string;
    ordersHandled: number;
    totalRevenue: number;
    avgOrderValue: number;
}
