import { create } from 'zustand';
import axios from 'axios';

interface BranchState {
    selectedBranchId: string | null;
    setSelectedBranchId: (id: string | null) => void;
    /** Hydrate from server response (login/refresh) without triggering a server save */
    initFromServer: (id: string | null) => void;
}

export const useBranchStore = create<BranchState>((set) => ({
    selectedBranchId: null,
    setSelectedBranchId: (id) => {
        set({ selectedBranchId: id });

        // Persist to server so it syncs across devices (fire-and-forget)
        if (id) {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
            const baseURL = import.meta.env.VITE_API_URL || 'https://server.bhojantech.lfvs.in/api';
            axios.put(`${baseURL}/branches/select`, { branchId: id }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }).catch((err) => {
                console.warn('[branchStore] Failed to persist branch selection to server:', err?.message);
            });
        }
    },
    initFromServer: (id) => {
        set({ selectedBranchId: id });
    },
}));
