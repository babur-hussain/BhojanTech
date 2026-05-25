import { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGlobalSettingsStore } from '../store/globalSettingsStore';
import { playNewOrderAlert, initAudioOnInteraction } from '../utils/audio';

export default function GlobalSoundPlayer() {
  const { subscribe } = useSocket();
  const { globalMuted, globalVolume } = useGlobalSettingsStore();

  useEffect(() => {
    initAudioOnInteraction();

    // Request browser notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (globalMuted) return;

    const handleNewOrder = (data: any) => {
      playNewOrderAlert(globalVolume);

      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = '🔔 New Order Received!';
        const options = {
          body: 'A new order or KOT has just arrived at the restaurant.',
          icon: '/favicon.ico',
        };
        const notification = new Notification(title, options);
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    };

    const handleOrderUpdate = (data: any) => {
      if (data?.type === 'ITEMS_ADDED') {
        playNewOrderAlert(globalVolume);

        if ('Notification' in window && Notification.permission === 'granted') {
          const tableText = data?.order?.tableNumber ? `Table ${data.order.tableNumber}` : 'an order';
          const title = '➕ Items Added!';
          const options = {
            body: `New items were just added to ${tableText}.`,
            icon: '/favicon.ico',
          };
          const notification = new Notification(title, options);
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      }
    };

    const unsubKot = subscribe('kot_created', handleNewOrder);
    const unsubDelivery = subscribe('delivery_order_placed', handleNewOrder);
    const unsubOrder = subscribe('order_update', handleOrderUpdate);

    return () => {
      unsubKot();
      unsubDelivery();
      unsubOrder();
    };
  }, [subscribe, globalMuted, globalVolume]);

  return null;
}
