import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Permission, UserRole } from '@restaurant/types';
import { LayoutDashboard, Users, UtensilsCrossed, Package, Settings, LogOut, Receipt, TrendingUp, BarChart2, Building, Megaphone, FileText, PieChart, ShoppingBag, Store, ClipboardList, ShoppingCart, Calendar } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, to: '/', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.DASHBOARD_VIEW] },
    { name: 'Live Analytics', icon: TrendingUp, to: '/analytics', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.ANALYTICS_VIEW] },
    { name: 'Live Orders', icon: ShoppingBag, to: '/live-orders', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.WAITER], permissions: [Permission.LIVE_ORDERS_VIEW] },
    { name: 'Orders', icon: ClipboardList, to: '/orders', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.ORDER_VIEW] },
    { name: 'Bookings', icon: Calendar, to: '/bookings', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.BOOKINGS_VIEW] },
    { name: 'Customers', icon: Users, to: '/customers', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.CUSTOMER_VIEW] },
    { name: 'Outstanding', icon: Receipt, to: '/reports/outstanding', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.CUSTOMER_VIEW] },
    { name: 'Campaigns', icon: Megaphone, to: '/campaigns', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.CAMPAIGN_VIEW] },
    { name: 'Customer Analytics', icon: BarChart2, to: '/customer-analytics', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.CUSTOMER_ANALYTICS_VIEW] },
    { name: 'Reports', icon: Receipt, to: '/reports', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.REPORTS_VIEW] },
    { name: 'Branches', icon: Building, to: '/branches', roles: [UserRole.SUPER_OWNER, UserRole.OWNER], permissions: [Permission.BRANCH_MANAGE] },
    { name: 'Tables', icon: Receipt, to: '/tables', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.WAITER], permissions: [Permission.TABLE_MANAGE] },
    { name: 'Menu', icon: UtensilsCrossed, to: '/menu', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.MENU_VIEW] },
    { name: 'Kitchen Display', icon: UtensilsCrossed, to: '/kds', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.KITCHEN_STAFF], permissions: [Permission.KITCHEN_DISPLAY_ACCESS] },
    { name: 'Retail Items', icon: ShoppingCart, to: '/retail', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER, UserRole.WAITER], permissions: [Permission.RETAIL_VIEW] },
    { name: 'Inventory', icon: Package, to: '/inventory', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.INVENTORY_VIEW] },
    { name: 'Staff', icon: Users, to: '/staff', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.STAFF_VIEW] },
    { name: 'EOD Report', icon: Receipt, to: '/eod', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.EOD_REPORT_VIEW] },
    { name: 'Delivery Orders', icon: Package, to: '/delivery-orders', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.ORDER_VIEW] },
    { name: 'Integrations', icon: Settings, to: '/integrations', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.BRANCH_MANAGER], permissions: [Permission.SETTINGS_MANAGE] },
    { name: 'CA Dashboard', icon: LayoutDashboard, to: '/ca', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
    { name: 'GST Filing', icon: FileText, to: '/ca/gst', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
    { name: 'Profit & Loss', icon: TrendingUp, to: '/ca/pnl', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
    { name: 'Invoice Register', icon: Receipt, to: '/ca/invoices', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
    { name: 'Expenses & TDS', icon: PieChart, to: '/ca/expenses', roles: [UserRole.SUPER_OWNER, UserRole.OWNER, UserRole.ACCOUNTANT] },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    const isOwner = user.role === 'SUPER_OWNER' || user.role === 'OWNER';
    if (isOwner) return true;
    
    // For specific roles like ACCOUNTANT, we just fall back to role checks if no permissions defined
    if (!item.permissions || item.permissions.length === 0) {
      return (item.roles as UserRole[]).includes(user.role);
    }
    
    // Otherwise, check if user has the specific permission
    const userPermissions = user.permissions || [];
    return item.permissions.some(p => userPermissions.includes(p as Permission));
  });

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
        {user && ([UserRole.SUPER_OWNER, UserRole.OWNER] as UserRole[]).includes(user.role) && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex w-full items-center px-2 py-2 mb-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-saffron text-white' : 'text-cream hover:bg-saffron hover:text-white'}`
            }
          >
            <Settings className="mr-3 h-5 w-5" />
            Global Settings
          </NavLink>
        )}
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
