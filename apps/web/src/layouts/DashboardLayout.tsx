import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import BranchSelector from '../components/BranchSelector';
import { UserRole } from '@restaurant/types';

export default function DashboardLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If user is OWNER/SUPER_OWNER but hasn't set up a restaurant
  const needsSetup = (user.role === UserRole.SUPER_OWNER || user.role === UserRole.OWNER) && !user.restaurantId;
  if (needsSetup) {
    return <Navigate to="/setup" />;
  }

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-8 z-10">
          <div className="text-xl font-black tracking-tight text-gray-900">
            <span className="text-saffron">Resto</span>OS
          </div>
          <BranchSelector />
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-cream p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
