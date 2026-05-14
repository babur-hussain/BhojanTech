import React, { useState, useEffect, useRef } from 'react';
import { MenuCategory, MenuItem } from '@restaurant/types';
import { Search, Plus, Minus, ShoppingCart, UserPlus, CreditCard, Banknote, Smartphone, Split, Loader2, CheckCircle, Printer, X, Tag, Image as ImageIcon } from 'lucide-react';
import { api } from '../utils/api';
import PageLoader from '../components/PageLoader';
import InvoicePrint from '../components/Billing/InvoicePrint';
import { printReceipt, toWordsEN, type ReceiptData } from '../utils/thermalPrint';

export default function DirectPOS() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Cart
  const [cart, setCart] = useState<any[]>([]);
  
  // Customer & Payment
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [customerLoading, setCustLoading] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [pointValue, setPointValue] = useState(0);

  const [discountType, setDcType] = useState<'FLAT' | 'PERCENT'>('PERCENT');
  const [discountVal, setDcVal] = useState('');
  const [showDiscount, setShowDc] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [paymentMode, setMode] = useState<'CASH' | 'CARD' | 'UPI' | 'SPLIT'>('CASH');
  const [cashReceived, setCash] = useState('');
  const [splits, setSplits] = useState<{ mode: string; amountINR: number }[]>([]);
  
  // Submit state
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [catRes, itemRes, restRes] = await Promise.all([
          api.get('/menu/categories'),
          api.get('/menu/items'),
          api.get('/restaurant/info')
        ]);
        setCategories(catRes.data);
        setItems(itemRes.data.filter((i: any) => i.isAvailable));
        setRestaurant(restRes.data);
      } catch (err) {
        console.error('Failed to load menu', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCustomerSearch = async () => {
    if (customerPhone.length < 10) return;
    try {
      setCustLoading(true);
      const res = await api.get(`/billing/customer/${customerPhone}`);
      if (res.data.found) {
        setCustomer(res.data.customer);
        setCustomerName(res.data.customer.name);
        setPointValue(res.data.pointsPerRupeeRedemption || 1);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setCustLoading(false);
    }
  };

  const addToCart = (item: MenuItem, variantIdx = 0) => {
    const variant = item.variants[variantIdx];
    const expectedVariantName = variant.name !== 'Regular' ? variant.name : undefined;
    const existing = cart.find(c => c.menuItemId === (item as any)._id && c.variantName === expectedVariantName);
    if (existing) {
      setCart(cart.map(c => c === existing ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        menuItemId: (item as any)._id,
        name: item.name,
        variantName: variant.name !== 'Regular' ? variant.name : undefined,
        priceAtOrderTime: variant.specialPriceINR || variant.priceINR,
        quantity: 1,
        gstSlab: item.gstSlab
      }]);
    }
  };

  const updateCartQty = (idx: number, delta: number) => {
    const newCart = [...cart];
    newCart[idx].quantity += delta;
    if (newCart[idx].quantity <= 0) newCart.splice(idx, 1);
    setCart(newCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.priceAtOrderTime * item.quantity), 0);
  
  const pointsDiscount = customer && redeemPoints ? Math.min(Number(redeemPoints) / (pointValue || 1), subtotal) : 0;
  const discountFlat = (() => {
    let dc = 0;
    if (discountVal) {
      dc = discountType === 'FLAT' ? Math.min(+discountVal, subtotal) : +(subtotal * Math.min(+discountVal, 100) / 100).toFixed(2);
    }
    return dc + pointsDiscount;
  })();
  
  // Quick GST estimate for frontend display (backend does accurate)
  const gstEstimate = cart.reduce((sum, item) => sum + ((item.priceAtOrderTime * item.quantity) * (item.gstSlab || 5) / 100), 0);
  const grandTotalEstimate = Math.round(subtotal - discountFlat + gstEstimate);

  const handlePay = async () => {
    if (cart.length === 0) return;
    try {
      setPaying(true);
      const body: any = {
        orderType: 'TAKEAWAY',
        items: cart.map(c => ({
          menuItemId: c.menuItemId,
          name: c.name,
          variantName: c.variantName,
          quantity: c.quantity,
          priceAtOrderTime: c.priceAtOrderTime
        })),
        paymentMode,
        amountPaidINR: paymentMode === 'CASH' ? +cashReceived || grandTotalEstimate : grandTotalEstimate,
        payments: paymentMode === 'SPLIT' ? splits : undefined,
      };
      if (discountFlat > pointsDiscount && discountVal) {
        body.discount = { type: discountType, value: +discountVal };
      }
      if (customerPhone) { body.customerPhone = customerPhone; body.customerName = customerName; }
      if (redeemPoints && +redeemPoints > 0) body.redeemPoints = +redeemPoints;

      const res = await api.post('/billing/direct', body);
      setInvoiceData(res.data.invoice);
      setOrderData(res.data.order);
      setPaid(true);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setCustomer(null);
    setCustomerPhone('');
    setCustomerName('');
    setDcVal('');
    setRedeemPoints('');
    setPaid(false);
    setInvoiceData(null);
  };

  if (loading) return <PageLoader message="Loading POS..." />;

  if (paid) {
    return (
      <div className="h-[calc(100vh-80px)] overflow-y-auto bg-gray-50 flex flex-col items-center py-8 -m-4 p-4">
        <div className="flex flex-col items-center mb-8">
          <CheckCircle size={64} className="text-green-500 mb-2" />
          <h2 className="text-2xl font-black text-gray-800">Payment Successful!</h2>
          <p className="text-gray-500 mt-1">Invoice {invoiceData?.invoiceNumber || ''} generated.</p>
          
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => {
                const now = new Date();
                const receiptData: ReceiptData = {
                  restaurantName: restaurant?.name || '',
                  address: restaurant?.address || '',
                  gstin: restaurant?.gstin || '',
                  fssai: restaurant?.fssaiNumber || '',
                  upiId: restaurant?.upiId || '',
                  invoiceNumber: invoiceData.invoiceNumber,
                  tableNumber: 'Takeaway',
                  waiterName: 'Staff',
                  paymentMode: invoiceData.paymentMode,
                  date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                  time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                  items: (invoiceData.lineItems || []).map((li: any) => ({
                    name: li.name, variantName: li.variantName, quantity: li.quantity,
                    unitPrice: li.unitPrice, lineTotal: li.lineTotal, gstSlab: li.gstSlab,
                  })),
                  subtotal: invoiceData.subtotalINR,
                  discountFlat: invoiceData.discount?.flatAmount || 0,
                  roundOff: invoiceData.roundOff,
                  grandTotal: invoiceData.grandTotalINR,
                  gstBreakup: invoiceData.gstBreakup || [],
                  totalGST: (invoiceData.gstBreakup || []).reduce((s: number, g: any) => s + g.cgst + g.sgst, 0),
                  amountInWords: toWordsEN(invoiceData.grandTotalINR),
                };
                printReceipt({
                  receiptData,
                  receiptContainerRef: receiptRef.current,
                  printerName: restaurant?.printerName || '',
                });
              }}
              className="flex items-center gap-2 px-8 py-3 bg-maroon text-white rounded-xl font-bold shadow-lg hover:bg-opacity-90 transition-transform active:scale-95"
            >
              <Printer size={20} /> Print Receipt
            </button>
            <button onClick={resetPOS} className="px-8 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-transform active:scale-95">
              New Order
            </button>
          </div>
        </div>

        {/* Display the thermal receipt inline so the cashier can see it perfectly */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-b from-gray-200/50 to-transparent blur-xl -z-10 rounded-full"></div>
          <div ref={receiptRef}>
            <InvoicePrint
              preview={{ order: orderData, lineItems: invoiceData.lineItems, gstBreakup: invoiceData.gstBreakup, totalGSTINR: invoiceData.totalGSTINR, subtotalINR: invoiceData.subtotalINR }}
              finalTotal={invoiceData.grandTotalINR}
              discountFlat={invoiceData.discount?.flatAmount || 0}
              roundOff={invoiceData.roundOff}
              paymentMode={invoiceData.paymentMode}
              invoiceNumber={invoiceData.invoiceNumber}
              restaurant={{
                name: restaurant?.name || '',
                address: restaurant?.address || '',
                gstin: restaurant?.gstin || '',
                fssai: restaurant?.fssaiNumber || '',
                upiId: restaurant?.upiId || '',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const filteredItems = items.filter(i => 
    (selectedCategory === 'all' || i.categoryId === selectedCategory) &&
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-80px)] flex gap-4 overflow-hidden -m-4 p-4">
      {/* Left: Menu */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search & Categories */}
        <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Search menu..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-maroon focus:border-transparent"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <button 
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'all' ? 'bg-maroon text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              All Items
            </button>
            {categories.map(c => (
              <button 
                key={(c as any)._id || c.id} onClick={() => setSelectedCategory((c as any)._id || c.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === ((c as any)._id || c.id) ? 'bg-maroon text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Item Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map((item: any) => (
              <div key={item._id} onClick={() => addToCart(item)} className="bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:border-saffron hover:shadow-md transition-all flex flex-col">
                {item.imageUrls?.[0] || item.imageUrl ? (
                  <img src={item.imageUrls?.[0] || item.imageUrl} alt={item.name} className="w-full h-28 object-cover rounded-lg mb-3 border border-gray-50" />
                ) : (
                  <div className="w-full h-28 bg-gray-50 border border-dashed border-gray-200 rounded-lg mb-3 flex items-center justify-center text-gray-300">
                    <ImageIcon size={28} />
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <div className={`w-3 h-3 border flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.variants[0].specialPriceINR && (
                      <span className="text-xs text-gray-400 line-through">₹{item.variants[0].priceINR}</span>
                    )}
                    <span className="font-bold text-gray-800">
                      ₹{item.variants[0].specialPriceINR || item.variants[0].priceINR}
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1 leading-tight">{item.name}</h3>
                {item.hindiName && <p className="text-xs text-gray-400 mb-2">{item.hindiName}</p>}
                {item.variants.length > 1 && (
                  <p className="text-xs text-saffron mt-auto italic">Multiple variants available</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart & Payment */}
      <div className="w-[400px] bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Cart Header */}
        <div className="bg-maroon text-white p-4 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><ShoppingCart size={18} /> Current Order</h2>
          <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} items
          </span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} className="mb-2 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map((c, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">₹{c.priceAtOrderTime} {c.variantName ? `(${c.variantName})` : ''}</p>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-0.5">
                  <button onClick={() => updateCartQty(idx, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><Minus size={14} /></button>
                  <span className="text-sm font-bold w-4 text-center">{c.quantity}</span>
                  <button onClick={() => updateCartQty(idx, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><Plus size={14} /></button>
                </div>
                <div className="w-16 text-right font-bold text-gray-800 text-sm pl-2">
                  ₹{c.priceAtOrderTime * c.quantity}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Panel */}
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          
          {/* Customer */}
          <div className="flex gap-2">
            <input type="tel" placeholder="Customer Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} onBlur={handleCustomerSearch} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input type="text" placeholder="Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Discount Toggle */}
          <button onClick={() => setShowDc(d => !d)} className="text-xs font-medium text-maroon flex items-center gap-1"><Tag size={12}/> {showDiscount ? 'Remove Discount' : 'Apply Discount'}</button>
          {showDiscount && (
            <div className="flex gap-2">
              <select value={discountType} onChange={e => setDcType(e.target.value as any)} className="border rounded px-2 py-1 text-sm bg-white">
                <option value="PERCENT">%</option><option value="FLAT">₹</option>
              </select>
              <input type="number" value={discountVal} onChange={e => setDcVal(e.target.value)} placeholder="Value" className="flex-1 border rounded px-2 py-1 text-sm bg-white" />
            </div>
          )}

          {/* Payment Mode */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { mode: 'CASH', Icon: Banknote },
              { mode: 'CARD', Icon: CreditCard },
              { mode: 'UPI', Icon: Smartphone },
              { mode: 'SPLIT', Icon: Split },
            ].map(({ mode, Icon }) => (
              <button key={mode} onClick={() => setMode(mode as any)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 text-xs font-bold transition-all ${paymentMode === mode ? 'border-maroon bg-red-50 text-maroon' : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'}`}>
                <Icon size={16} className="mb-1" /> {mode}
              </button>
            ))}
          </div>

          {/* Totals & Pay */}
          <div className="pt-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-600 mb-1"><span>Est. Tax</span><span>₹{gstEstimate.toFixed(2)}</span></div>
            {discountFlat > 0 && <div className="flex justify-between text-sm text-green-600 mb-1"><span>Discount</span><span>-₹{discountFlat.toFixed(2)}</span></div>}
            <button 
              onClick={handlePay} disabled={cart.length === 0 || paying}
              className="w-full mt-2 py-3 bg-green-600 hover:bg-green-700 text-white font-black text-lg rounded-xl shadow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {paying ? <Loader2 size={20} className="animate-spin" /> : null}
              {paying ? 'Processing...' : `GENERATE INVOICE ₹${grandTotalEstimate}`}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
