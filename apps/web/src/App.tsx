import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import SetupRestaurant from './pages/SetupRestaurant';
import DashboardLayout from './layouts/DashboardLayout';
import BranchManagement from './pages/BranchManagement';
import MenuManagement from './pages/Menu';
import Tables from './pages/Tables';
import OrderDetails from './pages/OrderDetails';
import KDS from './pages/KDS';
import BillingScreen from './pages/BillingScreen';
import EODReport from './pages/EODReport';
import Inventory from './pages/Inventory';
import StaffManagement from './pages/StaffManagement';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ReportsPage from './pages/ReportsPage';
import DeliveryOrdersLive from './pages/DeliveryOrdersLive';
import IntegrationsSettings from './pages/IntegrationsSettings';
import Customers from './pages/Customers';
import Campaigns from './pages/Campaigns';
import CustomerAnalytics from './pages/Analytics';
import FloatingChatWidget from './components/AI/FloatingChatWidget';
import AccountantDashboard from './pages/accounting/AccountantDashboard';
import GSTFiling from './pages/accounting/GSTFiling';
import ProfitLoss from './pages/accounting/ProfitLoss';
import ExpenseTds from './pages/accounting/ExpenseTds';
import InvoiceRegister from './pages/accounting/InvoiceRegister';

const DashboardHome = () => <AnalyticsDashboard />;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<SetupRestaurant />} />

          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="branches" element={<BranchManagement />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="tables" element={<Tables />} />
            <Route path="order/:tableId" element={<OrderDetails />} />
            <Route path="bill/:orderId" element={<BillingScreen />} />
            <Route path="kds" element={<KDS />} />
            <Route path="eod" element={<EODReport />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="customer-analytics" element={<CustomerAnalytics />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="delivery-orders" element={<DeliveryOrdersLive />} />
            <Route path="integrations" element={<IntegrationsSettings />} />
            <Route path="ca" element={<AccountantDashboard />} />
            <Route path="ca/gst" element={<GSTFiling />} />
            <Route path="ca/pnl" element={<ProfitLoss />} />
            <Route path="ca/expenses" element={<ExpenseTds />} />
            <Route path="ca/invoices" element={<InvoiceRegister />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <FloatingChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
