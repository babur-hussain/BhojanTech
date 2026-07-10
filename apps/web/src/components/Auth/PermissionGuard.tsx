import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock } from 'lucide-react';
import { Permission, UserRole } from '@restaurant/types';

interface PermissionGuardProps {
  requiredPermissions: Permission[];
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ requiredPermissions, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon"></div>
      </div>
    );
  }

  // If no user, AuthProvider or routes usually handle redirecting to /login, but just in case
  if (!user) return null;

  // SUPER_OWNER and OWNER have universal access
  if (user.role === 'SUPER_OWNER' || user.role === 'OWNER') {
    return <>{children}</>;
  }

  // Check if user has ALL required permissions
  // Alternatively, we could check if they have ANY, but ALL is safer for combined requirements
  const userPermissions = user.permissions || [];
  
  const hasAccess = requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-100 max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-maroon"></div>
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-50 mb-6">
            <Lock className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Locked</h2>
          <p className="text-gray-600 mb-6">
            You do not have permission to view this page. Please contact your restaurant manager or owner to request access.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center px-6 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
