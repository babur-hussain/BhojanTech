import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@restaurant/types';
import { LayoutDashboard, Users, UtensilsCrossed, Package, Settings, LogOut, Receipt, TrendingUp, BarChart2, Building, Megaphone, FileText, PieChart, ShoppingBag, Store } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, to: '/', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Live Analytics', icon: TrendingUp, to: '/analytics', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Live Orders', icon: ShoppingBag, to: '/live-orders', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.WAITER] },
    { name: 'Customers', icon: Users, to: '/customers', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Campaigns', icon: Megaphone, to: '/campaigns', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Customer Analytics', icon: BarChart2, to: '/customer-analytics', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Reports', icon: Receipt, to: '/reports', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Branches', icon: Building, to: '/branches', roles: [UserRole.SUPER_OWNER, UserRole.OWNER] },
    { name: 'Tables', icon: Receipt, to: '/tables', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.WAITER] },
    { name: 'Menu', icon: UtensilsCrossed, to: '/menu', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Kitchen Display', icon: UtensilsCrossed, to: '/kds', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.KITCHEN_STAFF] },
    { name: 'Inventory', icon: Package, to: '/inventory', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Staff', icon: Users, to: '/staff', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'EOD Report', icon: Receipt, to: '/eod', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Delivery Orders', icon: Package, to: '/delivery-orders', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Integrations', icon: Settings, to: '/integrations', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER] },
    { name: 'Restaurant Settings', icon: Store, to: '/settings', roles: [UserRole.SUPER_OWNER, UserRole.OWNER] },
    { name: 'CA Dashboard', icon: LayoutDashboard, to: '/ca', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
    { name: 'GST Filing', icon: FileText, to: '/ca/gst', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
    { name: 'Profit & Loss', icon: TrendingUp, to: '/ca/pnl', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
    { name: 'Invoice Register', icon: Receipt, to: '/ca/invoices', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
    { name: 'Expenses & TDS', icon: PieChart, to: '/ca/expenses', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
  ];

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex flex-col w-64 bg-maroon h-full">
      <div className="flex items-center justify-center h-16 bg-opacity-10 bg-black">
        <span className="text-white font-bold text-lg tracking-wider">RESTAURANT OS</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 py-4 space-y-1">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive ? 'bg-saffron text-white' : 'text-cream hover:bg-opacity-80 hover:bg-saffron hover:text-white'
                }`
              }
            >
              <item.icon className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-4 bg-opacity-10 bg-black">
        <div className="flex items-center mb-4">
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="text-xs font-medium text-gray-300">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center px-2 py-2 text-sm font-medium text-cream rounded-md hover:bg-saffron hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
