import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PermissionGuard } from './components/Auth/PermissionGuard';
import { Permission } from '@restaurant/types';
import Login from './pages/Login';
import SetupRestaurant from './pages/SetupRestaurant';
import DashboardLayout from './layouts/DashboardLayout';
import BranchManagement from './pages/BranchManagement';
import MenuManagement from './pages/Menu';
import Tables from './pages/Tables';
import OrderDetails from './pages/OrderDetails';
import KDS from './pages/KDS';
import LiveOrders from './pages/LiveOrders';
import BillingScreen from './pages/BillingScreen';
import InvoiceScreen from './pages/InvoiceScreen';
import EODReport from './pages/EODReport';
import Inventory from './pages/Inventory';
import StaffManagement from './pages/StaffManagement';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ReportsPage from './pages/ReportsPage';
import DeliveryOrdersLive from './pages/DeliveryOrdersLive';
import IntegrationsSettings from './pages/IntegrationsSettings';
import Customers from './pages/Customers';
import Campaigns from './pages/Campaigns';
import CustomerAnalytics from './pages/CustomerAnalytics';
import LiveAnalytics from './pages/LiveAnalytics';
import FloatingChatWidget from './components/AI/FloatingChatWidget';
import AccountantDashboard from './pages/accounting/AccountantDashboard';
import GSTFiling from './pages/accounting/GSTFiling';
import ProfitLoss from './pages/accounting/ProfitLoss';
import ExpenseTds from './pages/accounting/ExpenseTds';
import InvoiceRegister from './pages/accounting/InvoiceRegister';

import DirectPOS from './pages/DirectPOS';
import RestaurantSettings from './pages/RestaurantSettings';
import AllOrders from './pages/AllOrders';
import RetailItems from './pages/RetailItems';
import Bookings from './pages/Bookings';

const DashboardHome = () => <AnalyticsDashboard />;

const pg = (perms: Permission[], component: React.ReactNode) => (
  <PermissionGuard requiredPermissions={perms}>{component}</PermissionGuard>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<SetupRestaurant />} />

          <Route path="/" element={<DashboardLayout />}>
            <Route index element={pg([Permission.DASHBOARD_VIEW], <DashboardHome />)} />
            <Route path="pos" element={pg([Permission.POS_ACCESS], <DirectPOS />)} />
            <Route path="branches" element={pg([Permission.BRANCH_MANAGE], <BranchManagement />)} />
            <Route path="menu" element={pg([Permission.MENU_VIEW], <MenuManagement />)} />
            <Route path="tables" element={pg([Permission.TABLE_MANAGE], <Tables />)} />
            <Route path="order/:tableId" element={pg([Permission.ORDER_VIEW], <OrderDetails />)} />
            <Route path="bill/:orderId" element={pg([Permission.ORDER_VIEW], <BillingScreen />)} />
            <Route path="invoice/:invoiceId" element={pg([Permission.INVOICE_VIEW], <InvoiceScreen />)} />
            <Route path="kds" element={pg([Permission.KITCHEN_DISPLAY_ACCESS], <KDS />)} />
            <Route path="orders" element={pg([Permission.ORDER_VIEW], <AllOrders />)} />
            <Route path="retail" element={pg([Permission.RETAIL_VIEW], <RetailItems />)} />
            <Route path="bookings" element={pg([Permission.BOOKINGS_VIEW], <Bookings />)} />
            <Route path="live-orders" element={pg([Permission.LIVE_ORDERS_VIEW], <LiveOrders />)} />
            <Route path="eod" element={pg([Permission.EOD_REPORT_VIEW], <EODReport />)} />
            <Route path="inventory" element={pg([Permission.INVENTORY_VIEW], <Inventory />)} />
            <Route path="staff" element={pg([Permission.STAFF_VIEW], <StaffManagement />)} />
            <Route path="analytics" element={pg([Permission.ANALYTICS_VIEW], <LiveAnalytics />)} />
            <Route path="dashboard" element={pg([Permission.DASHBOARD_VIEW], <AnalyticsDashboard />)} />
            <Route path="customers" element={pg([Permission.CUSTOMER_VIEW], <Customers />)} />
            <Route path="campaigns" element={pg([Permission.CAMPAIGN_VIEW], <Campaigns />)} />
            <Route path="customer-analytics" element={pg([Permission.CUSTOMER_ANALYTICS_VIEW], <CustomerAnalytics />)} />
            <Route path="reports" element={pg([Permission.REPORTS_VIEW], <ReportsPage />)} />
            <Route path="delivery-orders" element={pg([Permission.ORDER_VIEW], <DeliveryOrdersLive />)} />
            <Route path="integrations" element={pg([Permission.SETTINGS_MANAGE], <IntegrationsSettings />)} />
            <Route path="settings" element={pg([Permission.SETTINGS_MANAGE], <RestaurantSettings />)} />
            <Route path="ca" element={pg([Permission.REPORTS_VIEW], <AccountantDashboard />)} />
            <Route path="ca/gst" element={pg([Permission.REPORTS_VIEW], <GSTFiling />)} />
            <Route path="ca/pnl" element={pg([Permission.REPORTS_VIEW], <ProfitLoss />)} />
            <Route path="ca/expenses" element={pg([Permission.REPORTS_VIEW], <ExpenseTds />)} />
            <Route path="ca/invoices" element={pg([Permission.INVOICE_VIEW], <InvoiceRegister />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <FloatingChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
