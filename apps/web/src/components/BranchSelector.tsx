import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranchStore } from '../store/branchStore';
import { ChevronDown, Building2 } from 'lucide-react';
import { UserRole } from '@restaurant/types';
import { api } from '../utils/api';

interface BranchOption {
    _id: string;
    name: string;
    isActive: boolean;
    invoicePrefix: string;
}

export default function BranchSelector() {
    const { user } = useAuth();
    const { selectedBranchId, setSelectedBranchId } = useBranchStore();
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        if (!user?.restaurantId) return;

        const fetchBranches = async () => {
            try {
                const res = await api.get('/branches');
                const data: BranchOption[] = res.data;
                setBranches(data);

                // Auto-select logic — only runs when no branch has been set
                // (i.e., truly first-time user with no server-side preference).
                // If the server already hydrated a selectedBranchId (via login/refresh),
                // we skip this so the user's prior choice is preserved across devices.
                if (!selectedBranchId) {
                    if (user.branchId) {
                        // Staff/waiters are scoped to a single branch
                        setSelectedBranchId(user.branchId);
                    } else if (data.length === 1) {
                        // Only one branch — auto-select it
                        setSelectedBranchId(data[0]._id);
                    } else {
                        // Owner with multiple branches — default to consolidated
                        setSelectedBranchId('all');
                    }
                }
            } catch (err) {
                console.error('Failed to load branches', err);
            }
        };

        fetchBranches();
    }, [user]);

    // Only show for users who can switch branches
    const canSwitch = user && (
        user.role === UserRole.SUPER_OWNER ||
        user.role === UserRole.OWNER ||
        user.role === UserRole.BRANCH_MANAGER
    );

    if (!canSwitch || branches.length === 0) return null;

    return (
        <div className="relative inline-block text-left">
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600">
                    <Building2 size={16} />
                </div>
                <select
                    value={selectedBranchId || ''}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="appearance-none bg-transparent font-bold text-gray-800 pr-6 py-1 cursor-pointer outline-none focus:outline-none text-sm"
                >
                    {branches.length > 1 && (
                        <option value="all">All Branches (Consolidated)</option>
                    )}
                    {branches.map(b => (
                        <option key={b._id} value={b._id}>
                            {b.name} {b.isActive ? '🟢' : '🔴'}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-500">
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>
    );
}
