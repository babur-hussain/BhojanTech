// ─── Base URL ───────────────────────────────────────────────────────────────
// For development, use your local machine IP (not localhost) so the device can reach the server.
// For production, replace with your deployed API URL.
export const API_BASE_URL = __DEV__
    ? 'http://10.0.2.2:8080'    // Android emulator → host machine
    : 'https://server.bhojantech.lfvs.in';

// ─── Endpoint Paths ─────────────────────────────────────────────────────────
export const Endpoints = {
    // Auth
    AUTH_LOGIN: '/api/auth/login',
    AUTH_LOGOUT: '/api/auth/logout',
    AUTH_INVITE_STAFF: '/api/auth/invite-staff',

    // Menu
    MENU_CATEGORIES: '/api/menu/categories',
    MENU_ITEMS: '/api/menu/items',
    MENU_UPLOAD_URL: '/api/menu/upload-url',

    // Tables
    TABLES: '/api/tables',

    // Orders
    ORDERS: '/api/orders',

    // KOT
    KOT_ACTIVE: '/api/kots/active',
    KOT_ITEM_STATUS: (kotId: string, itemId: string) =>
        `/api/kots/${kotId}/items/${itemId}/status`,
    KOT_NOTIFY: (kotId: string) => `/api/kots/${kotId}/notify`,

    // Billing
    BILLING_PREVIEW: (orderId: string) => `/api/billing/preview/${orderId}`,
    BILLING_PAY: '/api/billing/pay',
    BILLING_EOD: '/api/billing/eod',
    BILLING_RAZORPAY: '/api/billing/razorpay/order',

    // Inventory
    INVENTORY_ITEMS: '/api/inventory/items',
    INVENTORY_LOW_STOCK: '/api/inventory/alerts/low-stock',
    INVENTORY_ADD_STOCK: '/api/inventory/stock/add',
    INVENTORY_WASTAGE: '/api/inventory/stock/wastage',
    INVENTORY_SUPPLIERS: '/api/inventory/suppliers',

    // Staff
    STAFF: '/api/staff',
    STAFF_CLOCK_IN: '/api/staff/attendance/clock-in',
    STAFF_CLOCK_OUT: '/api/staff/attendance/clock-out',
    STAFF_TODAY_DUTY: '/api/staff/duty/today',
    STAFF_SCHEDULE: (weekStart: string) => `/api/staff/schedule/${weekStart}`,
    STAFF_PAYROLL: (month: string) => `/api/staff/payroll/${month}`,
    STAFF_PERFORMANCE: (month: string) => `/api/staff/performance/${month}`,

    // Analytics
    ANALYTICS_DASHBOARD: '/api/analytics/dashboard',
    ANALYTICS_REVENUE_TREND: '/api/analytics/revenue-trend',
    ANALYTICS_HOURLY: '/api/analytics/hourly-volume',
    ANALYTICS_CATEGORY: '/api/analytics/revenue-by-category',
    ANALYTICS_MONTHLY: '/api/analytics/monthly-comparison',
    ANALYTICS_SALES_REPORT: '/api/analytics/sales-report',
    ANALYTICS_GST_REPORT: '/api/analytics/gst-report',

    // AI
    AI_CHAT: '/api/ai/chat',
    AI_INSIGHTS: '/api/ai/insights',
    AI_MENU_SUGGESTIONS: '/api/ai/menu-suggestions',
} as const;
