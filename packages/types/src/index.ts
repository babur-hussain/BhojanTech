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

export const Permission = {
  // Inventory & Retail
  INVENTORY_VIEW: 'INVENTORY_VIEW',
  INVENTORY_CREATE: 'INVENTORY_CREATE',
  INVENTORY_EDIT: 'INVENTORY_EDIT',
  INVENTORY_DELETE: 'INVENTORY_DELETE',
  RETAIL_VIEW: 'RETAIL_VIEW',
  RETAIL_CREATE: 'RETAIL_CREATE',
  RETAIL_EDIT: 'RETAIL_EDIT',
  RETAIL_DELETE: 'RETAIL_DELETE',

  // Billing & POS
  POS_ACCESS: 'POS_ACCESS',
  INVOICE_VIEW: 'INVOICE_VIEW',
  INVOICE_CREATE: 'INVOICE_CREATE',
  INVOICE_EDIT: 'INVOICE_EDIT',
  APPLY_DISCOUNT: 'APPLY_DISCOUNT',

  // Menu & Catalog
  MENU_VIEW: 'MENU_VIEW',
  MENU_CREATE: 'MENU_CREATE',
  MENU_EDIT: 'MENU_EDIT',
  MENU_DELETE: 'MENU_DELETE',

  // Orders & Tables
  ORDER_VIEW: 'ORDER_VIEW',
  ORDER_MANAGE: 'ORDER_MANAGE',
  LIVE_ORDERS_VIEW: 'LIVE_ORDERS_VIEW',
  BOOKINGS_VIEW: 'BOOKINGS_VIEW',
  TABLE_MANAGE: 'TABLE_MANAGE',
  KITCHEN_DISPLAY_ACCESS: 'KITCHEN_DISPLAY_ACCESS',

  // Marketing & Customers
  CUSTOMER_VIEW: 'CUSTOMER_VIEW',
  CAMPAIGN_VIEW: 'CAMPAIGN_VIEW',
  CUSTOMER_ANALYTICS_VIEW: 'CUSTOMER_ANALYTICS_VIEW',

  // Staff, Reports & Settings
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',
  ANALYTICS_VIEW: 'ANALYTICS_VIEW',
  STAFF_VIEW: 'STAFF_VIEW',
  STAFF_MANAGE: 'STAFF_MANAGE',
  PAYROLL_MANAGE: 'PAYROLL_MANAGE',
  REPORTS_VIEW: 'REPORTS_VIEW',
  EOD_REPORT_VIEW: 'EOD_REPORT_VIEW',
  SETTINGS_MANAGE: 'SETTINGS_MANAGE',
  BRANCH_MANAGE: 'BRANCH_MANAGE',
} as const;
export type Permission = typeof Permission[keyof typeof Permission];

export interface User {
  id: string;
  firebaseUid: string;
  email?: string;
  phoneNumber?: string;
  role: UserRole;
  restaurantId?: string;
  branchId?: string; // Set for WAITER, KITCHEN_STAFF
  accessibleBranches?: string[]; // Set for BRANCH_MANAGER
  permissions?: Permission[]; // Granular RBAC
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

export type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'SPLIT' | 'ADVANCE';

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

export interface StaffEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface StaffBankDetails {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
}

export interface StaffMember {
  id: string;
  restaurantId: string;
  branchId: string;
  userId: string;            // links to User (Firebase UID)
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  designation?: string;
  photoUrl?: string;
  address?: string;
  joiningDate: Date;
  salaryType: SalaryType;
  salaryAmount: number;      // monthly fixed OR daily wage
  currentShift?: ShiftType;
  isOnDuty: boolean;
  isActive: boolean;
  fcmToken?: string;
  totalAdvances: number;
  emergencyContact?: StaffEmergencyContact;
  bankDetails?: StaffBankDetails;
  createdAt: Date;
}

export interface AttendanceRecord {
  id: string;
  restaurantId: string;
  branchId: string;
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

export type AdvancePaymentStatus = 'ACTIVE' | 'DEDUCTED' | 'CANCELLED';

export interface AdvancePayment {
  id: string;
  restaurantId: string;
  branchId: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason?: string;
  date: Date;
  approvedBy: string;
  status: AdvancePaymentStatus;
  deductedInMonth?: string;     // YYYY-MM
  salaryRecordId?: string;
  recordedBy: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelReason?: string;
  createdAt: Date;
}

export interface SalaryRecord {
  id: string;
  restaurantId: string;
  branchId: string;
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
  presentDays: number;
  lateDays: number;
  absentDays: number;
  punctualityScore: number;  // 0-100
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
