import { create } from 'zustand';

interface BranchState {
    selectedBranchId: string | null;
    setSelectedBranchId: (id: string | null) => void;
}

export const useBranchStore = create<BranchState>((set) => ({
    selectedBranchId: localStorage.getItem('selectedBranchId'),
    setSelectedBranchId: (id) => {
        if (id) localStorage.setItem('selectedBranchId', id);
        else localStorage.removeItem('selectedBranchId');
        set({ selectedBranchId: id });
    }
}));
