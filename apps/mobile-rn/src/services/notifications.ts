/**
 * Push Notification Service
 *
 * Uses @react-native-firebase/messaging for FCM.
 *
 * Android: Notification channels created for different alert types.
 * iOS: Permission requested after login (not on app open).
 */

import { Platform, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';

// ─── Android Notification Channels ──────────────────────────────────────────
// Created at app startup on Android only.
export const NotificationChannels = {
    ORDERS: { id: 'orders', name: 'Order Alerts', importance: 4 },
    KITCHEN: { id: 'kitchen', name: 'Kitchen Ready', importance: 4 },
    INVENTORY: { id: 'inventory', name: 'Inventory Alerts', importance: 3 },
} as const;

export async function requestNotificationPermission(): Promise<boolean> {
    try {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        return enabled;
    } catch (err) {
        console.warn('[Notifications] Permission error:', err);
        return false;
    }
}

export async function getFCMToken(): Promise<string | null> {
    try {
        const token = await messaging().getToken();
        console.log('[Notifications] FCM token:', token?.slice(0, 20) + '...');
        return token;
    } catch (err) {
        console.warn('[Notifications] Token error:', err);
        return null;
    }
}

export function setupForegroundHandler() {
    messaging().onMessage(async (remoteMessage) => {
        const title = remoteMessage.notification?.title || 'Notification';
        const body = remoteMessage.notification?.body || '';
        // Show in-app alert for foreground messages
        Alert.alert(title, body);
    });
}

export function setupBackgroundHandler() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('[Notifications] Background message:', remoteMessage.messageId);
        // Background messages are handled by the system notification tray automatically.
        // This handler is for any data-only messages that need processing.
    });
}

/**
 * Subscribe to a topic for restaurant-wide notifications.
 * Call after login when restaurantId is available.
 */
export async function subscribeToRestaurant(restaurantId: string): Promise<void> {
    try {
        await messaging().subscribeToTopic(`restaurant_${restaurantId}`);
        console.log('[Notifications] Subscribed to restaurant topic');
    } catch (err) {
        console.warn('[Notifications] Subscribe error:', err);
    }
}

/**
 * Unsubscribe from restaurant topic on logout.
 */
export async function unsubscribeFromRestaurant(restaurantId: string): Promise<void> {
    try {
        await messaging().unsubscribeFromTopic(`restaurant_${restaurantId}`);
        console.log('[Notifications] Unsubscribed from restaurant topic');
    } catch (err) {
        console.warn('[Notifications] Unsubscribe error:', err);
    }
}
