import React, { useState, useEffect, useCallback } from 'react';
import PageLoader from '../components/PageLoader';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Users, ChefHat, CheckCircle, AlertCircle, ReceiptText,
  RefreshCw, Search, Filter, Utensils, ArrowRight, Activity
} from 'lucide-react';
import { api } from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import { useBranchStore } from '../store/branchStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function elapsed(date: string | Date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function duration(date: string | Date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function urgencyClass(date: string | Date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins >= 45) return 'border-red-500 shadow-red-100';
  if (mins >= 25) return 'border-amber-400 shadow-amber-50';
  return 'border-emerald-400 shadow-emerald-50';
}

function urgencyBadge(date: string | Date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins >= 45) return { label: `${mins}m`, cls: 'bg-red-500 text-white animate-pulse' };
  if (mins >= 25) return { label: `${mins}m`, cls: 'bg-amber-400 text-black' };
  return { label: `${mins}m`, cls: 'bg-emerald-100 text-emerald-800' };
}

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  OPEN: { label: 'Active', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  BILLED: { label: 'Billed', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  PAID: { label: 'Paid', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
};

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onClick }: { order: any; onClick: () => void }) {

  const badge = urgencyBadge(order.createdAt);
  const status = STATUS_META[order.status] || STATUS_META.OPEN;
  const itemCount = order.items?.length || 0;
  const pendingItems = order.items?.filter((i: any) => !i.sentToKitchen).length || 0;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border-2 shadow-sm p-5 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${urgencyClass(order.createdAt)}`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {order.isOnlineOrder ? (
            <div className={`text-white font-black text-sm px-3 py-2 rounded-xl ${order.deliveryPlatform === 'ZOMATO' ? 'bg-red-500' :
                order.deliveryPlatform === 'SWIGGY' ? 'bg-orange-500' :
                  order.deliveryPlatform === 'ONDC' ? 'bg-blue-600' : 'bg-purple-500'
              }`}>
              {order.deliveryPlatform || 'WEB'}
            </div>
          ) : (
            <div className="bg-gray-900 text-white font-black text-xl px-4 py-2 rounded-xl min-w-[60px] text-center">
              {order.tableNumber || '?'}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900 text-base leading-tight">
              {order.isOnlineOrder ? (order.customerName || 'Online Order') : `Table ${order.tableNumber}`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.waiterName || order.customerName || '—'} · {elapsed(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
            <Clock size={10} className="inline mr-1" />{badge.label}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${status.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Items Summary */}
      <div className="space-y-1.5 mb-4">
        {order.items?.slice(0, 3).map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.sentToKitchen ? 'bg-green-400' : 'bg-amber-400'}`} />
              <span className="text-gray-700 truncate font-medium">{item.quantity}× {item.name}</span>
              {item.variantName && <span className="text-gray-400 text-xs flex-shrink-0">({item.variantName})</span>}
            </div>
            <span className="text-gray-500 text-xs flex-shrink-0 ml-2">₹{(item.priceAtOrderTime * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        {itemCount > 3 && (
          <p className="text-xs text-gray-400 pl-4">+{itemCount - 3} more items…</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Utensils size={11} />
            {itemCount} items
          </span>
          {pendingItems > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              <ChefHat size={11} />
              {pendingItems} pending KOT
            </span>
          )}
        </div>
        <span className="font-black text-gray-900 text-base">
          ₹{order.totalAmountINR?.toLocaleString('en-IN') || '0'}
        </span>
      </div>
    </div>
  );
}

// ─── Order Detail Panel ────────────────────────────────────────────────────────

function OrderDetailPanel({ order, onClose }: { order: any; onClose: () => void }) {
  const navigate = useNavigate();
  const itemsSentToKitchen = order.items?.filter((i: any) => i.sentToKitchen) || [];
  const itemsPending = order.items?.filter((i: any) => !i.sentToKitchen) || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-4 top-20 bottom-24 z-50 w-[400px] max-w-[calc(100vw-2rem)] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              {order.isOnlineOrder ? (
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${order.deliveryPlatform === 'ZOMATO' ? 'bg-red-500' :
                    order.deliveryPlatform === 'SWIGGY' ? 'bg-orange-500' : 'bg-blue-600'
                  }`}>{order.deliveryPlatform || 'ONLINE'}</span>
              ) : (
                <span className="text-3xl font-black text-saffron">T{order.tableNumber}</span>
              )}
              <div>
                <p className="font-bold text-lg leading-tight">
                  {order.isOnlineOrder ? (order.customerName || 'Online Order') : `Table ${order.tableNumber}`}
                </p>
                <p className="text-gray-400 text-xs">{order.waiterName || '—'} · {duration(order.createdAt)} elapsed</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Financials */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Bill Amount</p>
              <p className="text-xl font-black text-gray-900">₹{order.totalAmountINR?.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className={`text-sm font-bold px-2 py-1 rounded-full inline-block ${STATUS_META[order.status]?.cls}`}>
                {STATUS_META[order.status]?.label}
              </p>
            </div>
          </div>

          {/* Items in Kitchen */}
          {itemsSentToKitchen.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ChefHat size={14} className="text-green-600" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sent to Kitchen</p>
              </div>
              <div className="space-y-2">
                {itemsSentToKitchen.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      <span className="font-semibold text-sm text-gray-800">{item.quantity}× {item.name}</span>
                      {item.variantName && <span className="text-xs text-gray-400">({item.variantName})</span>}
                    </div>
                    <span className="text-sm font-bold text-gray-700">₹{(item.priceAtOrderTime * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Items */}
          {itemsPending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-500" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Not yet sent to Kitchen</p>
              </div>
              <div className="space-y-2">
                {itemsPending.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="font-semibold text-sm text-gray-800">{item.quantity}× {item.name}</span>
                      {item.variantName && <span className="text-xs text-gray-400">({item.variantName})</span>}
                      {item.notes && <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-semibold">📝 {item.notes}</span>}
                    </div>
                    <span className="text-sm font-bold text-gray-700">₹{(item.priceAtOrderTime * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Info */}
          {(order.customerName || order.customerPhone) && (
            <div className="bg-blue-50 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Customer</p>
              <p className="font-semibold text-gray-800">{order.customerName}</p>
              {order.customerPhone && <p className="text-sm text-gray-500">{order.customerPhone}</p>}
            </div>
          )}

          {/* Order Meta */}
          <div className="text-xs text-gray-400 space-y-1 border-t pt-3">
            <p>Order ID: <span className="font-mono text-gray-600">{order._id?.slice(-12)}</span></p>
            <p>Placed: <span className="text-gray-600">{new Date(order.createdAt).toLocaleString('en-IN')}</span></p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {order.status === 'OPEN' && (
            <button
              onClick={() => navigate(`/bill/${order._id}`)}
              className="w-full bg-maroon text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors"
            >
              <ReceiptText size={16} /> Generate Bill
            </button>
          )}
          {order.status === 'BILLED' && (
            <button
              onClick={() => navigate(`/bill/${order._id}`)}
              className="w-full bg-saffron text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors"
            >
              <ReceiptText size={16} /> View / Settle Bill
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LiveOrders() {
  const { subscribe } = useSocket();
  const { selectedBranchId } = useBranchStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'BILLED'>('OPEN');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [, tick] = useState(0);

  // Clock tick every 30s to refresh elapsed times
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders/active');
      setOrders(res.data);
      setSelectedOrder((prev: any) => {
        if (!prev) return prev;
        const updated = res.data.find((o: any) => o._id === prev._id);
        return updated || prev;
      });
      setLastRefresh(new Date());
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 30000);
    return () => clearInterval(t);
  }, [fetchOrders, selectedBranchId]);

  // Real-time socket updates
  useEffect(() => {
    const unsub = subscribe('order_update', ({ type, order, orderId }: any) => {
      if (type === 'NEW_ORDER' && order) {
        setOrders(prev => {
          if (prev.some(o => o._id === order._id)) return prev;
          return [order, ...prev];
        });
      } else if (type === 'ORDER_PAID' || type === 'ORDER_COMPLETED' || type === 'ORDER_CANCELLED') {
        const idToRemove = orderId || (order && order._id);
        if (idToRemove) {
          setOrders(prev => prev.filter(o => o._id !== idToRemove));
          setSelectedOrder((prev: any) => prev?._id === idToRemove ? null : prev);
        }
      } else if (order) {
        setOrders(prev => prev.map(o => o._id === order._id ? order : o));
        setSelectedOrder((prev: any) => prev?._id === order._id ? order : prev);
      }
    });
    return unsub;
  }, [subscribe]);

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.tableNumber?.toString().includes(q) ||
        o.waiterName?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q)
      );
    }
    return true;
  });

  const openCount = orders.filter(o => o.status === 'OPEN').length;
  const billedCount = orders.filter(o => o.status === 'BILLED').length;
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmountINR || 0), 0);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Orders</h1>
          <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
            <Activity size={12} className="text-green-500" />
            Live · Refreshed {Math.floor((Date.now() - lastRefresh.getTime()) / 1000)}s ago
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="p-2.5 bg-blue-50 rounded-xl"><Utensils size={20} className="text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Active Tables</p>
            <p className="text-2xl font-black text-gray-900">{openCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="p-2.5 bg-amber-50 rounded-xl"><ReceiptText size={20} className="text-amber-600" /></div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Awaiting Payment</p>
            <p className="text-2xl font-black text-gray-900">{billedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="p-2.5 bg-green-50 rounded-xl"><Activity size={20} className="text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Live Tab Value</p>
            <p className="text-2xl font-black text-gray-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search table, waiter, customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'OPEN', 'BILLED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${statusFilter === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
            >
              {s === 'all' ? 'All' : s === 'OPEN' ? '🟢 Active' : '🟡 Billed'}
            </button>
          ))}
        </div>
      </div>

      {/* Main content — always full width; drawer renders as fixed overlay */}
      <div>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 flex flex-col items-center justify-center text-gray-400">
            <Utensils size={40} className="mb-3 text-gray-200" />
            <p className="font-semibold">No active orders</p>
            <p className="text-sm mt-1">Orders will appear here in real-time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(order => (
              <OrderCard
                key={order._id}
                order={order}
                onClick={() => setSelectedOrder(order._id === selectedOrder?._id ? null : order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel — fixed drawer above chat icon */}
      {selectedOrder && (
        <OrderDetailPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
