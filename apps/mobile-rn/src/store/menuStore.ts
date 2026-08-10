import { create } from 'zustand';
import { MenuCategory, MenuItem } from '../types';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';
import { cacheSet, cacheGet } from '../services/offline';

interface MenuState {
    categories: MenuCategory[];
    items: MenuItem[];
    isLoading: boolean;
    fetchMenu: () => Promise<void>;
    getItemsByCategory: (categoryId: string) => MenuItem[];
    toggleItemAvailability: (itemId: string, isAvailable: boolean) => Promise<void>;
    addItem: (item: Partial<MenuItem>) => Promise<MenuItem>;
    updateItem: (itemId: string, updates: Partial<MenuItem>) => Promise<void>;
    deleteItem: (itemId: string) => Promise<void>;
    addCategory: (name: string, station?: string) => Promise<MenuCategory>;
    updateCategory: (catId: string, updates: Partial<MenuCategory>) => Promise<void>;
    deleteCategory: (catId: string) => Promise<void>;
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
            cacheSet('menu_categories', categories);
            cacheSet('menu_items', items);
            set({ categories, items, isLoading: false });
        } catch {
            // Load from MMKV cache if offline
            const cachedCats = cacheGet<MenuCategory[]>('menu_categories');
            const cachedItems = cacheGet<MenuItem[]>('menu_items');
            set({
                categories: cachedCats || [],
                items: cachedItems || [],
                isLoading: false,
            });
        }
    },

    getItemsByCategory: (categoryId) => {
        return get().items.filter((i) => i.categoryId === categoryId && i.isAvailable);
    },

    toggleItemAvailability: async (itemId, isAvailable) => {
        await api(Endpoints.MENU_ITEM_AVAILABILITY(itemId), {
            method: 'PATCH',
            body: { isAvailable },
        });
        set((s) => ({
            items: s.items.map((i) =>
                i.id === itemId ? { ...i, isAvailable } : i,
            ),
        }));
    },

    addItem: async (item) => {
        const newItem = await api<MenuItem>(Endpoints.MENU_ITEMS, {
            method: 'POST',
            body: item,
        });
        set((s) => ({ items: [...s.items, newItem] }));
        return newItem;
    },

    updateItem: async (itemId, updates) => {
        await api(Endpoints.MENU_ITEM_BY_ID(itemId), {
            method: 'PATCH',
            body: updates,
        });
        set((s) => ({
            items: s.items.map((i) =>
                i.id === itemId ? { ...i, ...updates } : i,
            ),
        }));
    },

    deleteItem: async (itemId) => {
        await api(Endpoints.MENU_ITEM_BY_ID(itemId), { method: 'DELETE' });
        set((s) => ({ items: s.items.filter((i) => i.id !== itemId) }));
    },

    addCategory: async (name, station) => {
        const cat = await api<MenuCategory>(Endpoints.MENU_CATEGORIES, {
            method: 'POST',
            body: { name, station },
        });
        set((s) => ({ categories: [...s.categories, cat] }));
        return cat;
    },

    updateCategory: async (catId, updates) => {
        await api(Endpoints.MENU_CATEGORY_BY_ID(catId), {
            method: 'PATCH',
            body: updates,
        });
        set((s) => ({
            categories: s.categories.map((c) =>
                c.id === catId ? { ...c, ...updates } : c,
            ),
        }));
    },

    deleteCategory: async (catId) => {
        await api(Endpoints.MENU_CATEGORY_BY_ID(catId), { method: 'DELETE' });
        set((s) => ({ categories: s.categories.filter((c) => c.id !== catId) }));
    },
}));
