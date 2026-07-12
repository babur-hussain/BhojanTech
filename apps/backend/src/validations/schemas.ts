import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  body: z.object({
    firebaseToken: z.string().min(1, 'Firebase token is required'),
  }),
});

export const inviteStaffSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number'),
    name: z.string().min(1, 'Name is required').max(100),
    role: z.enum(['WAITER', 'CHEF', 'CASHIER', 'BRANCH_MANAGER', 'ACCOUNTANT']),
    branchId: z.string().optional(),
  }),
});

// ─── Order Schemas ────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  menuItemId: z.string().min(1).optional(),
  name: z.string().min(1),
  variantName: z.string().optional(),
  quantity: z.number().int().min(1).max(100),
  priceAtOrderTime: z.number().min(0),
  notes: z.string().max(500).optional(),
  gstSlab: z.number().optional(),
});

export const createOrderSchema = z.object({
  body: z.object({
    tableId: z.string().min(1, 'Table ID is required'),
    items: z.array(orderItemSchema).min(1, 'At least one item required'),
  }),
});

export const createTakeawaySchema = z.object({
  body: z.object({
    items: z.array(orderItemSchema).optional().default([]),
    retailItems: z.array(z.any()).optional().default([]),
    customerName: z.string().max(100).optional(),
    customerPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  }).refine(data => data.items.length > 0 || data.retailItems.length > 0, {
    message: "At least one item required",
    path: ["items"]
  }),
});

export const addItemsSchema = z.object({
  body: z.object({
    items: z.array(orderItemSchema).min(1),
  }),
});

export const generateKOTSchema = z.object({
  body: z.object({
    itemIds: z.array(z.string()).min(1),
  }),
});

// ─── Online Order Schemas ─────────────────────────────────────────────────────

export const createOnlineOrderSchema = z.object({
  body: z.object({
    restaurantId: z.string().min(1, 'Restaurant ID is required'),
    tableId: z.string().optional(),
    items: z.array(z.object({
      menuItemId: z.string().min(1),
      name: z.string().min(1),
      variantName: z.string().optional(),
      quantity: z.number().int().min(1).max(100),
      priceAtOrderTime: z.number().min(0),
      notes: z.string().max(500).optional(),
    })).min(1),
    customerName: z.string().min(1).max(100),
    customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
    pickupTime: z.string().optional(),
    paymentMode: z.enum(['RAZORPAY', 'PAY_AT_COUNTER']),
  }),
});

// ─── Customer Auth Schemas ────────────────────────────────────────────────────

export const sendOTPSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit mobile number'),
    restaurantId: z.string().min(1, 'Restaurant ID is required'),
  }),
});

export const verifyOTPSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/),
    restaurantId: z.string().min(1),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

// ─── Billing Schemas ──────────────────────────────────────────────────────────

export const createRazorpayOrderSchema = z.object({
  body: z.object({
    amountINR: z.number().positive('Amount must be positive'),
  }),
});

export const finalizeBillSchema = z.object({
  body: z.object({
    paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'RAZORPAY', 'SPLIT', 'ADVANCE']),
    splitDetails: z.array(z.object({
      mode: z.enum(['CASH', 'UPI', 'CARD', 'ADVANCE']),
      amount: z.number().min(0),
    })).optional(),
    redeemPoints: z.number().int().min(0).optional(),
    customerPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
    customerName: z.string().max(100).optional(),
  }),
});

// ─── Expense / TDS Schemas ────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  body: z.object({
    category: z.string().min(1),
    amount: z.number().positive(),
    date: z.string().optional(),
    isGstEligible: z.boolean().optional(),
    description: z.string().max(500).optional(),
  }),
});

export const createTdsSchema = z.object({
  body: z.object({
    vendorName: z.string().min(1).max(200),
    panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN format').optional(),
    section: z.enum(['194C', '194I', '194J', '194H']),
    tdsAmount: z.number().positive(),
    tdsRate: z.number().min(0).max(100),
    paymentDate: z.string().optional(),
    branchId: z.string().optional(),
  }),
});

// ─── Menu Schemas ─────────────────────────────────────────────────────────────

export const createMenuItemSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1),
    name: z.string().min(1).max(200),
    hindiName: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    variants: z.array(z.object({
      name: z.string().min(1),
      priceINR: z.number().min(0),
      specialPriceINR: z.number().min(0).optional(),
    })).min(1, 'At least one variant is required'),
    isVeg: z.boolean().optional(),
    gstSlab: z.number().optional(),
    imageUrl: z.string().optional().or(z.literal('')),
    imageUrls: z.array(z.string()).optional(),
    isAvailable: z.boolean().optional(),
    allergenTags: z.array(z.string()).optional(),
    dietaryTags: z.array(z.string()).optional(),
    preparationTime: z.number().min(0).optional(),
    packingCharges: z.number().min(0).optional(),
    barcode: z.string().optional(),
    shortCode: z.string().optional(),
    costPriceINR: z.number().min(0).optional(),
    calories: z.number().min(0).optional(),
    order: z.number().optional(),
  }),
});

// ─── Branch Schemas ───────────────────────────────────────────────────────────

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    address: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    pincode: z.string().min(1).max(20),
    phone: z.string().min(1).max(100),
    gstin: z.string().max(20).optional(),
    fssaiNumber: z.string().max(50).optional(),
    invoicePrefix: z.string().min(1).max(10),
    managerId: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

// ─── Staff Schemas ────────────────────────────────────────────────────────────

export const createStaffSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    phone: z.string().regex(/^[6-9]\d{9}$/),
    role: z.enum(['WAITER', 'KITCHEN_STAFF', 'BRANCH_MANAGER', 'ACCOUNTANT']),
    designation: z.string().max(100).optional(),
    salaryType: z.enum(['MONTHLY', 'DAILY']).optional(),
    salaryAmount: z.number().min(0).optional(),
    shift: z.string().optional(),
    joiningDate: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().max(500).optional(),
    emergencyContact: z.object({
      name: z.string().max(100),
      phone: z.string(),
      relation: z.string().max(50),
    }).optional(),
    bankDetails: z.object({
      accountName: z.string().max(200),
      accountNumber: z.string().max(30),
      ifscCode: z.string().max(15),
      bankName: z.string().max(100),
    }).optional(),
  }),
});

export const giveAdvanceSchema = z.object({
  body: z.object({
    staffId: z.string().min(1),
    amount: z.number().min(1),
    reason: z.string().max(500).optional(),
    date: z.string().optional(),
  }),
});
