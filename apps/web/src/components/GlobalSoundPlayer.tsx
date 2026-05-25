import { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGlobalSettingsStore } from '../store/globalSettingsStore';
import { playNewOrderAlert, initAudioOnInteraction } from '../utils/audio';
import { useBranchStore } from '../store/branchStore';

export default function GlobalSoundPlayer() {
  const { subscribe } = useSocket();
  const { globalMuted, globalVolume } = useGlobalSettingsStore();

  // Initialize audio and request notification permission — once on mount
  useEffect(() => {
    initAudioOnInteraction();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Subscribe to ALL order-related events that should ring
  useEffect(() => {
    if (globalMuted) return;

    /** Check if an event should be ignored based on the selected branch filter */
    const shouldIgnore = (data: any): boolean => {
      const currentBranchId = useBranchStore.getState().selectedBranchId;
      if (!currentBranchId || currentBranchId === 'all') return false;
      
      const targetBranchId = (data?.branchId || data?.order?.branchId)?.toString();
      if (targetBranchId && targetBranchId !== currentBranchId) {
        console.log(`[Sound] Ignoring event for branch ${targetBranchId} (current: ${currentBranchId})`);
        return true;
      }
      return false;
    };

    /** Show a browser notification */
    const showNotification = (title: string, body: string) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: `order-${Date.now()}`, // Unique tag so notifications don't stack
            requireInteraction: true,   // Don't auto-dismiss
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (e) {
          // Some browsers throw on Notification in certain contexts
          console.warn('[Notification] Error:', e);
        }
      }
    };

    // ── 1. KOT Created (kitchen ticket) ────────────────────────────────
    const unsubKot = subscribe('kot_created', (data: any) => {
      if (shouldIgnore(data)) return;
      console.log('[Sound] 🔔 KOT created — ringing');
      playNewOrderAlert(globalVolume);
      const table = data?.tableNumber || 'N/A';
      const isOnline = data?.isOnlineOrder;
      showNotification(
        '🔔 New KOT!',
        isOnline
          ? `Online order from ${data?.customerName || 'Customer'}`
          : `Table ${table} — new items sent to kitchen`
      );
    });

    // ── 2. Delivery order placed ────────────────────────────────────────
    const unsubDelivery = subscribe('delivery_order_placed', (data: any) => {
      if (shouldIgnore(data)) return;
      console.log('[Sound] 🔔 Delivery order placed — ringing');
      playNewOrderAlert(globalVolume);
      showNotification(
        '🛵 Delivery Order!',
        `New delivery order received`
      );
    });

    // ── 3. Order updates (NEW_ORDER, ITEMS_ADDED, KOT_SENT) ──────────
    const unsubOrder = subscribe('order_update', (data: any) => {
      if (shouldIgnore(data)) return;

      const type = data?.type;
      const order = data?.order;
      const table = order?.tableNumber || 'N/A';

      if (type === 'NEW_ORDER') {
        console.log('[Sound] 🔔 NEW_ORDER — ringing');
        playNewOrderAlert(globalVolume);
        showNotification(
          '🔔 New Order!',
          order?.isOnlineOrder
            ? `Online order from ${order?.customerName || 'Customer'}`
            : `Table ${table} — new order started`
        );
      } else if (type === 'ITEMS_ADDED') {
        console.log('[Sound] 🔔 ITEMS_ADDED — ringing');
        playNewOrderAlert(globalVolume);
        showNotification(
          '➕ Items Added!',
          `New items added to Table ${table}`
        );
      } else if (type === 'KOT_SENT') {
        console.log('[Sound] 🔔 KOT_SENT — ringing');
        playNewOrderAlert(globalVolume);
        showNotification(
          '🍳 KOT Sent to Kitchen!',
          `Table ${table} — items sent to kitchen`
        );
      }
    });

    // ── 4. Bill requested by customer ────────────────────────────────
    const unsubBill = subscribe('bill_requested', (data: any) => {
      if (shouldIgnore(data)) return;
      console.log('[Sound] 🔔 Bill requested — ringing');
      playNewOrderAlert(globalVolume);
      showNotification(
        '🧾 Bill Requested!',
        `Table ${data?.tableNumber || 'N/A'} is requesting the bill`
      );
    });

    return () => {
      unsubKot();
      unsubDelivery();
      unsubOrder();
      unsubBill();
    };
  }, [subscribe, globalMuted, globalVolume]);

  return null;
}
