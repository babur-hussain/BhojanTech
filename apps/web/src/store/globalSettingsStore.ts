import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalSettingsState {
  globalMuted: boolean;
  globalVolume: number;
  setGlobalMuted: (muted: boolean) => void;
  setGlobalVolume: (volume: number) => void;
}

export const useGlobalSettingsStore = create<GlobalSettingsState>()(
  persist(
    (set) => ({
      globalMuted: false,
      globalVolume: 0.5,
      setGlobalMuted: (muted) => set({ globalMuted: muted }),
      setGlobalVolume: (volume) => set({ globalVolume: volume }),
    }),
    {
      name: 'resto-global-settings',
    }
  )
);
