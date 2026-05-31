export const UserRole = {
  SUPER_OWNER: 'SUPER_OWNER',
  OWNER: 'OWNER',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  MANAGER: 'MANAGER',
  WAITER: 'WAITER',
  KITCHEN_STAFF: 'KITCHEN_STAFF',
  ACCOUNTANT: 'ACCOUNTANT',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export type IntegrationPlatform = 'ZOMATO' | 'SWIGGY' | 'ONDC' | 'MANUAL';
export type IntegrationStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';

export interface Integration {
  id: string;
  restaurantId: string;
  branchId: string;
  platform: IntegrationPlatform;
  restaurantIdOnPlatform: string;
  webhookSecret?: string;
  status: IntegrationStatus;
  lastSyncTimestamp?: Date;
  autoAccept: boolean;
  prepTimeMinutes: number;
  errorLog: { timestamp: Date, message: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  firebaseUid: string;
  email?: string;
  phoneNumber?: string;
  role: UserRole;
  restaurantId?: string;
  branchId?: string; // Set for WAITER, KITCHEN_STAFF
  accessibleBranches?: string[]; // Set for BRANCH_MANAGER
  name?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  address?: string; // Registered Head Office address
  gstin?: string;
  fssaiNumber?: string;
  logoUrl?: string;
  createdAt: Date;
}

export interface Branch {
  id: string;
  restaurantId: string;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  gstin?: string;
  fssaiNumber?: string;
  managerId?: string;
  isFranchise: boolean;
  franchiseeOwnerId?: string;
  invoicePrefix: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


export interface GSTDetails {
  cgst: number;
  sgst: number;
  totalGst: number;
  hsnCode?: string;
  gstSlab: 0 | 5 | 12 | 18; // 0%, 5%, 12%, or 18% slab
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  station?: string; // e.g. Tandoor, Dessert, Curry
  order: number;
  isAvailable: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemVariant {
  name: string; // e.g., 'Quarter', 'Half', 'Full'
  priceINR: number;
  specialPriceINR?: number;
}

export interface BranchMenuOverride {
  branchId: string;
  isAvailable: boolean;
  priceOverride?: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  branchId?: string; // Optional: if present, this is a branch-specific item, not a central item.
  categoryId: string;
  name: string;
  hindiName?: string;
  description?: string;
  isVeg: boolean;
  variants: ItemVariant[];
  gstSlab: 0 | 5 | 12 | 18;
  isAvailable: boolean; // default central availability
  isAvailableOnline: boolean;
  isBestseller: boolean;
  isChefSpecial: boolean;
  spiceLevel?: 'MILD' | 'MEDIUM' | 'SPICY';
  imageUrl?: string;
  imageUrls?: string[];
  thumbnailUrl?: string;
  allergenTags: string[];
  dietaryTags?: string[];
  preparationTime?: number; // in minutes
  packingCharges?: number;
  barcode?: string;
  shortCode?: string;
  costPriceINR?: number;
  calories?: number;
  branchOverrides?: BranchMenuOverride[]; // Controls availability & pricing per branch
  zomatoItemId?: string;
  swiggyItemId?: string;
  ondcItemId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Table {
  id: string;
  restaurantId: string;
  branchId: string;
  number: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  currentOrderId?: string;
  seatedAt?: Date;
}

export interface OrderItem {
  id: string; // Unique ID for the order item (to handle multiple of same item with different notes)
  menuItemId: string;
  name: string;
  variantName?: string;
  quantity: number;
  priceAtOrderTime: number;
  notes?: string; // "extra spicy"
  sentToKitchen: boolean; // True if it's already on a KOT
}

export interface Order {
  id: string;
  restaurantId: string;
  branchId: string;
  tableId: string;
  tableNumber: string;
  waiterId: string;
  waiterName: string;
  isOnlineOrder: boolean;
  pickupTime?: Date;
  customerName?: string;
  customerPhone?: string;
  paymentMode?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  items: OrderItem[];
  status: 'OPEN' | 'BILLED' | 'PAID' | 'CANCELLED';
  totalAmountINR: number;
  deliveryPlatform?: IntegrationPlatform;
  externalOrderId?: string;
  deliveryPartner?: { name?: string; phone?: string };
  estimatedDeliveryTime?: Date;
  commissionEstimated?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KOTItem {
  _id?: string;
  orderItemId: string;
  menuItemId: string;
  categoryId: string; // Required for station filtering
  station?: string; // Computed or populated
  name: string;
  variantName?: string;
  quantity: number;
  notes?: string;
  status: 'PENDING' | 'PREPARING' | 'READY';
}

export interface KOT {
  id: string;
  restaurantId: string;
  branchId: string;
  orderId: string;
  tableNumber: string;
  waiterName: string;
  isOnlineOrder?: boolean;
  deliveryPlatform?: IntegrationPlatform | 'MANUAL';
  customerName?: string;
  items: KOTItem[];
  status: 'PENDING' | 'PREPARING' | 'READY';
  createdAt: Date;
}

// ─── Billing & Invoicing ────────────────────────────────────────────────────

export type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'SPLIT';

export interface GSTSlabBreakup {
  slab: 0 | 5 | 12 | 18;
  taxableAmount: number;
  cgst: number;    // taxableAmount × slab/2
  sgst: number;    // taxableAmount × slab/2
  total: number;   // taxableAmount + cgst + sgst
}

export interface DiscountDetails {
  type: 'FLAT' | 'PERCENT';
  value: number;
  flatAmount: number;    // computed flat amount in INR
  approvedBy?: string;   // manager name — required if discount > 10%
}

export interface PaymentSplit {
  mode: Exclude<PaymentMode, 'SPLIT'>;
  amountINR: number;
  transactionRef?: string; // for card/UPI
}

export interface InvoiceLineItem {
  name: string;
  hindiName?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  gstSlab: 0 | 5 | 12 | 18;
  lineTotal: number;
  hsnCode: string;        // 9963 for restaurant services
}

export interface Invoice {
  id: string;
  invoiceNumber: string;  // e.g., CP-INV-YYYYMMDD-XXXX
  restaurantId: string;
  branchId: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantGSTIN: string;
  restaurantFSSAI: string;
  restaurantLogoUrl?: string;
  orderId: string;
  tableNumber: string;
  waiterName: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  lineItems: InvoiceLineItem[];
  subtotalINR: number;          // pre-tax sum
  gstBreakup: GSTSlabBreakup[];
  totalGSTINR: number;
  discount?: DiscountDetails;
  roundOff: number;             // ±0.49 to round to nearest rupee
  grandTotalINR: number;
  payments: PaymentSplit[];
  paymentMode: PaymentMode;
  amountPaidINR: number;
  changeINR: number;            // cash change
  totalInWords: string;         // "Five Hundred Rupees Only"
  totalInWordHindi: string;     // "पाँच सौ रुपये मात्र"
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  customerPhone?: string;       // for WhatsApp receipt
  createdAt: Date;
}

export interface EODSummary {
  date: string;                   // YYYY-MM-DD
  restaurantId: string;
  totalOrders: number;
  totalRevenue: number;
  cashCollected: number;
  cardCollected: number;
  upiCollected: number;
  totalGSTCollected: number;
  cgstCollected: number;
  sgstCollected: number;
  totalDiscounts: number;
  invoices: { invoiceNumber: string; grandTotal: number; mode: PaymentMode }[];
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export type InventoryUnit = 'kg' | 'grams' | 'litres' | 'ml' | 'pieces' | 'dozen' | 'packets';

export interface Supplier {
  id: string;
  restaurantId: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  category: string;           // Spices | Dairy | Vegetables | Grains | Oil | Beverages | Other
  unit: InventoryUnit;
  currentQty: number;
  minThreshold: number;       // below this → alert
  reorderQty: number;         // suggested reorder quantity
  costPerUnit: number;        // INR per unit (latest purchase price)
  supplierId?: string;
  supplierName?: string;
  linkedMenuItems?: string[]; // menuItem IDs this ingredient is used in
  gramsPerServing?: number;   // auto-deduction per serving
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type StockStatus = 'HEALTHY' | 'LOW' | 'CRITICAL';

export interface PurchaseLog {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  itemName: string;
  supplierId?: string;
  supplierName?: string;
  quantityAdded: number;
  unit: InventoryUnit;
  costPerUnit: number;
  totalCost: number;
  invoiceNumber?: string;
  purchaseDate: Date;
  recordedBy: string;
  createdAt: Date;
}

export type WastageReason = 'SPOILED' | 'DROPPED' | 'OVERCOOKED' | 'EXPIRED' | 'OTHER';

export interface WastageLog {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unit: InventoryUnit;
  reason: WastageReason;
  notes?: string;
  estimatedCost: number;
  recordedBy: string;
  createdAt: Date;
}

// ─── Staff & Shift Management ────────────────────────────────────────────────

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'HOLIDAY';
export type SalaryType = 'MONTHLY' | 'DAILY';

export interface StaffMember {
  id: string;
  restaurantId: string;
  userId: string;            // links to User (Firebase UID)
  name: string;
  phone: string;
  role: UserRole;
  photoUrl?: string;
  joiningDate: Date;
  salaryType: SalaryType;
  salaryAmount: number;      // monthly fixed OR daily wage
  currentShift?: ShiftType;
  isOnDuty: boolean;
  isActive: boolean;
  fcmToken?: string;
  createdAt: Date;
}

export interface AttendanceRecord {
  id: string;
  restaurantId: string;
  staffId: string;
  staffName: string;
  date: string;              // YYYY-MM-DD
  status: AttendanceStatus;
  clockInTime?: Date;
  clockOutTime?: Date;
  clockInLat?: number;
  clockInLng?: number;
  shift: ShiftType;
  markedBy?: string;         // 'SELF' | manager name
  notes?: string;
}

export interface ShiftSlot {
  staffId: string;
  staffName: string;
  role: UserRole;
}

export interface DaySchedule {
  date: string;              // YYYY-MM-DD
  MORNING: ShiftSlot[];
  AFTERNOON: ShiftSlot[];
  EVENING: ShiftSlot[];
  NIGHT: ShiftSlot[];
}

export interface WeeklySchedule {
  id: string;
  restaurantId: string;
  weekStartDate: string;     // Monday YYYY-MM-DD
  days: DaySchedule[];
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: string;
}

export interface AdvancePayment {
  id: string;
  restaurantId: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason?: string;
  date: Date;
  recordedBy: string;
}

export interface SalaryRecord {
  id: string;
  restaurantId: string;
  staffId: string;
  staffName: string;
  month: string;             // YYYY-MM
  salaryType: SalaryType;
  baseSalary: number;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  deductions: number;
  advances: number;
  netPayable: number;
  isPaid: boolean;
  paidDate?: Date;
  paidBy?: string;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  month: string;
  ordersHandled: number;
  totalRevenue: number;
  avgOrderValue: number;
  tipsReceived: number;
  feedbackScore: number;     // 0-5
}

// ─── Accounting & CA Portal ──────────────────────────────────────────────────

export interface Expense {
  id: string;
  restaurantId: string;
  branchId: string;
  category: string;
  amount: number;
  date: Date;
  gstin?: string;
  isGstEligible: boolean;
  notes?: string;
  receiptUrl?: string;
  recordedBy: string;
  createdAt: Date;
}

export interface TdsLog {
  id: string;
  restaurantId: string;
  branchId: string;
  vendorName: string;
  panNumber: string;
  paymentAmount: number;
  tdsRate: number;
  tdsAmount: number;
  paymentDate: Date;
  section: string;
  recordedBy: string;
  createdAt: Date;
}

export interface ShareLink {
  id: string;
  restaurantId: string;
  branchId: string;
  token: string;
  expiresAt: Date;
  month: string;
  createdBy: string;
  createdAt: Date;
}
