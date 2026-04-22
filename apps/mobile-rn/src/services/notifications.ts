/**
 * Push Notification Service
 *
 * Uses @react-native-firebase/messaging for FCM.
 * Native setup required — see NATIVE_SETUP.md.
 *
 * Android: Notification channels created for different alert types.
 * iOS: Permission requested after login (not on app open).
 */

import { Platform } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import Toast from 'react-native-toast-message';

// ─── Android Notification Channels ──────────────────────────────────────────
// Created at app startup on Android only.
// Requires react-native-push-notification or Notifee for channel creation.
export const NotificationChannels = {
    ORDERS: { id: 'orders', name: 'Order Alerts', importance: 4 },
    KITCHEN: { id: 'kitchen', name: 'Kitchen Ready', importance: 4 },
    INVENTORY: { id: 'inventory', name: 'Inventory Alerts', importance: 3 },
} as const;

export async function requestNotificationPermission(): Promise<boolean> {
    // iOS: Request permission only after login
    // Android: Permissions auto-granted up to API 32, need POST_NOTIFICATIONS for API 33+
    try {
        // const authStatus = await messaging().requestPermission();
        // const enabled =
        //   authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        //   authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        // return enabled;
        console.log('[Notifications] Permission request stub');
        return true;
    } catch (err) {
        console.warn('[Notifications] Permission error:', err);
        return false;
    }
}

export async function getFCMToken(): Promise<string | null> {
    try {
        // const token = await messaging().getToken();
        // return token;
        console.log('[Notifications] FCM token stub');
        return 'stub-fcm-token';
    } catch (err) {
        console.warn('[Notifications] Token error:', err);
        return null;
    }
}

export function setupForegroundHandler() {
    // messaging().onMessage(async (remoteMessage) => {
    //   // Show in-app toast notification
    //   Toast.show({
    //     type: 'info',
    //     text1: remoteMessage.notification?.title || 'Notification',
    //     text2: remoteMessage.notification?.body || '',
    //     topOffset: 60,
    //   });
    // });
    console.log('[Notifications] Foreground handler stub');
}

export function setupBackgroundHandler() {
    // messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    //   console.log('[Notifications] Background message:', remoteMessage);
    // });
    console.log('[Notifications] Background handler stub');
}
