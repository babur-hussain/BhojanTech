import { create } from 'zustand';
import { MenuCategory, MenuItem } from '../types';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';

interface MenuState {
    categories: MenuCategory[];
    items: MenuItem[];
    isLoading: boolean;
    fetchMenu: () => Promise<void>;
    getItemsByCategory: (categoryId: string) => MenuItem[];
}

export const useMenuStore = create<MenuState>((set, get) => ({
    categories: [],
    items: [],
    isLoading: false,

    fetchMenu: async () => {
        set({ isLoading: true });
        try {
            const [categories, items] = await Promise.all([
                api<MenuCategory[]>(Endpoints.MENU_CATEGORIES),
                api<MenuItem[]>(Endpoints.MENU_ITEMS),
            ]);
            // Cache to MMKV: cacheSet('menu_categories', categories); cacheSet('menu_items', items);
            set({ categories, items, isLoading: false });
        } catch {
            // Load from MMKV cache if offline
            set({ isLoading: false });
        }
    },

    getItemsByCategory: (categoryId) => {
        return get().items.filter((i) => i.categoryId === categoryId && i.isAvailable);
    },
}));
