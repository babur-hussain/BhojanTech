import { create } from 'zustand';
import { Table } from '../types';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';

interface TablesState {
    tables: Table[];
    isLoading: boolean;
    fetchTables: () => Promise<void>;
    updateTableStatus: (tableId: string, status: Table['status'], orderId?: string) => void;
}

export const useTablesStore = create<TablesState>((set) => ({
    tables: [],
    isLoading: false,

    fetchTables: async () => {
        set({ isLoading: true });
        try {
            const data = await api<Table[]>(Endpoints.TABLES);
            // Cache to MMKV for offline: cacheSet('tables', data)
            set({ tables: data, isLoading: false });
        } catch {
            // Try loading from MMKV cache: const cached = cacheGet<Table[]>('tables')
            set({ isLoading: false });
        }
    },

    updateTableStatus: (tableId, status, orderId) => {
        set((s) => ({
            tables: s.tables.map((t) =>
                t.id === tableId ? { ...t, status, currentOrderId: orderId } : t,
            ),
        }));
    },
}));
