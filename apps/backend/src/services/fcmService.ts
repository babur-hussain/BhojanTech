/**
 * FCM Push Notification Service — BhojanTech
 *
 * Sends push notifications to:
 *  - Staff mobile app (React Native, via @react-native-firebase/messaging)
 *  - Customer PWA (via Firebase Web Push / VAPID)
 *
 * All send*() functions are fire-and-forget; errors are logged but never thrown.
 */

import { firebaseMessaging } from '../config/firebase';
import { Message, MulticastMessage } from 'firebase-admin/messaging';
import { StaffMember } from '../models/StaffMember';
import { User } from '../models/User';

async function cleanupStaleToken(token: string) {
  try {
    await StaffMember.updateMany({ fcmToken: token }, { $unset: { fcmToken: 1 } });
    await User.updateMany({}, { $pull: { fcmTokens: token } });
    console.log(`[FCM] 🧹 Purged stale token from database.`);
  } catch (err) {
    console.error(`[FCM] ❌ Failed to purge token`, err);
  }
}

// ─── Notification Topics ────────────────────────────────────────────────────

/** FCM topic for a restaurant branch — all staff subscribed to this receive branch-wide alerts */
export const branchTopic = (restaurantId: string, branchId: string) =>
  `restaurant_${restaurantId}_branch_${branchId}`;

/** FCM topic for kitchen staff of a branch */
export const kitchenTopic = (restaurantId: string, branchId: string) =>
  `kitchen_${restaurantId}_branch_${branchId}`;

// ─── Payload Builders ────────────────────────────────────────────────────────

interface NewOrderPayload {
  orderId: string;
  tableNumber: string;
  itemCount: number;
  restaurantId: string;
  branchId: string;
}

interface OrderStatusPayload {
  orderId: string;
  status: string;
  customerPhone?: string;
  fcmToken?: string;
}

interface LowStockPayload {
  itemName: string;
  currentStock: number;
  unit: string;
  restaurantId: string;
  branchId: string;
}

interface KOTReadyPayload {
  kotId: string;
  tableNumber: string;
  restaurantId: string;
  branchId: string;
}

// ─── Core Send Helpers ───────────────────────────────────────────────────────

/**
 * Send to a single FCM token (one device).
 */
export async function sendToToken(token: string, message: Omit<Message, 'token'>): Promise<void> {
  try {
    const messageId = await firebaseMessaging.send({ ...message, token });
    console.log(`[FCM] ✅ Sent to token ...${token.slice(-6)}: ${messageId}`);
  } catch (err: any) {
    console.error(`[FCM] ❌ Failed to send to token ...${token.slice(-6)}:`, err.message);
    if (err.code === 'messaging/invalid-registration-token' || err.code === 'messaging/registration-token-not-registered') {
      await cleanupStaleToken(token);
    }
  }
}

/**
 * Multicast to up to 500 tokens at once.
 */
export async function sendMulticast(
  tokens: string[],
  message: Omit<MulticastMessage, 'tokens'>
): Promise<void> {
  if (!tokens.length) return;
  try {
    const response = await firebaseMessaging.sendEachForMulticast({ ...message, tokens });
    console.log(
      `[FCM] ✅ Multicast: ${response.successCount} sent, ${response.failureCount} failed`
    );
    if (response.failureCount > 0) {
      for (let i = 0; i < response.responses.length; i++) {
        const res = response.responses[i];
        if (!res.success && res.error) {
          if (res.error.code === 'messaging/invalid-registration-token' || res.error.code === 'messaging/registration-token-not-registered') {
            await cleanupStaleToken(tokens[i]);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[FCM] ❌ Multicast error:', err.message);
  }
}

/**
 * Send to a topic (all subscribed devices). No token list needed.
 */
export async function sendToTopic(
  topic: string,
  message: Omit<Message, 'topic'>
): Promise<void> {
  try {
    const messageId = await firebaseMessaging.send({ ...message, topic });
    console.log(`[FCM] ✅ Topic "${topic}": ${messageId}`);
  } catch (err: any) {
    console.error(`[FCM] ❌ Topic "${topic}" error:`, err.message);
  }
}

// ─── Subscribe / Unsubscribe ─────────────────────────────────────────────────

/** Subscribe a list of FCM tokens to a topic */
export async function subscribeToTopic(tokens: string[], topic: string): Promise<void> {
  if (!tokens.length) return;
  try {
    const res = await firebaseMessaging.subscribeToTopic(tokens, topic);
    console.log(`[FCM] Subscribed ${res.successCount} tokens to topic "${topic}"`);
  } catch (err: any) {
    console.error(`[FCM] ❌ Subscribe error:`, err.message);
  }
}

/** Unsubscribe tokens from a topic */
export async function unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
  if (!tokens.length) return;
  try {
    const res = await firebaseMessaging.unsubscribeFromTopic(tokens, topic);
    console.log(`[FCM] Unsubscribed ${res.successCount} tokens from topic "${topic}"`);
  } catch (err: any) {
    console.error(`[FCM] ❌ Unsubscribe error:`, err.message);
  }
}

// ─── Domain Notifications ────────────────────────────────────────────────────

/**
 * 🔔 New order placed — sent to kitchen topic so all kitchen staff are alerted.
 */
export async function notifyNewOrder(payload: NewOrderPayload): Promise<void> {
  const topic = kitchenTopic(payload.restaurantId, payload.branchId);
  await sendToTopic(topic, {
    notification: {
      title: '🍽️ New Order!',
      body: `Table ${payload.tableNumber} — ${payload.itemCount} item${payload.itemCount !== 1 ? 's' : ''}`,
    },
    data: {
      type: 'NEW_ORDER',
      orderId: payload.orderId,
      tableNumber: payload.tableNumber,
      restaurantId: payload.restaurantId,
      branchId: payload.branchId,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders',
        sound: 'kitchen_alert',
        vibrateTimingsMillis: [0, 250, 250, 250],
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'kitchen_alert.wav',
          badge: 1,
        },
      },
    },
  });
}

/**
 * ✅ KOT ready — notifies the waiter that their order is ready for pickup.
 * @param waiterToken FCM token of the specific waiter
 */
export async function notifyKOTReady(
  payload: KOTReadyPayload,
  waiterToken: string
): Promise<void> {
  await sendToToken(waiterToken, {
    notification: {
      title: '✅ Order Ready!',
      body: `Table ${payload.tableNumber} is ready for pickup`,
    },
    data: {
      type: 'KOT_READY',
      kotId: payload.kotId,
      tableNumber: payload.tableNumber,
    },
    android: {
      priority: 'high',
      notification: { channelId: 'kitchen' },
    },
  });
}

/**
 * ⚠️  Low stock alert — sent to branch managers.
 * @param managerTokens Array of FCM tokens for branch managers
 */
export async function notifyLowStock(
  payload: LowStockPayload,
  managerTokens: string[]
): Promise<void> {
  await sendMulticast(managerTokens, {
    notification: {
      title: '⚠️ Low Stock Alert',
      body: `${payload.itemName} is running low (${payload.currentStock} ${payload.unit} remaining)`,
    },
    data: {
      type: 'LOW_STOCK',
      itemName: payload.itemName,
      currentStock: String(payload.currentStock),
      restaurantId: payload.restaurantId,
      branchId: payload.branchId,
    },
    android: {
      notification: { channelId: 'inventory' },
    },
  });
}

/**
 * 📦 Customer order status update (for online orders) — sent to customer's PWA/device.
 * @param fcmToken Customer's FCM web push token
 */
export async function notifyCustomerOrderStatus(payload: OrderStatusPayload): Promise<void> {
  if (!payload.fcmToken) return;

  const statusMessages: Record<string, { title: string; body: string }> = {
    PREPARING: { title: '👨‍🍳 Order Confirmed!', body: 'Your order is being prepared. Estimated 20-30 mins.' },
    READY: { title: '🎉 Order Ready!', body: 'Your order is ready for pickup!' },
    DELIVERED: { title: '✅ Order Complete!', body: 'Enjoy your meal! Rate us on BhojanTech.' },
    CANCELLED: { title: '❌ Order Cancelled', body: 'Your order was cancelled. Refund will process in 3-5 days.' },
  };

  const msg = statusMessages[payload.status] ?? {
    title: 'Order Update',
    body: `Your order status: ${payload.status}`,
  };

  await sendToToken(payload.fcmToken, {
    notification: msg,
    data: {
      type: 'ORDER_STATUS',
      orderId: payload.orderId,
      status: payload.status,
    },
    webpush: {
      notification: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        actions: [
          { action: 'view', title: 'Track Order' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      },
      fcmOptions: {
        link: `/track/${payload.orderId}`,
      },
    },
  });
}
