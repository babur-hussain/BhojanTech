import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import PageLoader from '../components/PageLoader';
import { Calendar, Clock, Users, Phone, Plus, Search, CheckCircle, XCircle, ChevronRight, User, Table as TableIcon, Eye, X, Printer } from 'lucide-react';
import { inrFormat } from '../utils/format';
import { printKOT, printReceipt, printFinalBill, ReceiptData, KOTData, toWordsEN } from '../utils/thermalPrint';

// ─── Bill Preview Modal ───────────────────────────────────────────────────────
function BillPreviewModal({ booking, restaurantInfo, onClose, onPrint }: {
  booking: Booking;
  restaurantInfo: { name: string; address: string; gstin: string; fssai: string; upiId: string; printerName: string };
  onClose: () => void;
  onPrint: () => void;
}) {
  const b = booking;
  const subtotal = b.totalAmount || 0;
  const discountFlat = b.discountType === 'AMOUNT' ? (b.discountValue || 0) : Math.round(subtotal * (b.discountValue || 0) / 100);
  const grandTotal = Math.max(0, subtotal - discountFlat);
  const depositPaid = b.depositAmount || 0;
  const balanceDue = Math.max(0, grandTotal - depositPaid);
  const bookingDate = new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-emerald-600" />
            <h2 className="font-bold text-gray-800">Bill Preview</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onPrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors">
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="overflow-y-auto p-6 font-mono text-sm" style={{ background: '#fffdf8' }}>
          {/* Restaurant Header */}
          <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
            <p className="text-lg font-black text-gray-900 uppercase tracking-wide">{restaurantInfo.name || 'Restaurant'}</p>
            {restaurantInfo.address && <p className="text-xs text-gray-500 mt-0.5">{restaurantInfo.address}</p>}
            {restaurantInfo.gstin && <p className="text-xs text-gray-500">GSTIN: {restaurantInfo.gstin}</p>}
            {restaurantInfo.fssai && <p className="text-xs text-gray-500">FSSAI: {restaurantInfo.fssai}</p>}
            <p className="mt-2 text-base font-black text-gray-800 tracking-widest">** FINAL BILL **</p>
          </div>

          {/* Bill Meta */}
          <div className="border-b border-dashed border-gray-200 pb-3 mb-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Bill No</span><span className="font-bold">BK-{b._id.slice(-8).toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-bold">{new Date().toLocaleDateString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-bold">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span></div>
          </div>

          {/* Customer */}
          <div className="border-b border-dashed border-gray-200 pb-3 mb-3 text-xs space-y-1">
            <p className="font-black text-gray-700 uppercase text-[10px] tracking-widest mb-1">Customer</p>
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-bold">{b.customerName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Mobile</span><span className="font-bold text-red-600">{b.customerPhone}</span></div>
          </div>

          {/* Order Details */}
          <div className="border-b border-dashed border-gray-200 pb-3 mb-3 text-xs space-y-1">
            <p className="font-black text-gray-700 uppercase text-[10px] tracking-widest mb-1">Order Details</p>
            <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-bold">{b.category}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">For Date</span><span className="font-bold">{bookingDate}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Time Slot</span><span className="font-bold">{b.time}</span></div>
          </div>

          {/* Items */}
          <div className="border-b border-dashed border-gray-200 pb-3 mb-3">
            <p className="font-black text-gray-700 uppercase text-[10px] tracking-widest mb-2">Items</p>
            <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1 uppercase">
              <span>Item</span><span>Qty × Rate = Amt</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-gray-800 flex-1">{b.productName || b.category}{b.weight ? ` (${b.weight})` : ''}</span>
              <span className="text-gray-600 ml-4 whitespace-nowrap">{b.quantity || 1} × {inrFormat(subtotal)} = {inrFormat(subtotal)}</span>
            </div>
          </div>

          {/* Financials */}
          <div className="border-b-2 border-dashed border-gray-300 pb-3 mb-3 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-gray-500">Sub-Total</span><span>{inrFormat(subtotal)}</span></div>
            {discountFlat > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>- {inrFormat(discountFlat)}</span></div>}
            <div className="flex justify-between text-base font-black text-gray-900 border-t border-gray-200 pt-1.5">
              <span>TOTAL</span><span>{inrFormat(grandTotal)}</span>
            </div>
          </div>

          {/* Deposit / Balance */}
          {depositPaid > 0 && (
            <div className="border-b border-dashed border-gray-200 pb-3 mb-3 text-xs space-y-1.5">
              <div className="flex justify-between text-green-700"><span>Advance Paid</span><span className="font-bold">{inrFormat(depositPaid)}</span></div>
              <div className="flex justify-between text-red-600 font-black text-sm">
                <span>BALANCE DUE</span><span>{inrFormat(balanceDue)}</span>
              </div>
            </div>
          )}

          {/* Special Note */}
          {b.specialRequests && (
            <div className="border-b border-dashed border-gray-200 pb-3 mb-3 text-xs">
              <p className="font-black text-gray-700 uppercase text-[10px] tracking-widest mb-1">Special Note</p>
              <p className="text-gray-600 italic">{b.specialRequests}</p>
            </div>
          )}

          {/* UPI */}
          {restaurantInfo.upiId && (
            <div className="text-center text-xs text-gray-500 pb-2">
              <p className="font-bold text-gray-700">Pay via UPI</p>
              <p className="font-bold text-sm" style={{ color: '#800000' }}>{restaurantInfo.upiId}</p>
              {depositPaid > 0 && balanceDue > 0 && <p className="text-xs">Amount: {inrFormat(balanceDue)}</p>}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-3 border-t border-dashed border-gray-200">
            <p className="font-black text-gray-600">THANK YOU! 🙏</p>
            <p>Dhanyavaad, Phir Padharen!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Booking {
  _id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  guests?: number;
  productName?: string;
  quantity?: number;
  weight?: string;
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'READY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  category: string;
  specialRequests?: string;
  tableId?: { _id: string; number: string; capacity: number };
  totalAmount?: number;
  discountType?: 'AMOUNT' | 'PERCENTAGE';
  discountValue?: number;
  depositAmount?: number;
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<string[]>(['Table Reservation']);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearchFocus, setCustomerSearchFocus] = useState<'name' | 'phone' | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<{ name: string; address: string; gstin: string; fssai: string; upiId: string; printerName: string }>({ name: '', address: '', gstin: '', fssai: '', upiId: '', printerName: '' });
  const [billPreview, setBillPreview] = useState<Booking | null>(null);
  
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [menuFilter, setMenuFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('all');
  const [menuSort, setMenuSort] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  
  const isDiningCategory = (cat: string) => /table|dine|reservation|seat/i.test(cat);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    guests: 2,
    productName: '',
    quantity: 1,
    weight: '1kg',
    category: 'Cake Pre-order',
    specialRequests: '',
    totalAmount: 0,
    discountType: 'AMOUNT' as 'AMOUNT' | 'PERCENTAGE',
    discountValue: 0,
    depositAmount: 0
  });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bookings?date=${filterDate}`);
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const [itemsRes, catsRes, custRes] = await Promise.all([
        api.get('/menu/items'),
        api.get('/menu/categories'),
        api.get('/customers?limit=1000') // Fetching a good amount for client-side search
      ]);
      setMenuItems(itemsRes.data);
      setMenuCategories(catsRes.data);
      setCustomers(custRes.data.customers || []);
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/restaurant/info');
      const cats = data.bookingCategories?.length ? data.bookingCategories : ['Cake Pre-order', 'Table Reservation'];
      setCategories(cats);
      setFormData(f => ({ ...f, category: data.defaultBookingCategory || cats[0] }));
      setRestaurantInfo({
        name: data.name || 'Restaurant',
        address: data.address || '',
        gstin: data.gstin || '',
        fssai: data.fssaiNumber || '',
        upiId: data.upiId || '',
        printerName: data.printerName || ''
      });
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchTables();
  }, [filterDate]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/bookings', formData);
      setShowModal(false);
      setFormData({ ...formData, customerName: '', customerPhone: '', specialRequests: '', depositAmount: 0 });
      fetchBookings();
    } catch (err) {
      console.error('Failed to create booking', err);
      alert('Failed to create booking');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      fetchBookings();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handlePrintKOT = async (booking: Booking) => {
    try {
      const kotData: KOTData = {
        kotNumber: booking._id.slice(-6).toUpperCase(),
        tableNumber: booking.tableId?.number || 'Pre-order',
        customerName: booking.customerName,
        isOnlineOrder: !booking.tableId,
        items: [{
          name: booking.productName || booking.category,
          quantity: booking.quantity || 1,
          variantName: booking.weight,
          notes: booking.specialRequests
        }],
        time: new Date().toLocaleTimeString()
      };
      await printKOT(kotData, '');
      alert('KOT sent to printer!');
    } catch (err) {
      console.error('Failed to print KOT', err);
      alert('Failed to print KOT');
    }
  };

  const handlePrintReceipt = async (booking: Booking) => {
    try {
      // ── Compute financials ──────────────────────────────────────────────────
      const subtotal = booking.totalAmount || 0;
      const discountFlat = booking.discountType === 'AMOUNT'
        ? (booking.discountValue || 0)
        : Math.round(subtotal * (booking.discountValue || 0) / 100);
      const grandTotal = Math.max(0, subtotal - discountFlat);
      const depositPaid = booking.depositAmount || 0;
      const balanceDue = Math.max(0, grandTotal - depositPaid);

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Booking date for the slip
      const bookingDateStr = new Date(booking.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

      // Label the "for" field as delivery/booking date + time
      const forLabel = `${isDiningCategory(booking.category)
        ? (booking.tableId ? `Table ${booking.tableId.number}` : 'Dine-in')
        : booking.category} — ${bookingDateStr} ${booking.time}`;

      // ── Amount in words ────────────────────────────────────────────────────
      const { toWordsEN } = await import('../utils/thermalPrint');
      const amountInWords = toWordsEN(grandTotal);

      // ── Build ReceiptData ──────────────────────────────────────────────────
      const receiptData: ReceiptData = {
        restaurantName: restaurantInfo.name || 'Restaurant',
        address: restaurantInfo.address,
        gstin: restaurantInfo.gstin,
        fssai: restaurantInfo.fssai,
        upiId: restaurantInfo.upiId || undefined,
        invoiceNumber: 'BK-' + booking._id.slice(-8).toUpperCase(),
        tableNumber: forLabel,
        waiterName: 'Counter',
        paymentMode: depositPaid > 0 ? 'Advance+Balance' : 'Pay on Delivery',
        date: dateStr,
        time: timeStr,
        items: [{
          name: booking.productName || booking.category,
          variantName: booking.weight || undefined,
          quantity: booking.quantity || 1,
          unitPrice: subtotal,
          lineTotal: subtotal,
          gstSlab: 0
        }],
        subtotal,
        discountFlat,
        roundOff: 0,
        grandTotal,
        gstBreakup: [],
        totalGST: 0,
        amountInWords,
        // Booking-specific extras
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        depositPaid: depositPaid > 0 ? depositPaid : undefined,
        balanceDue: depositPaid > 0 ? balanceDue : undefined,
        bookingNote: booking.specialRequests || undefined
      };

      await printReceipt({ receiptData, printerName: restaurantInfo.printerName || undefined });
    } catch (err: any) {
      console.error('Failed to print receipt', err);
      const msg = err?.message || '';
      if (msg.includes('QZ Tray is not running') || msg.includes('not connected')) {
        alert('⚠️ QZ Tray is not running.\n\nPlease start QZ Tray on this computer and try again.');
      } else {
        alert('Print failed: ' + msg);
      }
    }
  };

  /** Build receipt data from a booking — shared by both print functions */
  const buildReceiptDataFromBooking = async (booking: Booking): Promise<ReceiptData> => {
    const subtotal = booking.totalAmount || 0;
    const discountFlat = booking.discountType === 'AMOUNT'
      ? (booking.discountValue || 0)
      : Math.round(subtotal * (booking.discountValue || 0) / 100);
    const grandTotal = Math.max(0, subtotal - discountFlat);
    const depositPaid = booking.depositAmount || 0;
    const balanceDue = Math.max(0, grandTotal - depositPaid);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const bookingDateStr = new Date(booking.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const forLabel = `${isDiningCategory(booking.category)
      ? (booking.tableId ? `Table ${booking.tableId.number}` : 'Dine-in')
      : booking.category} — ${bookingDateStr} ${booking.time}`;
    const { toWordsEN } = await import('../utils/thermalPrint');
    return {
      restaurantName: restaurantInfo.name || 'Restaurant',
      address: restaurantInfo.address,
      gstin: restaurantInfo.gstin,
      fssai: restaurantInfo.fssai,
      upiId: restaurantInfo.upiId || undefined,
      invoiceNumber: 'BK-' + booking._id.slice(-8).toUpperCase(),
      tableNumber: forLabel,
      waiterName: 'Counter',
      paymentMode: depositPaid > 0 ? 'Advance+Balance' : 'Full Payment',
      date: dateStr,
      time: timeStr,
      items: [{ name: booking.productName || booking.category, variantName: booking.weight || undefined, quantity: booking.quantity || 1, unitPrice: subtotal, lineTotal: subtotal, gstSlab: 0 }],
      subtotal, discountFlat, roundOff: 0, grandTotal, gstBreakup: [], totalGST: 0,
      amountInWords: toWordsEN(grandTotal),
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      depositPaid: depositPaid > 0 ? depositPaid : undefined,
      balanceDue: depositPaid > 0 ? balanceDue : undefined,
      bookingNote: booking.specialRequests || undefined
    };
  };

  const handlePrintFinalBill = async (booking: Booking) => {
    try {
      const receiptData = await buildReceiptDataFromBooking(booking);
      await printFinalBill(receiptData, restaurantInfo.printerName || undefined);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('QZ Tray is not running') || msg.includes('not connected')) {
        alert('⚠️ QZ Tray is not running.\n\nPlease start QZ Tray and try again.');
      } else {
        alert('Print failed: ' + msg);
      }
    }
  };

  const handleViewBill = (booking: Booking) => setBillPreview(booking);

  const assignTable = async (id: string, tableId: string) => {
    try {
      await api.patch(`/bookings/${id}/assign-table`, { tableId });
      fetchBookings();
    } catch (err) {
      console.error('Failed to assign table', err);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    SEATED: 'bg-green-100 text-green-800',
    READY: 'bg-lime-100 text-lime-800',
    DELIVERED: 'bg-emerald-100 text-emerald-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-gray-100 text-gray-800'
  };

  const filteredBookings = bookings.filter(b => filterStatus === 'all' || b.status === filterStatus);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage table bookings and guest assignments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-maroon text-white rounded-xl font-medium hover:bg-opacity-90 transition-all shadow-md"
        >
          <Plus size={18} /> New Booking
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-full md:w-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-sm font-medium text-gray-700 cursor-pointer"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {['all', 'PENDING', 'CONFIRMED', 'SEATED', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'bg-saffron text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'All Bookings' : status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Calendar className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No reservations found</h3>
            <p className="text-gray-500 mt-1">Try selecting a different date or clear filters.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking._id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase">
                    {new Date(booking.date).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-xl font-black text-gray-800">
                    {new Date(booking.date).getDate()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{booking.customerName}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                      {booking.category}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[booking.status]}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400" /> {booking.time}</span>
                    {booking.productName && <span className="flex items-center gap-1.5"><Users size={14} className="text-gray-400" /> {booking.quantity}x {booking.productName} ({booking.weight})</span>}
                    {booking.guests && !booking.productName && <span className="flex items-center gap-1.5"><Users size={14} className="text-gray-400" /> {booking.guests} Guests</span>}
                    <span className="flex items-center gap-1.5"><Phone size={14} className="text-gray-400" /> {booking.customerPhone}</span>
                    {booking.depositAmount && booking.depositAmount > 0 && (
                      <span className="flex items-center gap-1.5 text-green-600 font-medium">
                        Deposit: {inrFormat(booking.depositAmount)}
                      </span>
                    )}
                  </div>
                  {booking.specialRequests && (
                    <p className="text-sm text-amber-600 mt-2 bg-amber-50 px-3 py-1.5 rounded-lg inline-block font-medium">
                      Note: {booking.specialRequests}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {booking.status === 'PENDING' && (
                  <button onClick={() => updateStatus(booking._id, 'CONFIRMED')} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-bold transition-colors">
                    Confirm
                  </button>
                )}
                
                {/* Dining Flow */}
                {isDiningCategory(booking.category) && (
                  <>
                    {booking.status === 'CONFIRMED' && (
                      <div className="flex gap-2">
                        {/* <button onClick={() => handlePrintKOT(booking)} className="px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold transition-colors">Print KOT</button> */}
                        <button onClick={() => handlePrintReceipt(booking)} className="px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold transition-colors">Print Receipt</button>
                        <div className="relative group/assign">
                          <select
                            onChange={(e) => assignTable(booking._id, e.target.value)}
                            className="appearance-none px-4 py-2 pr-8 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-xl text-sm font-bold transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-green-500"
                            value={booking.tableId?._id || ''}
                          >
                            <option value="" disabled>Assign Table to Seat</option>
                            {tables.filter(t => t.status === 'AVAILABLE' || t.status === 'RESERVED').map(t => (
                              <option key={t._id} value={t._id}>Table {t.number} ({t.capacity} seats)</option>
                            ))}
                          </select>
                          <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700 pointer-events-none rotate-90" />
                        </div>
                      </div>
                    )}
                    {booking.status === 'SEATED' && booking.tableId && (
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold flex items-center gap-2">
                          <TableIcon size={14} /> Table {booking.tableId.number}
                        </div>
                        <button onClick={() => handleViewBill(booking)} className="px-3 py-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"><Eye size={14} /> View Bill</button>
                        <button onClick={() => { updateStatus(booking._id, 'COMPLETED'); handlePrintFinalBill(booking); }} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5"><Printer size={14} /> Complete & Print</button>
                      </div>
                    )}
                  </>
                )}

                {/* Non-Dining (Cake/Product) Flow */}
                {!isDiningCategory(booking.category) && (
                  <>
                    {booking.status === 'CONFIRMED' && (
                      <div className="flex gap-2">
                        {/* <button onClick={() => handlePrintKOT(booking)} className="px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold transition-colors">Print KOT</button> */}
                        <button onClick={() => handlePrintReceipt(booking)} className="px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold transition-colors">Print Receipt</button>
                        <button onClick={() => updateStatus(booking._id, 'READY')} className="px-4 py-2 bg-lime-50 text-lime-700 hover:bg-lime-100 border border-lime-200 rounded-xl text-sm font-bold transition-colors">Mark Ready</button>
                      </div>
                    )}
                    {booking.status === 'READY' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleViewBill(booking)} className="px-3 py-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"><Eye size={14} /> View Bill</button>
                        <button onClick={() => handlePrintFinalBill(booking)} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5"><Printer size={14} /> Print Final Bill</button>
                        <button onClick={() => updateStatus(booking._id, 'DELIVERED')} className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold transition-colors">Mark Delivered</button>
                      </div>
                    )}
                  </>
                )}

                {/* Print Final Bill for completed/delivered */}
                {['COMPLETED', 'DELIVERED'].includes(booking.status) && (
                  <div className="flex gap-2">
                    <button onClick={() => handleViewBill(booking)} className="px-3 py-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"><Eye size={14} /> View Bill</button>
                    <button onClick={() => handlePrintFinalBill(booking)} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5"><Printer size={14} /> Print Final Bill</button>
                  </div>
                )}

                {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                  <button onClick={() => updateStatus(booking._id, 'CANCELLED')} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Cancel Booking">
                    <XCircle size={20} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {billPreview && (
        <BillPreviewModal
          booking={billPreview}
          restaurantInfo={restaurantInfo}
          onClose={() => setBillPreview(null)}
          onPrint={() => { handlePrintFinalBill(billPreview); setBillPreview(null); }}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">New Reservation</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="booking-form" onSubmit={handleCreateBooking} className="space-y-4">
                <div className="relative grid grid-cols-2 gap-4 z-40">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="text-gray-400" size={16} />
                      </div>
                      <input
                        type="text" required
                        autoComplete="off"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm"
                        value={formData.customerName}
                        onFocus={() => setCustomerSearchFocus('name')}
                        onBlur={() => setTimeout(() => setCustomerSearchFocus(null), 200)}
                        onChange={e => {
                          setFormData({...formData, customerName: e.target.value});
                          if (!customerSearchFocus) setCustomerSearchFocus('name');
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="text-gray-400" size={16} />
                      </div>
                      <input
                        type="tel" required
                        autoComplete="off"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm"
                        value={formData.customerPhone}
                        onFocus={() => setCustomerSearchFocus('phone')}
                        onBlur={() => setTimeout(() => setCustomerSearchFocus(null), 200)}
                        onChange={e => {
                          setFormData({...formData, customerPhone: e.target.value});
                          if (!customerSearchFocus) setCustomerSearchFocus('phone');
                        }}
                      />
                    </div>
                  </div>

                  {customerSearchFocus && (formData.customerName || formData.customerPhone) && (
                    <div className="absolute top-[105%] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[400px] overflow-y-auto hidden-scrollbar z-50">
                      {customers
                        .filter(c => {
                          if (customerSearchFocus === 'name') return c.name?.toLowerCase().includes(formData.customerName.toLowerCase());
                          if (customerSearchFocus === 'phone') return c.phone?.includes(formData.customerPhone);
                          return false;
                        })
                        .slice(0, 50)
                        .map(c => (
                          <button
                            key={c._id}
                            type="button"
                            className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-orange-50 transition-colors last:border-0"
                            onClick={() => {
                              setFormData({...formData, customerName: c.name, customerPhone: c.phone});
                              setCustomerSearchFocus(null);
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-gray-900 text-sm">{c.name}</span>
                              <span className="font-bold text-lg text-red-600 px-2 py-0.5">{c.phone}</span>
                            </div>
                            <div className="mt-1 flex gap-3 text-xs text-gray-500">
                              <span>Visits: <strong className="text-gray-700">{c.totalVisits || 0}</strong></span>
                              <span>Spend: <strong className="text-gray-700">{inrFormat(c.totalSpend || 0)}</strong></span>
                              {c.segment && <span className="text-saffron font-semibold">{c.segment}</span>}
                            </div>
                          </button>
                        ))}
                      {customers.filter(c => customerSearchFocus === 'name' ? c.name?.toLowerCase().includes(formData.customerName.toLowerCase()) : c.phone?.includes(formData.customerPhone)).length === 0 && (
                        <div className="px-4 py-4 text-center text-sm text-gray-500 italic">
                          New customer — will be saved automatically.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Booking Category *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm bg-white"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>




                {isDiningCategory(formData.category) ? (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Guests *</label>
                      <input
                        type="number" min="1" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm"
                        value={formData.guests}
                        onChange={e => setFormData({...formData, guests: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
                      <input
                        type="text" required readOnly
                        placeholder="Click to select or type..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm cursor-pointer bg-gray-50"
                        value={formData.productName}
                        onClick={() => {
                          setMenuSearchTerm(formData.productName || '');
                          setShowMenuPopup(true);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity *</label>
                      <input
                        type="number" min="1" required
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm"
                        value={formData.quantity}
                        onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Weight / Size</label>
                      <input
                        type="text"
                        placeholder="e.g. 1kg, Large"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm"
                        value={formData.weight}
                        onChange={e => setFormData({...formData, weight: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 border-t border-b border-gray-100 py-4 mb-4 bg-gray-50/50 -mx-6 px-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Actual Amount (₹)</label>
                    <input
                      type="number" min="0" required
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm font-bold text-gray-800"
                      value={formData.totalAmount || ''}
                      onChange={e => setFormData({...formData, totalAmount: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                      <span>Discount</span>
                      <select 
                        className="text-[10px] bg-transparent text-saffron outline-none font-bold cursor-pointer"
                        value={formData.discountType}
                        onChange={e => setFormData({...formData, discountType: e.target.value as 'AMOUNT' | 'PERCENTAGE'})}
                      >
                        <option value="AMOUNT">₹ Amount</option>
                        <option value="PERCENTAGE">% Percent</option>
                      </select>
                    </label>
                    <input
                      type="number" min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm font-bold text-red-600"
                      value={formData.discountValue || ''}
                      onChange={e => setFormData({...formData, discountValue: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-green-700 mb-1">Advance Deposit (₹)</label>
                    <input
                      type="number" min="0"
                      className="w-full px-3 py-2 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-bold text-green-800 bg-green-50"
                      value={formData.depositAmount || ''}
                      onChange={e => setFormData({...formData, depositAmount: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                    <input
                      type="date" required
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Time *</label>
                    <input
                      type="time" required
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm"
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Special Requests</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-sm resize-none"
                    placeholder="E.g., Special instructions, customizations..."
                    value={formData.specialRequests}
                    onChange={e => setFormData({...formData, specialRequests: e.target.value})}
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                form="booking-form"
                type="submit"
                className="px-5 py-2 text-sm font-bold text-white bg-maroon rounded-xl hover:bg-opacity-90 transition-colors"
              >
                Create Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Menu Selection Popup */}
      {showMenuPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900 bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Select Product</h2>
              <button onClick={() => setShowMenuPopup(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-4 border-b">
              <div className="relative flex items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search menu or type custom name..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-saffron outline-none text-base shadow-sm"
                    value={menuSearchTerm}
                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && menuSearchTerm.trim()) {
                        setFormData({...formData, productName: menuSearchTerm.trim()});
                        setShowMenuPopup(false);
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={!menuSearchTerm.trim()}
                  onClick={() => {
                    setFormData({...formData, productName: menuSearchTerm.trim()});
                    setShowMenuPopup(false);
                  }}
                  className="px-5 py-3 bg-maroon text-white rounded-xl font-bold hover:bg-opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  Use Custom Name
                </button>
              </div>
            </div>

            {menuCategories.length > 0 && (
              <div className="px-4 py-3 bg-white border-b overflow-x-auto whitespace-nowrap hidden-scrollbar">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedMenuCategory('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedMenuCategory === 'all' ? 'bg-maroon text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    All Categories
                  </button>
                  {menuCategories.map(cat => (
                    <button
                      key={cat._id}
                      onClick={() => setSelectedMenuCategory(cat._id)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedMenuCategory === cat._id ? 'bg-maroon text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-2 border-b bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setMenuFilter('all')} 
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${menuFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >All</button>
                <button 
                  onClick={() => setMenuFilter('veg')} 
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${menuFilter === 'veg' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-green-600'}`}
                ><div className="w-2.5 h-2.5 rounded-sm border-2 border-green-600 bg-green-500"></div> Veg</button>
                <button 
                  onClick={() => setMenuFilter('non-veg')} 
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${menuFilter === 'non-veg' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-red-600'}`}
                ><div className="w-2.5 h-2.5 rounded-full border-2 border-red-600 bg-red-500"></div> Non-Veg</button>
              </div>
              <select
                value={menuSort}
                onChange={e => setMenuSort(e.target.value as any)}
                className="text-sm font-semibold text-gray-700 border-none bg-transparent outline-none cursor-pointer focus:ring-0"
              >
                <option value="name">Sort A-Z</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {menuItems
                  .filter(item => {
                    if (menuFilter === 'veg' && !item.isVeg) return false;
                    if (menuFilter === 'non-veg' && item.isVeg) return false;
                    if (selectedMenuCategory !== 'all' && item.categoryId !== selectedMenuCategory) return false;
                    return item.name.toLowerCase().includes(menuSearchTerm.toLowerCase());
                  })
                  .sort((a, b) => {
                    if (menuSort === 'name') return a.name.localeCompare(b.name);
                    const priceA = a.variants?.[0]?.priceINR || 0;
                    const priceB = b.variants?.[0]?.priceINR || 0;
                    return menuSort === 'price-asc' ? priceA - priceB : priceB - priceA;
                  })
                  .map(item => {
                    const img = item.imageUrl || item.thumbnailUrl || (item.imageUrls && item.imageUrls[0]);
                    return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        productName: item.name,
                        totalAmount: item.variants?.[0]?.priceINR || 0,
                        depositAmount: 0,
                        weight: item.variants?.[0]?.name && item.variants[0].name.toLowerCase() !== 'default' ? item.variants[0].name : '1'
                      });
                      setShowMenuPopup(false);
                    }}
                    className="flex flex-col items-center text-center p-4 bg-white rounded-2xl border border-gray-200 hover:border-maroon hover:shadow-lg transition-all group"
                  >
                    {img ? (
                      <img src={img} alt={item.name} className="w-20 h-20 object-cover rounded-xl mb-3 shadow-sm" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-xl mb-3 flex items-center justify-center">
                        <span className="text-gray-300 text-3xl font-black">{item.name.charAt(0)}</span>
                      </div>
                    )}
                    <span className="text-sm font-bold text-gray-800 group-hover:text-maroon line-clamp-2 leading-tight">{item.name}</span>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-sm border ${item.isVeg ? 'border-green-600 bg-green-100' : 'border-red-600 bg-red-100 flex items-center justify-center rounded-full'}`}>
                        <div className={`w-1 h-1 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                      </div>
                      <span className="text-xs font-black text-gray-500">{inrFormat(item.variants?.[0]?.priceINR || 0)}</span>
                    </div>
                  </button>
                )})}
              </div>
              {menuItems.filter(item => item.name.toLowerCase().includes(menuSearchTerm.toLowerCase())).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 font-medium">No menu items found matching "{menuSearchTerm}"</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Use Custom Name" to proceed with this text.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
