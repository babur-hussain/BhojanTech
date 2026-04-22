import { create } from 'zustand';
import { Order } from '../types';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';

interface OrdersState {
    orders: Order[];
    isLoading: boolean;
    fetchOrders: () => Promise<void>;
    addOrder: (order: Order) => void;
    updateOrder: (order: Order) => void;
    removeOrder: (orderId: string) => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
    orders: [],
    isLoading: false,

    fetchOrders: async () => {
        set({ isLoading: true });
        try {
            // There isn't a dedicated GET /api/orders listing endpoint yet,
            // so we use the KOT active or analytics dashboard.
            // For now, store is used as cache populated by socket events.
            set({ isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    addOrder: (order) => {
        set((s) => ({ orders: [order, ...s.orders] }));
    },

    updateOrder: (order) => {
        set((s) => ({
            orders: s.orders.map((o) => (o.id === order.id ? order : o)),
        }));
    },

    removeOrder: (orderId) => {
        set((s) => ({
            orders: s.orders.filter((o) => o.id !== orderId),
        }));
    },
}));
