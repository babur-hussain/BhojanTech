import { create } from 'zustand';
import { Table } from '../types';
import { api } from '../services/api';
import { Endpoints } from '../constants/api';
import { cacheSet, cacheGet } from '../services/offline';

interface TablesState {
    tables: Table[];
    isLoading: boolean;
    fetchTables: () => Promise<void>;
    updateTableStatus: (tableId: string, status: Table['status'], orderId?: string) => void;
    addTable: (number: string, capacity: number) => Promise<Table>;
    editTable: (tableId: string, updates: { number?: string; capacity?: number }) => Promise<void>;
    deleteTable: (tableId: string) => Promise<void>;
    mergeTable: (sourceTableId: string, targetTableId: string) => Promise<void>;
    transferOrder: (orderId: string, fromTableId: string, toTableId: string) => Promise<void>;
    reserveTable: (tableId: string) => Promise<void>;
    clearTable: (tableId: string) => Promise<void>;
}

export const useTablesStore = create<TablesState>((set, get) => ({
    tables: [],
    isLoading: false,

    fetchTables: async () => {
        set({ isLoading: true });
        try {
            const data = await api<Table[]>(Endpoints.TABLES);
            cacheSet('tables', data);
            set({ tables: data, isLoading: false });
        } catch {
            // Load from MMKV cache if offline
            const cached = cacheGet<Table[]>('tables');
            if (cached) {
                set({ tables: cached, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        }
    },

    updateTableStatus: (tableId, status, orderId) => {
        set((s) => ({
            tables: s.tables.map((t) =>
                t.id === tableId ? { ...t, status, currentOrderId: orderId } : t,
            ),
        }));
    },

    addTable: async (number, capacity) => {
        const table = await api<Table>(Endpoints.TABLES, {
            method: 'POST',
            body: { number, capacity },
        });
        set((s) => ({ tables: [...s.tables, table] }));
        return table;
    },

    editTable: async (tableId, updates) => {
        await api(Endpoints.TABLE_BY_ID(tableId), {
            method: 'PATCH',
            body: updates,
        });
        set((s) => ({
            tables: s.tables.map((t) =>
                t.id === tableId ? { ...t, ...updates } : t,
            ),
        }));
    },

    deleteTable: async (tableId) => {
        await api(Endpoints.TABLE_BY_ID(tableId), { method: 'DELETE' });
        set((s) => ({ tables: s.tables.filter((t) => t.id !== tableId) }));
    },

    mergeTable: async (sourceTableId, targetTableId) => {
        await api(Endpoints.TABLE_MERGE, {
            method: 'POST',
            body: { sourceTableId, targetTableId },
        });
        await get().fetchTables();
    },

    transferOrder: async (orderId, fromTableId, toTableId) => {
        await api(Endpoints.TABLE_TRANSFER, {
            method: 'POST',
            body: { orderId, fromTableId, toTableId },
        });
        await get().fetchTables();
    },

    reserveTable: async (tableId) => {
        await api(Endpoints.TABLE_RESERVE(tableId), { method: 'POST' });
        set((s) => ({
            tables: s.tables.map((t) =>
                t.id === tableId ? { ...t, status: 'RESERVED' as const } : t,
            ),
        }));
    },

    clearTable: async (tableId) => {
        await api(Endpoints.TABLE_CLEAR(tableId), { method: 'POST' });
        set((s) => ({
            tables: s.tables.map((t) =>
                t.id === tableId ? { ...t, status: 'AVAILABLE' as const, currentOrderId: undefined } : t,
            ),
        }));
    },
}));
