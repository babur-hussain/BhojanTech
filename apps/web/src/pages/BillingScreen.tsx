import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  GSTSlabBreakup, InvoiceLineItem, PaymentMode, PaymentSplit,
} from '@restaurant/types';
import {
  ArrowLeft, Printer, MessageSquare, CheckCircle,
  CreditCard, Smartphone, Banknote, Split,
  Tag, AlertTriangle, UserPlus, Search, Gift, Loader2, ShoppingCart, Plus, Minus, X, Camera, ScanLine
} from 'lucide-react';
import InvoicePrint from '../components/Billing/InvoicePrint';
import { api } from '../utils/api';
import PageLoader from '../components/PageLoader';
import { printReceipt, toWordsEN, type ReceiptData } from '../utils/thermalPrint';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import CameraScanner from '../components/CameraScanner';

interface BillPreview {
  order: any;
  lineItems: InvoiceLineItem[];
  subtotalINR: number;
  gstBreakup: GSTSlabBreakup[];
  totalGSTINR: number;
  grandTotalINR: number;
  roundOff: number;
}

// --- Helpers ---
const formatDateToDisplay = (dateString?: string | Date) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  // Use UTC to prevent timezone shifts changing the date
  return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth()+1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
};

export default function BillingScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const receiptRef = React.useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState<BillPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMode, setMode] = useState<PaymentMode>('CASH');
  const [cashReceived, setCash] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [discountType, setDcType] = useState<'FLAT' | 'PERCENT'>('PERCENT');
  const [discountVal, setDcVal] = useState('');
  const [approver, setApprover] = useState('');
  const [showDiscount, setShowDc] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);
  const [generatingBill, setGeneratingBill] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);

  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDob, setCustomerDob] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [customerLoading, setCustLoading] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [pointValue, setPointValue] = useState(0);
  const [tierDiscountPct, setTierDiscountPct] = useState(0);

  // Live search suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const [suggSelectedIndex, setSuggSelectedIndex] = useState(0);
  const [activeInput, setActiveInput] = useState<'phone' | 'name' | null>(null);
  const suggRef = React.useRef<HTMLDivElement>(null);
  const justSelectedRef = React.useRef(false);

  // Additional Items (Menu + Retail) added during checkout
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [additionalCart, setAdditionalCart] = useState<{ catalogId: string; name: string; priceINR: number; gstSlab: number; unit?: string; quantity: number; isMenu?: boolean; isRetail?: boolean; menuItemId?: string; retailItemId?: string; variantName?: string }[]>([]);
  const [showAdditional, setShowAdditional] = useState(false);
  const [additionalSearch, setAdditionalSearch] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  // Custom Items
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemGst, setCustomItemGst] = useState('0');

  // Fetch bill preview from backend
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        setLoading(true);
        const [prevRes, restRes] = await Promise.all([
          api.get(`/billing/preview/${orderId}`),
          api.get('/restaurant/print-info'),
        ]);
        setPreview(prevRes.data);
        setRestaurant(restRes.data);

        // Load full catalog (menu + retail)
        try {
          const [menuRes, retailRes] = await Promise.all([
            api.get('/menu/items'),
            api.get('/retail-items')
          ]);
          
          const combined: any[] = [];
          menuRes.data.filter((i: any) => i.isAvailable).forEach((item: any) => {
            item.variants.forEach((v: any, vIdx: number) => {
              combined.push({
                catalogId: `menu-${item._id}-${vIdx}`,
                isMenu: true,
                menuItemId: item._id,
                name: v.name !== 'Regular' ? `${item.name} (${v.name})` : item.name,
                variantName: v.name !== 'Regular' ? v.name : undefined,
                priceINR: v.specialPriceINR || v.priceINR,
                gstSlab: item.gstSlab ?? 0,
                barcode: item.barcode // just in case some menu items have barcodes
              });
            });
          });
          retailRes.data.filter((i: any) => i.isActive).forEach((r: any) => {
            combined.push({
              ...r,
              catalogId: `retail-${r._id}`,
              isRetail: true,
              retailItemId: r._id,
              name: r.name,
              priceINR: r.priceINR,
              gstSlab: r.gstSlab ?? 0,
            });
          });
          setCatalogItems(combined);
        } catch {}
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load bill');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  // Customer CRM lookup (exact phone → full CRM details)
  const handleCustomerSearch = async (phone: string) => {
    if (phone.length < 10) { setCustomer(null); return; }
    try {
      setCustLoading(true);
      const res = await api.get(`/billing/customer/${phone}`);
      if (res.data.found) {
        setCustomer(res.data.customer);
        setCustomerName(res.data.customer.name);
        if (res.data.customer.dob) {
          setCustomerDob(formatDateToDisplay(res.data.customer.dob));
        }
        setPointValue(res.data.pointsPerRupeeRedemption || 1);
        setTierDiscountPct(res.data.tierDiscountPercent || 0);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setCustLoading(false);
    }
  };

  // Live suggestions search (partial phone or name)
  const searchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setSuggestions([]); setShowSugg(false); setSuggSelectedIndex(0); return; }
    try {
      setSuggLoading(true);
      const res = await api.get(`/customers?q=${encodeURIComponent(query)}&limit=6`);
      setSuggestions(res.data?.customers || res.data || []);
      setSuggSelectedIndex(0);
      setShowSugg(true);
    } catch {
      setSuggestions([]);
      setSuggSelectedIndex(0);
    } finally {
      setSuggLoading(false);
    }
  }, []);

  // Debounced suggestions for phone
  useEffect(() => {
    if (customer || justSelectedRef.current) return;
    const t = setTimeout(() => searchSuggestions(customerPhone), 300);
    return () => clearTimeout(t);
  }, [customerPhone, customer, searchSuggestions]);

  // Debounced suggestions for name
  useEffect(() => {
    if (customer || justSelectedRef.current) return;
    const t = setTimeout(() => searchSuggestions(customerName), 300);
    return () => clearTimeout(t);
  }, [customerName, customer, searchSuggestions]);

  // Full CRM lookup when phone hits 10 digits
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCustomerSearch(customerPhone);
    }, 400);
    return () => clearTimeout(timer);
  }, [customerPhone]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggRef.current && !suggRef.current.contains(e.target as Node)) {
        setShowSugg(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Global keyboard shortcut: Backspace/Delete to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
      
      if (!isTyping && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Select a suggestion → autofill both fields + trigger CRM lookup
  const selectSuggestion = (s: any) => {
    justSelectedRef.current = true;
    setCustomerPhone(s.phone || '');
    setCustomerName(s.name || '');
    if (s.dob) {
      setCustomerDob(formatDateToDisplay(s.dob));
    } else {
      setCustomerDob('');
    }
    setShowSugg(false);
    setSuggestions([]);
    // Trigger full CRM lookup
    handleCustomerSearch(s.phone);
    // Allow debounced search again after 500ms (longer than debounce timeout)
    setTimeout(() => { justSelectedRef.current = false; }, 500);
  };

  // ── Additional cart helpers ── MUST be before any early returns (Rules of Hooks) ──
  const addAdditionalItem = useCallback((item: any) => {
    setAdditionalCart(cart => {
      const ex = cart.find(c => c.catalogId === item.catalogId);
      if (ex) return cart.map(c => c.catalogId === item.catalogId ? { ...c, quantity: c.quantity + 1 } : c);
      return [...cart, { 
        catalogId: item.catalogId, 
        name: item.name, 
        priceINR: item.priceINR, 
        gstSlab: item.gstSlab, 
        unit: item.unit, 
        quantity: 1,
        isMenu: item.isMenu,
        isRetail: item.isRetail,
        menuItemId: item.menuItemId,
        retailItemId: item.retailItemId,
        variantName: item.variantName
      }];
    });
  }, []);

  const handleBarcodeScan = useCallback((barcode: string) => {
    const item = catalogItems.find(i => i.barcode === barcode);
    if (item) {
      addAdditionalItem(item);
      setScanFeedback({ text: `Scanned: ${item.name}`, ok: true });
      setShowAdditional(true);
    } else {
      setScanFeedback({ text: `Barcode ${barcode} not found`, ok: false });
    }
    setTimeout(() => setScanFeedback(null), 3000);
  }, [catalogItems, addAdditionalItem]);

  // ── Hardware barcode scanner (MUST be before early returns) ──
  useBarcodeScanner(handleBarcodeScan);

  const handleAddCustomItem = () => {
    if (!customItemName.trim() || !customItemPrice || isNaN(+customItemPrice)) return;
    const item = {
      catalogId: `custom-${Date.now()}`,
      name: customItemName.trim(),
      priceINR: +customItemPrice,
      gstSlab: +customItemGst,
      quantity: 1,
      isMenu: true,
      menuItemId: undefined,
    };
    setAdditionalCart(cart => [...cart, item]);
    setCustomItemName('');
    setCustomItemPrice('');
    setShowCustomItemForm(false);
  };

  // ── Merge additional items into a combined preview for InvoicePrint and Proforma Bill
  const combinedLineItems = useMemo(() => {
    if (!preview) return [];
    
    // Original items
    const baseItems = preview.lineItems.map((li: any) => ({
      name: li.name,
      variantName: li.variantName,
      hindiName: li.hindiName,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      gstSlab: li.gstSlab as 0 | 5 | 12 | 18,
      lineTotal: li.lineTotal,
      hsnCode: li.hsnCode,
    }));
    
    // Added items
    const addedItems = additionalCart.map(c => ({
      name: c.name,
      variantName: c.variantName,
      quantity: c.quantity,
      unitPrice: c.priceINR,
      gstSlab: c.gstSlab as 0 | 5 | 12 | 18,
      lineTotal: +(c.priceINR * c.quantity).toFixed(2),
      hsnCode: '',
    }));
    
    return [...baseItems, ...addedItems];
  }, [preview, additionalCart]);

  const additionalSubtotal = additionalCart.reduce((s, c) => s + c.priceINR * c.quantity, 0);
  const combinedSubtotal = (preview?.subtotalINR || 0) + additionalSubtotal;
  
  // Discount computation — now includes additional subtotal
  const pointsDiscount = customer && redeemPoints ? Math.min(Number(redeemPoints) / (pointValue || 1), preview ? (preview.subtotalINR + additionalSubtotal) : 0) : 0;
  const discountFlat = (() => {
    if (!preview) return 0;
    let dc = 0;
    if (discountVal) {
      dc = discountType === 'FLAT' ? Math.min(+discountVal, combinedSubtotal) : +(combinedSubtotal * Math.min(+discountVal, 100) / 100).toFixed(2);
    }
    return dc + pointsDiscount;
  })();

  const combinedGstBreakup = useMemo(() => {
    if (!preview) return [];
    const slabMap = new Map<number, { taxable: number; cgst: number; sgst: number }>();
    
    const discountRatio = combinedSubtotal > 0 ? discountFlat / combinedSubtotal : 0;
    
    for (const item of combinedLineItems) {
      const effectiveLine = item.lineTotal * (1 - discountRatio);
      const rate = (item.gstSlab ?? 0) / 100;
      const taxable = +(effectiveLine / (1 + rate)).toFixed(2);
      const half = +(taxable * rate / 2).toFixed(2);
      
      const existing = slabMap.get(item.gstSlab) ?? { taxable: 0, cgst: 0, sgst: 0 };
      slabMap.set(item.gstSlab, {
        taxable: +(existing.taxable + taxable).toFixed(2),
        cgst: +(existing.cgst + half).toFixed(2),
        sgst: +(existing.sgst + half).toFixed(2),
      });
    }
    
    return Array.from(slabMap.entries()).map(([slab, v]) => ({
      slab: slab as 0 | 5 | 12 | 18,
      taxableAmount: v.taxable,
      cgst: v.cgst,
      sgst: v.sgst,
      total: +(v.taxable + v.cgst + v.sgst).toFixed(2),
    }));
  }, [combinedLineItems, combinedSubtotal, discountFlat, preview]);

  const combinedTotalGST = combinedGstBreakup.reduce((s, g) => s + g.cgst + g.sgst, 0);

  const needsApproval = preview ? (discountType === 'PERCENT' ? +discountVal > 10 : (discountFlat - pointsDiscount) / combinedSubtotal > 0.10) : false;
  const afterDiscount = preview ? +(preview.grandTotalINR + additionalSubtotal - discountFlat).toFixed(2) : 0;
  const finalTotal = Math.max(0, Math.round(afterDiscount));
  const roundOff = +(finalTotal - afterDiscount).toFixed(2);

  if (loading) {
    return <PageLoader message="Loading bill…" />;
  }
  if (error || !preview) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="text-red-600 font-semibold">{error || 'Order not found'}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 underline">Go Back</button>
      </div>
    );
  }

  // Split helpers
  const addSplit = () => setSplits(s => [...s, { mode: 'CASH', amountINR: 0 }]);
  const updateSplit = (i: number, field: keyof PaymentSplit, val: any) =>
    setSplits(s => s.map((sp, idx) => idx === i ? { ...sp, [field]: val } : sp));
  const removeSplit = (i: number) => setSplits(s => s.filter((_, idx) => idx !== i));
  const splitsTotal = splits.reduce((s, sp) => s + (+sp.amountINR || 0), 0);

  // Generate Proforma Bill
  const handleGenerateBill = async () => {
    if (!customerPhone || customerPhone.length !== 10) {
      alert('Please provide a valid 10-digit mobile number before generating the bill.');
      return;
    }
    if (!customerName || customerName.trim() === '') {
      alert('Please provide the customer name before generating the bill.');
      return;
    }
    
    try {
      setGeneratingBill(true);
      
      const generatePayload: any = {};
      if (customerPhone) {
        generatePayload.customerPhone = customerPhone;
        generatePayload.customerName = customerName;
        if (customerDob) {
          const parts = customerDob.split('/');
          if (parts.length === 3 && parts[2].length === 4) {
            generatePayload.customerDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        } else if (customerDob === '') {
          generatePayload.customerDob = null;
        }
      }
      
      await api.post(`/billing/generate/${orderId}`, generatePayload);
      
      const now = new Date();
      const printerName = restaurant?.printerName || localStorage.getItem('qz_receipt_printer') || '';
      const receiptData: ReceiptData = {
        restaurantName: restaurant?.name || '',
        address: restaurant?.address || '',
        contactNumber: restaurant?.contactNumber || '',
        gstin: restaurant?.gstin || '',
        fssai: restaurant?.fssaiNumber || '',
        upiId: restaurant?.upiId || '',
        invoiceNumber: 'PROFORMA',
        tableNumber: preview?.order.tableNumber || 'Takeaway',
        waiterName: preview?.order.waiterName || 'Staff',
        paymentMode: paymentMode,
        date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        items: combinedLineItems.map((li: any) => ({
          name: li.name,
          variantName: li.variantName,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          lineTotal: li.lineTotal,
          gstSlab: li.gstSlab,
        })),
        subtotal: combinedSubtotal,
        discountFlat: discountFlat,
        roundOff: roundOff,
        grandTotal: finalTotal,
        gstBreakup: combinedGstBreakup,
        totalGST: combinedTotalGST,
        amountInWords: toWordsEN(finalTotal),
      };
      
      if (preview && preview.order) {
        setPreview({ ...preview, order: { ...preview.order, status: 'BILLED' } });
      }

      await printReceipt({
        receiptData,
        receiptContainerRef: receiptRef.current,
        printerName,
      });

      alert('Bill generated and table locked!');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to generate bill');
    } finally {
      setGeneratingBill(false);
    }
  };

  // Pay — live API call
  const handlePay = async () => {
    if (!customerPhone || customerPhone.length !== 10) {
      alert('Please provide a valid 10-digit mobile number before collecting payment.');
      return;
    }
    if (!customerName || customerName.trim() === '') {
      alert('Please provide the customer name before collecting payment.');
      return;
    }
    
    try {
      setPaying(true);
      const body: any = {
        orderId,
        paymentMode,
        amountPaidINR: finalTotal,
        payments: paymentMode === 'SPLIT' ? splits : [{ mode: paymentMode, amountINR: finalTotal }],
        retailItems: additionalCart.filter(c => c.isRetail).map(c => ({ _id: c.retailItemId, quantity: c.quantity })),
        additionalMenuItems: additionalCart.filter(c => c.isMenu).map(c => ({
          menuItemId: c.menuItemId,
          name: c.name,
          variantName: c.variantName,
          quantity: c.quantity,
          priceAtOrderTime: c.priceINR,
          gstSlab: c.gstSlab
        })),
      };
      if (discountFlat > pointsDiscount && discountVal) {
        body.discount = { type: discountType, value: +discountVal, approvedBy: approver || undefined };
      }
      if (customerPhone) {
        body.customerPhone = customerPhone;
        body.customerName = customerName;
        if (customerDob) {
          const parts = customerDob.split('/');
          if (parts.length === 3 && parts[2].length === 4) {
            body.customerDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        } else if (customerDob === '') {
          body.customerDob = null;
        }
      }
      if (redeemPoints && +redeemPoints > 0) body.redeemPoints = +redeemPoints;
      if (whatsapp) body.whatsappNumber = whatsapp;

      const res = await api.post('/billing/pay', body);
      const invoiceId = res.data?.invoice?._id;
      if (!invoiceId) throw new Error('No invoice ID in response');
      navigate(`/invoice/${invoiceId}`, { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-maroon text-white px-6 py-4 flex items-center gap-4 shadow">
        <button onClick={() => navigate(-1)} className="hover:bg-white hover:bg-opacity-20 p-1 rounded"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-bold flex-1">Bill — Table {preview.order.tableNumber}</h1>
        <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded">{preview.order.waiterName}</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-64px)] lg:overflow-hidden">
        {/* Left: Order & GST */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Customer Section - Beautiful Live Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-maroon bg-opacity-10 flex items-center justify-center">
                <UserPlus size={16} className="text-maroon" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Customer Details</h3>
                <p className="text-xs text-gray-400">Auto-fill via CRM or enter manually</p>
              </div>
            </div>

            <div className="p-5 relative" ref={suggRef}>
              {/* Phone + Name + DOB Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* Phone Input with live dropdown */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">+91</span>
                    <input
                      type="tel" maxLength={10}
                      placeholder="10-digit number"
                      value={customerPhone}
                      onFocus={() => setActiveInput('phone')}
                      onKeyDown={(e) => {
                        if (!showSugg || suggestions.length === 0) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSuggSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSuggSelectedIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          selectSuggestion(suggestions[suggSelectedIndex]);
                        }
                      }}
                      onChange={e => { setCustomerPhone(e.target.value.replace(/\D/g, '')); setCustomer(null); }}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all"
                    />
                    {(customerLoading || (suggLoading && activeInput === 'phone')) && (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-maroon" />
                    )}
                    {!customerLoading && customerPhone.length === 10 && (
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${customer ? 'bg-green-500' : 'bg-gray-300'}`} />
                    )}
                  </div>
                </div>

                {/* Name Input with live dropdown */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Customer Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter name..."
                      value={customerName}
                      onFocus={() => setActiveInput('name')}
                      onKeyDown={(e) => {
                        if (!showSugg || suggestions.length === 0) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSuggSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSuggSelectedIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          selectSuggestion(suggestions[suggSelectedIndex]);
                        }
                      }}
                      onChange={e => setCustomerName(e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all ${
                        customer
                          ? 'border-green-200 focus:ring-2 focus:ring-maroon focus:border-transparent text-gray-700 font-semibold'
                          : 'border-gray-200 focus:ring-2 focus:ring-maroon focus:border-transparent'
                      }`}
                    />
                    {suggLoading && activeInput === 'name' && !customer && (
                      <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-maroon" />
                    )}
                  </div>
                </div>

                {/* Date of Birth Input */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Date of Birth</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="DD/MM/YYYY"
                      value={customerDob}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '');
                        let formatted = '';
                        if (digits.length > 0) {
                          formatted += digits.substring(0, 2);
                        }
                        if (digits.length > 2) {
                          formatted += '/' + digits.substring(2, 4);
                        }
                        if (digits.length > 4) {
                          formatted += '/' + digits.substring(4, 8);
                        }
                        setCustomerDob(formatted);
                      }}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all ${
                        customer
                          ? 'border-green-200 focus:ring-2 focus:ring-maroon focus:border-transparent text-gray-700 font-semibold'
                          : 'border-gray-200 focus:ring-2 focus:ring-maroon focus:border-transparent text-gray-700'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Live suggestions dropdown */}
              {showSugg && suggestions.length > 0 && !customer && (
                <div className="absolute z-50 left-5 right-5 mt-1 bg-white border-2 border-maroon border-opacity-30 rounded-xl overflow-hidden" style={{top: '80px', boxShadow: '0 8px 30px rgba(0,0,0,0.18)'}}>
                  <div className="px-3 py-2 bg-maroon bg-opacity-5 border-b border-maroon border-opacity-10 flex items-center gap-1.5">
                    <Search size={12} className="text-maroon" />
                    <span className="text-[11px] font-bold text-maroon uppercase tracking-wide">Matching Customers</span>
                  </div>
                  {suggestions.map((s: any, idx: number) => (
                    <button
                      key={s._id}
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-gray-100 last:border-0 ${
                        idx === suggSelectedIndex ? 'bg-red-50' : 'hover:bg-red-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-maroon text-white flex items-center justify-center font-black text-sm shrink-0">
                        {s.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 font-medium">+91 {s.phone} · {s.totalVisits || 0} visits · ₹{(s.totalSpend || 0).toLocaleString()} spent</p>
                      </div>
                      <span className="text-xs bg-maroon text-white px-2 py-1 rounded-md font-bold">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {/* CRM Result Card */}
              {customer && (
                <div className="rounded-xl border border-maroon border-opacity-20 overflow-hidden">
                  {/* Customer Identity Banner */}
                  <div className="bg-gradient-to-r from-maroon to-red-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-white font-black text-sm">
                        {customer.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{customer.name}</p>
                        <p className="text-white text-opacity-70 text-xs">+91 {customer.phone} · {customer.totalVisits || 0} visits</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                        customer.tier === 'GOLD' ? 'bg-yellow-400 text-yellow-900' :
                        customer.tier === 'SILVER' ? 'bg-gray-300 text-gray-800' :
                        customer.tier === 'PLATINUM' ? 'bg-purple-300 text-purple-900' :
                        'bg-white bg-opacity-20 text-white'
                      }`}>{customer.tier}</span>
                      <button
                        onClick={() => { setCustomer(null); setCustomerPhone(''); setCustomerName(''); setRedeemPoints(''); }}
                        className="text-white text-opacity-60 hover:text-opacity-100 transition-opacity ml-1 text-xs"
                      >✕</button>
                    </div>
                  </div>

                  {/* Loyalty Points Redeem Row */}
                  <div className="bg-red-50 px-4 py-3 flex items-center gap-3">
                    <Gift size={16} className="text-maroon shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Loyalty Balance</p>
                      <p className="font-black text-maroon">{customer.loyaltyPoints?.toLocaleString() || 0} pts
                        <span className="font-normal text-gray-400 ml-1 text-xs">= ₹{((customer.loyaltyPoints || 0) / (pointValue || 1)).toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" placeholder="Redeem" value={redeemPoints}
                        onChange={e => setRedeemPoints(e.target.value)}
                        max={customer.loyaltyPoints}
                        className="w-20 text-sm border border-maroon border-opacity-30 rounded-lg px-2 py-1.5 bg-white text-center font-semibold"
                      />
                      <button
                        onClick={() => setRedeemPoints(String(customer.loyaltyPoints || 0))}
                        className="text-xs font-black bg-maroon text-white px-2.5 py-1.5 rounded-lg hover:bg-opacity-90 transition"
                      >MAX</button>
                    </div>
                  </div>
                </div>
              )}

              {/* No CRM Match hint — hide if customer name is already filled (selected from suggestions) */}
              {!customer && !customerName && customerPhone.length === 10 && !customerLoading && preview?.order?.status !== 'BILLED' && (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0"></span>
                  No existing customer found — will be created on payment
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b"><h2 className="font-bold text-gray-700">Order Items</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-center">Qty</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">GST%</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.lineItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{item.name}
                        {item.variantName && item.variantName !== 'Regular' && <span className="text-gray-400 text-xs ml-1">({item.variantName})</span>}
                      </p>
                      {item.hindiName && <p className="text-xs text-gray-400">{item.hindiName}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">₹{item.unitPrice}</td>
                    <td className="px-4 py-3 text-right"><span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">{item.gstSlab}%</span></td>
                    <td className="px-4 py-3 text-right font-semibold">₹{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Additional Items Section (Menu + Retail) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowAdditional(r => !r)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-maroon" />
                <span className="font-bold text-gray-700">Add More Items</span>
                {additionalCart.length > 0 && (
                  <span className="bg-maroon text-white text-xs font-black px-2 py-0.5 rounded-full">
                    {additionalCart.reduce((s, c) => s + c.quantity, 0)} items · +₹{additionalSubtotal.toFixed(0)}
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-sm">{showAdditional ? '▲' : '▼'}</span>
            </button>

            {showAdditional && (
              <div className="p-4 space-y-3">
                {/* Search & Scan Actions */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={additionalSearch} onChange={e => setAdditionalSearch(e.target.value)}
                      placeholder="Search items..."
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-maroon focus:border-transparent"
                    />
                  </div>
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-gray-600 transition flex items-center justify-center"
                    title="Scan Barcode with Camera"
                  >
                    <Camera size={18} />
                  </button>
                  <button 
                    onClick={() => setShowCustomItemForm(!showCustomItemForm)}
                    className={`px-3 py-2 border rounded-lg text-sm font-semibold transition whitespace-nowrap ${showCustomItemForm ? 'bg-maroon text-white border-maroon' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600'}`}
                  >
                    + Custom
                  </button>
                </div>

                {/* Custom Item Form */}
                {showCustomItemForm && (
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="text" placeholder="Item name" value={customItemName} onChange={e => setCustomItemName(e.target.value)}
                        className="flex-[2] min-w-0 px-2 py-1.5 border border-orange-200 rounded text-sm focus:outline-none focus:border-maroon"
                      />
                      <input 
                        type="number" placeholder="₹ Price" value={customItemPrice} onChange={e => setCustomItemPrice(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 border border-orange-200 rounded text-sm focus:outline-none focus:border-maroon"
                      />
                      <select 
                        value={customItemGst} onChange={e => setCustomItemGst(e.target.value)}
                        className="w-16 px-1 py-1.5 border border-orange-200 rounded text-sm focus:outline-none focus:border-maroon bg-white"
                      >
                        <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option>
                      </select>
                    </div>
                    <button 
                      onClick={handleAddCustomItem}
                      className="w-full bg-maroon text-white text-sm font-bold py-1.5 rounded hover:bg-opacity-90 transition"
                    >
                      Add Custom Item
                    </button>
                  </div>
                )}

                {/* Feedback Toast */}
                {scanFeedback && (
                  <div className={`p-2 rounded-lg text-sm text-center font-semibold animate-pulse ${scanFeedback.ok ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {scanFeedback.text}
                  </div>
                )}

                {/* Catalog grid */}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {catalogItems
                    .filter(i => i.name.toLowerCase().includes(additionalSearch.toLowerCase()))
                    .map(item => {
                      const inCart = additionalCart.find(c => c.catalogId === item.catalogId);
                      return (
                        <div
                          key={item.catalogId}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-sm cursor-pointer transition-all ${inCart ? 'border-maroon bg-red-50' : 'border-gray-100 hover:border-maroon hover:bg-gray-50'}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate text-xs">{item.name}</p>
                            <p className="text-maroon font-bold text-xs">₹{item.priceINR}</p>
                          </div>
                          {inCart ? (
                            <div className="flex items-center gap-1 ml-2">
                              <button onClick={() => {
                                setAdditionalCart(cart => cart.map(c => c.catalogId === item.catalogId ? { ...c, quantity: Math.max(0, c.quantity - 1) } : c).filter(c => c.quantity > 0));
                              }} className="w-5 h-5 bg-maroon text-white rounded flex items-center justify-center text-xs font-bold"><Minus size={10} /></button>
                              <span className="w-5 text-center text-xs font-black">{inCart.quantity}</span>
                              <button onClick={() => addAdditionalItem(item)} className="w-5 h-5 bg-maroon text-white rounded flex items-center justify-center text-xs font-bold"><Plus size={10} /></button>
                            </div>
                          ) : (
                            <button onClick={() => addAdditionalItem(item)} className="ml-2 w-6 h-6 bg-maroon text-white rounded-full flex items-center justify-center hover:bg-opacity-90 transition">
                              <Plus size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Additional cart summary */}
                {additionalCart.length > 0 && (
                  <div className="border-t pt-3 space-y-1">
                    {additionalCart.map(c => (
                      <div key={c.catalogId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 flex-1">{c.name} × {c.quantity}</span>
                        <span className="font-semibold text-gray-800">₹{(c.priceINR * c.quantity).toFixed(2)}</span>
                        <button onClick={() => setAdditionalCart(cart => cart.filter(item => item.catalogId !== c.catalogId))} className="ml-2 text-red-400 hover:text-red-600"><X size={14} /></button>
                      </div>
                    ))}
                    <div className="flex justify-between font-black text-maroon pt-1 border-t text-sm">
                      <span>Additional Subtotal</span>
                      <span>₹{additionalSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GST Breakup */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b"><h2 className="font-bold text-gray-700">GST Breakup (HSN: 9963)</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase tracking-wide">
                <tr><th className="px-4 py-2 text-left">Slab</th><th className="px-4 py-2 text-right">Taxable Amt</th><th className="px-4 py-2 text-right">CGST (½)</th><th className="px-4 py-2 text-right">SGST (½)</th><th className="px-4 py-2 text-right">Total GST</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {combinedGstBreakup.map((g, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium">@{g.slab}%</td>
                    <td className="px-4 py-3 text-right">₹{g.taxableAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">₹{g.cgst.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-purple-600">₹{g.sgst.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{(g.cgst + g.sgst).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t">
                <tr><td className="px-4 py-2 font-bold" colSpan={4}>Total GST</td><td className="px-4 py-2 text-right font-bold text-maroon">₹{combinedTotalGST.toFixed(2)}</td></tr>
              </tfoot>
            </table>
          </div>

          {/* Discount */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <button onClick={() => setShowDc(d => !d)} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-maroon">
              <Tag size={16} /> {showDiscount ? 'Remove Discount' : 'Apply Discount'}
            </button>
            {showDiscount && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <select value={discountType} onChange={e => setDcType(e.target.value as any)} className="border rounded px-3 py-2 text-sm">
                    <option value="PERCENT">% Percentage</option><option value="FLAT">₹ Flat Amount</option>
                  </select>
                  <input type="number" min="0" value={discountVal} onChange={e => setDcVal(e.target.value)}
                    placeholder={discountType === 'PERCENT' ? '0–100%' : 'Amount in ₹'} className="flex-1 border rounded px-3 py-2 text-sm" />
                </div>
                {discountVal && <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 rounded px-3 py-2"><CheckCircle size={14} /> Discount: ₹{discountFlat.toFixed(2)}</div>}
                {needsApproval && (
                  <div className="border border-yellow-300 bg-yellow-50 rounded p-3">
                    <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium mb-2"><AlertTriangle size={14} /> Discount &gt;10% requires Manager approval</div>
                    <input type="text" placeholder="Manager name / approval code" value={approver} onChange={e => setApprover(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment Panel */}
        <div className="w-full lg:w-96 space-y-4 lg:self-start lg:overflow-y-auto lg:max-h-full p-4 lg:p-0">

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-maroon text-white px-4 py-3"><h2 className="font-bold">Bill Summary</h2></div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Sub-total (incl. GST)</span><span>₹{combinedSubtotal.toFixed(2)}</span></div>
              {discountFlat > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{discountFlat.toFixed(2)}</span></div>}
              <div className="flex justify-between text-gray-400 text-xs"><span>Round-off</span><span>{roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-xl text-maroon border-t pt-3 mt-2"><span>Total</span><span>₹{finalTotal}</span></div>
              <p className="text-xs text-gray-400 italic">
                ({discountFlat > 0 ? `After ₹${discountFlat} discount · ` : ''}
                CGST ₹{combinedGstBreakup.reduce((s, g) => s + g.cgst, 0).toFixed(2)} + SGST ₹{combinedGstBreakup.reduce((s, g) => s + g.sgst, 0).toFixed(2)})
              </p>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="font-bold text-gray-700 mb-3">Payment Method</h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: 'CASH', label: 'Cash', Icon: Banknote },
                { mode: 'CARD', label: 'Card', Icon: CreditCard },
                { mode: 'UPI', label: 'UPI', Icon: Smartphone },
                { mode: 'SPLIT', label: 'Split', Icon: Split },
              ] as const).map(({ mode, label, Icon }) => (
                <button key={mode} onClick={() => setMode(mode)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${paymentMode === mode ? 'border-maroon bg-red-50 text-maroon' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode-specific fields */}
          {paymentMode === 'CASH' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center space-y-2">
              <Banknote size={48} className="text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">Collect ₹{finalTotal} in Cash</p>
            </div>
          )}

          {paymentMode === 'UPI' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center space-y-3">
              <p className="text-sm text-gray-500">Collect ₹{finalTotal} via UPI</p>
              <input type="text" placeholder="UPI Transaction ID (optional)" value={upiRef} onChange={e => setUpiRef(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          )}

          {paymentMode === 'CARD' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center space-y-2">
              <CreditCard size={48} className="text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">Swipe / insert card for ₹{finalTotal}</p>
              <p className="text-xs text-gray-400">Mark as paid after terminal approval</p>
            </div>
          )}

          {paymentMode === 'SPLIT' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">Split Payment</h3>
              {splits.map((sp, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={sp.mode} onChange={e => updateSplit(i, 'mode', e.target.value)} className="border rounded px-2 py-2 text-sm">
                    <option value="CASH">Cash</option><option value="CARD">Card</option><option value="UPI">UPI</option>
                  </select>
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-2 flex items-center text-gray-500 text-sm">₹</span>
                    <input type="number" value={sp.amountINR || ''} onChange={e => updateSplit(i, 'amountINR', +e.target.value)} className="w-full pl-6 border rounded px-2 py-2 text-sm" />
                  </div>
                  <button onClick={() => removeSplit(i)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
              <button onClick={addSplit} className="text-sm text-saffron hover:underline">+ Add payment</button>
              <div className={`text-sm font-semibold text-right ${splitsTotal === finalTotal ? 'text-green-600' : 'text-red-500'}`}>
                Collected: ₹{splitsTotal} / ₹{finalTotal}
              </div>
            </div>
          )}

          {/* WhatsApp */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare size={16} className="text-green-600" /> WhatsApp Receipt (optional)
            </label>
            <div className="flex gap-2">
              <span className="bg-gray-100 border border-r-0 rounded-l px-3 py-2 text-sm text-gray-500">+91</span>
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} maxLength={10} placeholder="9876543210"
                className="flex-1 border rounded-r px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={handlePay} disabled={
                paying || generatingBill ||
                (paymentMode === 'SPLIT' && splitsTotal !== finalTotal) ||
                (needsApproval && !approver.trim())
              }
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black text-xl rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {paying ? <Loader2 size={22} className="animate-spin" /> : null}
                {paying ? 'Processing…' : `GENERATE INVOICE`}
              </button>
              <button onClick={handleGenerateBill} className="px-4 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition flex items-center justify-center">
                <Printer size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Print Preview Container */}
      <div style={{ display: 'none' }}>
        <div ref={receiptRef}>
          <InvoicePrint
            preview={{
              ...preview,
              lineItems: combinedLineItems,
              subtotalINR: combinedSubtotal,
              gstBreakup: combinedGstBreakup,
              totalGSTINR: combinedTotalGST,
            }}
            finalTotal={finalTotal}
            discountFlat={discountFlat}
            roundOff={roundOff}
            paymentMode={paymentMode}
            invoiceNumber={invoiceData?.invoiceNumber || ''}
            restaurant={{
              name: restaurant?.name || '',
              address: restaurant?.address || '',
              contactNumber: restaurant?.contactNumber || '',
              gstin: restaurant?.gstin || '',
              fssai: restaurant?.fssaiNumber || '',
              upiId: restaurant?.upiId || '',
            }}
          />
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {showCamera && (
        <CameraScanner 
          onScan={(barcode) => {
            handleBarcodeScan(barcode);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

    </div>
  );
}
