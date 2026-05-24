import { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useGlobalSettingsStore } from '../store/globalSettingsStore';
import { playNewOrderAlert, initAudioOnInteraction } from '../utils/audio';

export default function GlobalSoundPlayer() {
  const { subscribe } = useSocket();
  const { globalMuted, globalVolume } = useGlobalSettingsStore();

  useEffect(() => {
    initAudioOnInteraction();
  }, []);

  useEffect(() => {
    if (globalMuted) return;

    const handleNewOrder = () => {
      playNewOrderAlert(globalVolume);
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
