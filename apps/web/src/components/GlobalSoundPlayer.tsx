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

    const unsubKot = subscribe('kot_created', handleNewOrder);
    const unsubDelivery = subscribe('delivery_order_placed', handleNewOrder);

    return () => {
      unsubKot();
      unsubDelivery();
    };
  }, [subscribe, globalMuted, globalVolume]);

  return null;
}
