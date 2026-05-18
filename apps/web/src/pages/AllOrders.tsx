import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, ChevronLeft, ChevronRight, RefreshCw, Loader2,
  UtensilsCrossed, Globe, ShoppingBag, CheckCircle2, Clock, Receipt, XCircle, ChevronDown, ChevronUp, ExternalLink, Printer
} from 'lucide-react';
import { api } from '../utils/api';
import { printReceipt, toWordsEN, type ReceiptData } from '../utils/thermalPrint';
import InvoicePrint from '../components/Billing/InvoicePrint';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@restaurant/types';
import { useBranchStore } from '../store/branchStore';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  OPEN:   { label: 'Open',   color: 'bg-green-100 text-green-700 border-green-200',   icon: <Clock size={11} /> },
  BILLED: { label: 'Billed', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Receipt size={11} /> },
  PAID:   { label: 'Paid',   color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: <CheckCircle2 size={11} /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600 border-red-200',   icon: <XCircle size={11} /> },
};

const PAGE_LIMIT = 20;

export default function AllOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printPreview, setPrintPreview] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [branchId, setBranchId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

  const isOwner = user?.role === UserRole.SUPER_OWNER || user?.role === UserRole.OWNER;
  const { selectedBranchId } = useBranchStore();
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchOrders = useCallback(async (p = page) => {
    try {
      setLoading(true);
      const params: any = { page: p, limit: PAGE_LIMIT, status, type };
      if (search) params.search = search;
      if (isOwner && branchId !== 'all') params.branchId = branchId;
      if (!isOwner) {} // branch auto-scoped server-side
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await api.get('/orders/all', { params });
      setOrders(res.data.orders);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, type, branchId, dateFrom, dateTo]);

  // Load branches for owner
  useEffect(() => {
    if (isOwner) {
      api.get('/branches').then(r => setBranches(r.data)).catch(() => {});
    }
    api.get('/restaurant/info').then(r => setRestaurant(r.data)).catch(() => {});
  }, [isOwner]);

  // Debounced re-fetch on filter changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchOrders(1);
    }, 350);
  }, [search, status, type, branchId, dateFrom, dateTo, selectedBranchId]);

  useEffect(() => {
    fetchOrders(page);
  }, [page]);

  // Print Bill handler - fetches live preview and sends to QZ Tray
  const handlePrint = async (orderId: string) => {
    try {
      setPrintingId(orderId);
      const res = await api.get(`/billing/preview/${orderId}`);
      const preview = res.data;
      setPrintPreview(preview);

      // Wait a tick for InvoicePrint to render into receiptRef
      await new Promise(r => setTimeout(r, 80));

      const now = new Date();
      const printerName = restaurant?.printerName || localStorage.getItem('qz_receipt_printer') || '';
      const receiptData: ReceiptData = {
        restaurantName: restaurant?.name || '',
        address: restaurant?.address || '',
        gstin: restaurant?.gstin || '',
        fssai: restaurant?.fssaiNumber || '',
        upiId: restaurant?.upiId || '',
        invoiceNumber: `PROFORMA-${orderId.slice(-6).toUpperCase()}`,
        tableNumber: preview.order.tableNumber || 'Takeaway',
        waiterName: preview.order.waiterName || 'Staff',
        paymentMode: preview.order.paymentMode || 'CASH',
        date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        items: (preview.lineItems || []).map((li: any) => ({
          name: li.name,
          variantName: li.variantName,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          lineTotal: li.lineTotal,
          gstSlab: li.gstSlab,
        })),
        subtotal: preview.subtotalINR ?? 0,
        discountFlat: 0,
        roundOff: preview.roundOff ?? 0,
        grandTotal: preview.grandTotalINR ?? 0,
        gstBreakup: preview.gstBreakup ?? [],
        totalGST: (preview.gstBreakup ?? []).reduce((s: number, g: any) => s + (g.cgst ?? 0) + (g.sgst ?? 0), 0),
        amountInWords: toWordsEN(preview.grandTotalINR ?? 0),
      };

      await printReceipt({
        receiptData,
        receiptContainerRef: receiptRef.current,
        printerName,
      });
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to print bill');
    } finally {
      setPrintingId(null);
      setPrintPreview(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const typeIcon = (order: any) => {
    if (order.isOnlineOrder) return <Globe size={13} className="text-blue-500" />;
    if (order.tableNumber === 'TAKEAWAY') return <ShoppingBag size={13} className="text-orange-500" />;
    return <UtensilsCrossed size={13} className="text-maroon" />;
  };

  const typeLabel = (order: any) => {
    if (order.isOnlineOrder) return 'Online';
    if (order.tableNumber === 'TAKEAWAY') return 'Takeaway';
    return `Table ${order.tableNumber}`;
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const totalRevenue = orders.filter(o => o.status === 'PAID').reduce((s, o) => s + (o.totalAmountINR || 0), 0);
  const openCount = orders.filter(o => o.status === 'OPEN').length;
  const billedCount = orders.filter(o => o.status === 'BILLED').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">All Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total orders across all branches</p>
        </div>
        <button
          onClick={() => fetchOrders(page)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Showing Orders', value: orders.length, sub: `of ${total} total`, color: 'text-gray-800' },
          { label: 'Open / Billed', value: `${openCount} / ${billedCount}`, sub: 'on this page', color: 'text-orange-600' },
          { label: 'Page Revenue (Paid)', value: `₹${totalRevenue.toLocaleString()}`, sub: 'paid orders on this page', color: 'text-green-700' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{kpi.label}</p>
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Table, waiter, customer..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-maroon focus:border-transparent">
            <option value="all">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="BILLED">Billed</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Order Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-maroon focus:border-transparent">
            <option value="all">All Types</option>
            <option value="dine-in">Dine-In</option>
            <option value="takeaway">Takeaway</option>
            <option value="online">Online</option>
          </select>
        </div>

        {/* Branch (owners only) */}
        {isOwner && branches.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Branch</label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-maroon focus:border-transparent">
              <option value="all">All Branches</option>
              {branches.map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Date Range */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-maroon focus:border-transparent" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-maroon focus:border-transparent" />
        </div>

        {/* Clear */}
        {(search || status !== 'all' || type !== 'all' || branchId !== 'all' || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setStatus('all'); setType('all'); setBranchId('all'); setDateFrom(''); setDateTo(''); }}
            className="px-4 py-2.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-medium transition">
            Clear
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-maroon opacity-60" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Filter size={40} className="mb-3 opacity-30" />
            <p className="font-semibold">No orders found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left w-8"></th>
                <th className="px-4 py-3 text-left">Order / Table</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Waiter</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Date & Time</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.OPEN;
                const isExpanded = expandedId === order._id;
                return (
                  <React.Fragment key={order._id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setExpandedId(isExpanded ? null : order._id)}
                          className="text-gray-400 hover:text-maroon transition">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                            {typeIcon(order)}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-900">{typeLabel(order)}</p>
                            <p className="text-xs text-gray-400 font-mono">{order._id.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {order.customerName ? (
                          <div>
                            <p className="font-medium text-gray-800">{order.customerName}</p>
                            {order.customerPhone && <p className="text-xs text-gray-400">{order.customerPhone}</p>}
                          </div>
                        ) : <span className="text-gray-300 text-xs italic">Walk-in</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{order.waiterName || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-gray-700">{order.items?.length || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-gray-900">
                        ₹{(order.totalAmountINR || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrint(order._id)}
                            disabled={printingId === order._id}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition disabled:opacity-50"
                          >
                            {printingId === order._id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Printer size={12} />}
                            Print
                          </button>
                          {(order.status === 'OPEN' || order.status === 'BILLED') && (
                            <button onClick={() => navigate(`/bill/${order._id}`)}
                              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-maroon text-white rounded-lg hover:bg-opacity-90 font-semibold transition">
                              <ExternalLink size={12} /> Bill
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Items Row */}
                    {isExpanded && (
                      <tr className="bg-amber-50/40">
                        <td colSpan={9} className="px-8 py-4">
                          <div className="grid grid-cols-2 gap-3">
                            {(order.items || []).map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-maroon bg-opacity-10 text-maroon text-xs font-black flex items-center justify-center">{item.quantity}</span>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                                    {item.variantName && item.variantName !== 'Regular' && (
                                      <p className="text-xs text-gray-400">{item.variantName}</p>
                                    )}
                                  </div>
                                </div>
                                <p className="font-bold text-gray-700 text-sm">₹{item.priceAtOrderTime * item.quantity}</p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
          <p className="text-sm text-gray-500">
            Showing <span className="font-bold text-gray-800">{(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, total)}</span> of <span className="font-bold text-gray-800">{total}</span> orders
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${pg === page ? 'bg-maroon text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                    {pg}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Hidden receipt DOM node for popup print fallback */}
      <div className="hidden">
        <div ref={receiptRef}>
          {printPreview && (
            <InvoicePrint
              preview={printPreview}
              finalTotal={printPreview.grandTotalINR ?? 0}
              discountFlat={0}
              roundOff={printPreview.roundOff ?? 0}
              paymentMode={printPreview.order?.paymentMode || 'CASH'}
              invoiceNumber={`PROFORMA-${(printPreview.order?._id || '').slice(-6).toUpperCase()}`}
              restaurant={{
                name: restaurant?.name || '',
                address: restaurant?.address || '',
                gstin: restaurant?.gstin || '',
                fssai: restaurant?.fssaiNumber || '',
                upiId: restaurant?.upiId || '',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
