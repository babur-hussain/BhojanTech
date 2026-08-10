import { create } from 'zustand';
import { Order } from '../types';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';

interface OrdersState {
    orders: Order[];
    isLoading: boolean;
    fetchOrders: () => Promise<void>;
    fetchActiveOrders: () => Promise<void>;
    fetchMyOrders: (waiterId: string) => Promise<void>;
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
            const data = await api<Order[]>(Endpoints.ORDERS);
            set({ orders: data, isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    fetchActiveOrders: async () => {
        set({ isLoading: true });
        try {
            const data = await api<Order[]>(Endpoints.ORDERS_ACTIVE);
            set({ orders: data, isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    fetchMyOrders: async (waiterId: string) => {
        set({ isLoading: true });
        try {
            const data = await api<Order[]>(Endpoints.ORDERS_BY_WAITER(waiterId));
            set({ orders: data, isLoading: false });
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
