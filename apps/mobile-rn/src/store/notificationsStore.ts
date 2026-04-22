import { create } from 'zustand';

interface NotificationsState {
    unreadCount: number;
    increment: () => void;
    reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
    unreadCount: 0,
    increment: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
    reset: () => set({ unreadCount: 0 }),
}));
