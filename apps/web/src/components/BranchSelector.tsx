import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranchStore } from '../store/branchStore';
import { ChevronDown, Building2 } from 'lucide-react';
import { UserRole } from '@restaurant/types';

export default function BranchSelector() {
    const { user } = useAuth();
    const { selectedBranchId, setSelectedBranchId } = useBranchStore();
    const [branches, setBranches] = useState<{ id: string, name: string, isActive: boolean }[]>([]);

    useEffect(() => {
        // Stub fetch: In real app, make API call to /api/branches
        setBranches([
            { id: 'all', name: 'All Branches (Consolidated)', isActive: true },
            { id: '1', name: 'Main Branch - CP', isActive: true },
            { id: '2', name: 'South Ex Branch', isActive: false },
        ]);

        // Default to 'all' if SUPER_OWNER and no branch is selected
        if (!selectedBranchId && user?.role === UserRole.SUPER_OWNER) {
            setSelectedBranchId('all');
        }
    }, [user, selectedBranchId, setSelectedBranchId]);

    if (!user || (user.role !== UserRole.SUPER_OWNER && user.role !== UserRole.BRANCH_MANAGER)) return null;

    return (
        <div className="relative inline-block text-left group">
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600">
                    <Building2 size={16} />
                </div>
                <select
                    value={selectedBranchId || ''}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="appearance-none bg-transparent font-bold text-gray-800 pr-6 py-1 cursor-pointer outline-none focus:outline-none"
                >
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>
                            {b.name} {b.id !== 'all' ? (b.isActive ? '🟢' : '🔴') : ''}
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
