import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { Menu } from './pages/Menu';
import { Checkout } from './pages/Checkout';
import { Tracking } from './pages/Tracking';
import { Login } from './pages/Login';
import { MyAccount } from './pages/MyAccount';
import { TableOrder } from './pages/TableOrder';
import { ItemDetail } from './pages/ItemDetail';
import { useCartStore } from './store/cartStore';
import { useEffect } from 'react';

// Wrapper to extract parameters from Deep Link / QR scan
const TableResolver = () => {
  const { restaurantId, tableNumber } = useParams();
  const setRestaurantContext = useCartStore((s) => s.setRestaurantContext);

  useEffect(() => {
    if (restaurantId) {
      setRestaurantContext(restaurantId, tableNumber);
    }
  }, [restaurantId, tableNumber, setRestaurantContext]);

  if (!restaurantId) return <div>Invalid Link</div>;

  return <Navigate to="/menu" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 pb-24 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden">
        <Routes>
          {/* Direct link for Takeaway/Delivery: /order/:restaurantId */}
          <Route path="/order/:restaurantId" element={<TableResolver />} />

          {/* QR Scan link for Dine-in: /table/:restaurantId/:tableNumber */}
          <Route path="/table/:restaurantId/:tableNumber" element={<TableResolver />} />

          <Route path="/menu" element={<Menu />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/table-order" element={<TableOrder />} />
          <Route path="/tracking/:orderId" element={<Tracking />} />
          <Route path="/login" element={<Login />} />
          <Route path="/my-account" element={<MyAccount />} />

          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
