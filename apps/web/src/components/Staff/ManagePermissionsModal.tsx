import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { api } from '../../utils/api';
import { Permission, UserRole } from '@restaurant/types';

interface ManagePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  staffName: string;
  staffRole: UserRole;
}

const PERMISSION_GROUPS = [
  {
    title: 'Inventory & Retail',
    permissions: [
      { id: Permission.INVENTORY_VIEW, label: 'View Inventory' },
      { id: Permission.INVENTORY_CREATE, label: 'Add Inventory' },
      { id: Permission.INVENTORY_EDIT, label: 'Edit Inventory' },
      { id: Permission.INVENTORY_DELETE, label: 'Delete Inventory' },
      { id: Permission.RETAIL_VIEW, label: 'View Retail Items' },
      { id: Permission.RETAIL_CREATE, label: 'Add Retail Items' },
      { id: Permission.RETAIL_EDIT, label: 'Edit Retail Items' },
      { id: Permission.RETAIL_DELETE, label: 'Delete Retail Items' },
    ]
  },
  {
    title: 'Billing & POS',
    permissions: [
      { id: Permission.POS_ACCESS, label: 'Access POS Screen' },
      { id: Permission.INVOICE_VIEW, label: 'View Past Invoices' },
      { id: Permission.INVOICE_CREATE, label: 'Generate Invoices' },
      { id: Permission.INVOICE_EDIT, label: 'Edit Invoices' },
      { id: Permission.APPLY_DISCOUNT, label: 'Apply Discounts' },
    ]
  },
  {
    title: 'Menu & Catalog',
    permissions: [
      { id: Permission.MENU_VIEW, label: 'View Menu' },
      { id: Permission.MENU_CREATE, label: 'Add Menu Items' },
      { id: Permission.MENU_EDIT, label: 'Edit Menu Items' },
      { id: Permission.MENU_DELETE, label: 'Delete Menu Items' },
    ]
  },
  {
    title: 'Orders & Tables',
    permissions: [
      { id: Permission.ORDER_VIEW, label: 'View Orders' },
      { id: Permission.ORDER_MANAGE, label: 'Manage Orders (Accept/Cancel)' },
      { id: Permission.TABLE_MANAGE, label: 'Manage Tables' },
      { id: Permission.KITCHEN_DISPLAY_ACCESS, label: 'Access KDS' },
    ]
  },
  {
    title: 'Staff, Reports & Settings',
    permissions: [
      { id: Permission.DASHBOARD_VIEW, label: 'View Dashboard' },
      { id: Permission.STAFF_VIEW, label: 'View Staff Directory' },
      { id: Permission.STAFF_MANAGE, label: 'Manage Staff' },
      { id: Permission.PAYROLL_MANAGE, label: 'Manage Payroll & Advances' },
      { id: Permission.REPORTS_VIEW, label: 'View Analytics & Reports' },
      { id: Permission.EOD_REPORT_VIEW, label: 'View EOD Report' },
      { id: Permission.SETTINGS_MANAGE, label: 'Manage Settings' },
      { id: Permission.BRANCH_MANAGE, label: 'Manage Branches' },
    ]
  }
];

export const ManagePermissionsModal: React.FC<ManagePermissionsModalProps> = ({
  isOpen, onClose, staffId, staffName, staffRole
}) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && staffId) {
      setLoading(true);
      api.get(`/staff/${staffId}/permissions`)
        .then((res: any) => setPermissions(res.data.permissions || []))
        .catch((err: any) => console.error('Failed to load permissions:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, staffId]);

  if (!isOpen) return null;

  const isOwner = staffRole === 'OWNER' || staffRole === 'SUPER_OWNER';

  const togglePermission = (perm: string) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter(p => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  const selectAll = (groupPerms: string[]) => {
    const newPerms = new Set(permissions);
    groupPerms.forEach(p => newPerms.add(p));
    setPermissions(Array.from(newPerms));
  };

  const deselectAll = (groupPerms: string[]) => {
    setPermissions(permissions.filter(p => !groupPerms.includes(p)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/staff/${staffId}/permissions`, { permissions });
      onClose();
    } catch (err) {
      console.error('Failed to save permissions', err);
      alert('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-maroon/10 p-2 rounded-lg text-maroon">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Manage Permissions</h2>
              <p className="text-sm text-gray-500">Configuring access for <span className="font-semibold text-gray-700">{staffName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          {isOwner ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-start gap-3">
              <Shield className="mt-0.5 text-blue-600 shrink-0" size={18} />
              <p className="text-sm">Owners and Super Owners automatically have full access to all features. Granular permissions do not apply to them.</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PERMISSION_GROUPS.map((group, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800">{group.title}</h3>
                    <div className="flex gap-2 text-xs">
                      <button 
                        onClick={() => selectAll(group.permissions.map(p => p.id))}
                        className="text-maroon hover:underline font-medium"
                      >All</button>
                      <span className="text-gray-300">|</span>
                      <button 
                        onClick={() => deselectAll(group.permissions.map(p => p.id))}
                        className="text-gray-500 hover:underline"
                      >None</button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {group.permissions.map(perm => (
                      <label key={perm.id} className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input 
                            type="checkbox"
                            checked={permissions.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="peer appearance-none w-4 h-4 border-2 border-gray-300 rounded-sm checked:bg-maroon checked:border-maroon transition-colors cursor-pointer"
                          />
                          <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                            {perm.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          {!isOwner && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold bg-maroon text-white rounded-xl hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
