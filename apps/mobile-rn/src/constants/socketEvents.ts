// Socket.io event names — must match backend io.emit() calls
export const SocketEvents = {
    // Connection
    JOIN_RESTAURANT: 'join_restaurant',

    // Orders
    NEW_ORDER: 'new_order',
    ORDER_UPDATED: 'order_updated',

    // KOT / Kitchen
    ITEM_STATUS_CHANGED: 'item_status_changed',
    KOT_CREATED: 'kot_created',

    // Tables
    TABLE_STATUS_CHANGED: 'table_status_changed',

    // Inventory
    INVENTORY_ALERT: 'inventory_alert',

    // Notifications
    NOTIFICATION: 'notification',
} as const;
