import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MenuCategory, MenuItem } from '@restaurant/types';
import {
  Search, Plus, Minus, ShoppingCart, Loader2, X, Image as ImageIcon,
  ScanLine, Camera, Package, ShoppingBag
} from 'lucide-react';
import { api, getMediaUrl } from '../utils/api';
import PageLoader from '../components/PageLoader';
import { printReceipt, toWordsEN, type ReceiptData } from '../utils/thermalPrint';
import { useNavigate } from 'react-router-dom';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import CameraScanner from '../components/CameraScanner';
import { useBranchStore } from '../store/branchStore';

// Cart item can be a menu item or a retail item
interface CartItem {
  id: string;           // menuItemId or retailItemId
  type: 'menu' | 'retail';
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  gstSlab: number;
  unit?: string;
  barcode?: string;
}

export default function DirectPOS() {
  const navigate = useNavigate();

  // Menu
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Retail
  const [retailItems, setRetailItems] = useState<any[]>([]);
  const [showRetailTab, setShowRetailTab] = useState(false);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Unified cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Scanner feedback
  const [scanFeedback, setScanFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Custom Items
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemGst, setCustomItemGst] = useState('0');

  const [itemForVariant, setItemForVariant] = useState<any>(null);

  const [paying, setPaying] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDob, setCustomerDob] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const suggRef = useRef<HTMLDivElement>(null);
  const { selectedBranchId } = useBranchStore();

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [catRes, itemRes, retailRes] = await Promise.all([
          api.get('/menu/categories'),
          api.get('/menu/items'),
          api.get('/retail-items'),
        ]);
        setCategories(catRes.data);
        setMenuItems(itemRes.data.filter((i: any) => i.isAvailable));
        setRetailItems(retailRes.data.filter((i: any) => i.isActive));
      } catch (err) {
        console.error('Failed to load POS data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedBranchId]);

  // ─── Live Customer Search ──────────────────────────────────────────────────
  const searchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setSuggestions([]); setShowSugg(false); return; }
    try {
      setSuggLoading(true);
      const res = await api.get(`/customers?q=${encodeURIComponent(query)}&limit=6`);
      setSuggestions(res.data?.customers || res.data || []);
      setShowSugg(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customer) return;
    const t = setTimeout(() => searchSuggestions(customerPhone), 300);
    return () => clearTimeout(t);
  }, [customerPhone, customer, searchSuggestions]);

  useEffect(() => {
    if (customer) return;
    const t = setTimeout(() => searchSuggestions(customerName), 300);
    return () => clearTimeout(t);
  }, [customerName, customer, searchSuggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggRef.current && !suggRef.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Barcode Scanner (hardware) ────────────────────────────────────────────
  const handleBarcodeScan = useCallback((barcode: string) => {
    const found = retailItems.find(i => i.barcode === barcode);
    if (found) {
      addRetailToCart(found);
      setScanFeedback({ text: `✓ ${found.name} added`, ok: true });
      if (!showRetailTab) setShowRetailTab(true);
    } else {
      setScanFeedback({ text: `Barcode ${barcode} not found in retail catalog`, ok: false });
    }
    setTimeout(() => setScanFeedback(null), 3000);
  }, [retailItems, showRetailTab]);

  useBarcodeScanner(handleBarcodeScan);

  // ─── Cart Helpers ──────────────────────────────────────────────────────────
  const addMenuToCart = (item: any, variantIdx = 0) => {
    const variant = item.variants[variantIdx];
    const variantName = variant.name !== 'Regular' ? variant.name : undefined;
    const key = item._id + (variantName || '');
    setCart(prev => {
      const ex = prev.find(c => c.id === key);
      if (ex) return prev.map(c => c.id === key ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        id: key, type: 'menu', name: item.name, variantName,
        price: variant.specialPriceINR || variant.priceINR,
        quantity: 1, gstSlab: item.gstSlab ?? 0,
      }];
    });
  };

  const addRetailToCart = (item: any) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === item._id && c.type === 'retail');
      if (ex) return prev.map(c => (c.id === item._id && c.type === 'retail') ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        id: item._id, type: 'retail', name: item.name,
        price: item.priceINR, quantity: 1,
        gstSlab: item.gstSlab ?? 0,   // ← use product's actual GST slab, not hardcoded 18
        unit: item.unit, barcode: item.barcode,
      }];
    });
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim() || !customItemPrice || isNaN(+customItemPrice)) return;
    setCart(prev => [...prev, {
      id: `custom-${Date.now()}`,
      type: 'menu',
      name: customItemName.trim(),
      price: +customItemPrice,
      quantity: 1,
      gstSlab: +customItemGst,
    }]);
    setCustomItemName('');
    setCustomItemPrice('');
    setShowCustomItemForm(false);
  };

  const updateQty = (id: string, type: 'menu' | 'retail', delta: number) => {
    setCart(prev =>
      prev.map(c => (c.id === id && c.type === type) ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
          .filter(c => c.quantity > 0)
    );
  };

  const removeFromCart = (id: string, type: 'menu' | 'retail') =>
    setCart(prev => prev.filter(c => !(c.id === id && c.type === type)));

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const gstEstimate = cart.reduce((s, c) => s + (c.price * c.quantity * c.gstSlab / 100), 0);
  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);

  // ─── Customer Search removed from POS ─────────────────────────────────────
  // Customer phone/name are collected in BillingScreen after order creation.

  // ─── Proceed to Checkout ───────────────────────────────────────────────────
  const handleProceed = async () => {
    if (cart.length === 0) return;

    try {
      setPaying(true);
      const menuCartItems = cart.filter(c => c.type === 'menu');
      const retailCartItems = cart.filter(c => c.type === 'retail');

      // 1. Create the order
      const res = await api.post('/orders/takeaway', {
        orderType: 'TAKEAWAY',
        items: menuCartItems.map(c => ({
          menuItemId: c.id,
          name: c.name,
          variantName: c.variantName,
          quantity: c.quantity,
          priceAtOrderTime: c.price,
          gstSlab: c.gstSlab,
        })),
        retailItems: retailCartItems.map(c => ({
          _id: c.id,
          name: c.name,
          quantity: c.quantity,
          priceAtOrderTime: c.price,
          gstSlab: c.gstSlab,
        })),
      });

      // 2. Immediately pay and close the order
      const payRes = await api.post('/billing/pay', {
        orderId: res.data._id,
        paymentMode,
        customerPhone: customerPhone || '9999999999',
        customerName: customerName.trim() || 'Walk-in Customer',
        customerDob: customerDob ? customerDob.split('/').reverse().join('-') : undefined,
        retailItems: [], // already in order, processPayment handles deduction
        additionalMenuItems: [],
      });

      // 3. Navigate to the generated invoice
      navigate(`/invoice/${payRes.data.invoice._id}`);
    } catch (e: any) {
      console.error('POS error:', e?.response?.data || e);
      const errorData = e?.response?.data;
      const errMsg = typeof errorData?.error === 'string' ? errorData.error 
                   : errorData?.message ? errorData.message 
                   : errorData?.error ? JSON.stringify(errorData.error)
                   : 'Failed to create invoice. Please try again.';
      alert(errMsg);
    } finally {
      setPaying(false);
    }
  };

  const resetPOS = () => { setCart([]); };

  if (loading) return <PageLoader message="Loading POS..." />;

  const filteredMenu = menuItems.filter(i =>
    (selectedCategory === 'all' || i.categoryId === selectedCategory) &&
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRetail = retailItems.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.barcode && i.barcode.includes(searchQuery))
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-80px)] -m-4 p-4">
      {/* ── Left: Menu + Retail ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[60vh] lg:min-h-0">

        {/* Search + Scanner */}
        <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50">
          {/* Customer */}
          <div className="flex gap-2 relative" ref={suggRef}>
            <input
              type="tel" maxLength={10} placeholder="Customer Phone" value={customerPhone}
              onChange={e => { setCustomerPhone(e.target.value.replace(/\D/g, '')); setCustomer(null); }}
              className={`flex-1 bg-white border rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-maroon focus:border-transparent outline-none shadow-sm transition-all ${customer ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
            />
            <input
              type="text" placeholder="Name" value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-1/3 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-maroon focus:border-transparent outline-none shadow-sm transition-all"
            />
            <input
              type="text" maxLength={10} placeholder="DD/MM/YYYY" value={customerDob}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                let formatted = '';
                if (digits.length > 0) formatted += digits.substring(0, 2);
                if (digits.length > 2) formatted += '/' + digits.substring(2, 4);
                if (digits.length > 4) formatted += '/' + digits.substring(4, 8);
                setCustomerDob(formatted);
              }}
              className="w-1/4 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-maroon focus:border-transparent outline-none shadow-sm transition-all"
            />
            
            {/* Live suggestions dropdown */}
            {showSugg && suggestions.length > 0 && !customer && (
              <div className="absolute z-50 left-0 right-0 bg-white border shadow-lg rounded-lg overflow-hidden" style={{ top: 'calc(100% + 4px)' }}>
                {suggestions.map((s: any) => (
                  <button
                    key={s._id}
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      setCustomer(s); 
                      setCustomerPhone(s.phone || ''); 
                      setCustomerName(s.name || ''); 
                      if (s.dob) {
                        const d = new Date(s.dob);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        setCustomerDob(`${day}/${month}/${d.getFullYear()}`);
                      } else {
                        setCustomerDob('');
                      }
                      setShowSugg(false); 
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text" placeholder={showRetailTab ? "Search retail or scan barcode..." : "Search menu..."}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-maroon focus:border-transparent"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Camera scan button */}
            <button
              onClick={() => setShowCamera(true)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium shadow-sm"
              title="Scan barcode with camera"
            >
              <Camera size={18} />
            </button>
            <button 
              onClick={() => setShowCustomItemForm(!showCustomItemForm)}
              className={`px-3 py-2 border rounded-lg text-sm font-semibold transition whitespace-nowrap shadow-sm ${showCustomItemForm ? 'bg-maroon text-white border-maroon' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'}`}
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

          {/* Scan feedback toast */}
          {scanFeedback && (
            <div className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 animate-pulse ${
              scanFeedback.ok ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              <ScanLine size={14} />
              {scanFeedback.text}
            </div>
          )}

          {/* Tab row: Menu Categories + Retail tab */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {/* Retail tab */}
            <button
              onClick={() => { setShowRetailTab(false); setSelectedCategory('all'); }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                !showRetailTab && selectedCategory === 'all' ? 'bg-maroon text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Items
            </button>
            {categories.map(c => (
              <button
                key={(c as any)._id}
                onClick={() => { setSelectedCategory((c as any)._id); setShowRetailTab(false); }}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !showRetailTab && selectedCategory === (c as any)._id ? 'bg-maroon text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {c.name}
              </button>
            ))}
            {/* ── Retail Tab ── */}
            <button
              onClick={() => { setShowRetailTab(true); setSelectedCategory(''); }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-1.5 ${
                showRetailTab ? 'bg-blue-600 text-white' : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <ShoppingBag size={13} /> Retail
              {retailItems.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${showRetailTab ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>
                  {retailItems.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Item Grid ── */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          {!showRetailTab ? (
            /* ── Menu Items ── */
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMenu.map((item: any) => (
                <div
                  key={item._id}
                  onClick={() => {
                    if (item.variants && item.variants.length > 1) {
                      setItemForVariant(item);
                    } else {
                      addMenuToCart(item, 0);
                    }
                  }}
                  className="bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:border-saffron hover:shadow-md transition-all flex flex-col"
                >
                  {item.imageUrls?.[0] || item.imageUrl ? (
                    <img src={getMediaUrl(item.imageUrls?.[0] || item.imageUrl)} alt={item.name} className="w-full h-28 object-cover rounded-lg mb-3 border border-gray-50" />
                  ) : (
                    <div className="w-full h-28 bg-gray-50 border border-dashed border-gray-200 rounded-lg mb-3 flex items-center justify-center text-gray-300">
                      <ImageIcon size={28} />
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <div className={`w-3 h-3 border flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      {item.variants[0].specialPriceINR && (
                        <span className="text-xs text-gray-400 line-through">₹{item.variants[0].priceINR}</span>
                      )}
                      <span className="font-bold text-gray-800">₹{item.variants[0].specialPriceINR || item.variants[0].priceINR}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm leading-tight">{item.name}</h3>
                  {item.hindiName && <p className="text-xs text-gray-400">{item.hindiName}</p>}
                  {item.variants.length > 1 && <p className="text-xs text-saffron mt-auto italic">Multiple variants</p>}
                </div>
              ))}
            </div>
          ) : (
            /* ── Retail Items ── */
            <div>
              <div className="flex items-center gap-2 mb-3 text-blue-700">
                <ScanLine size={16} />
                <p className="text-xs font-bold">Hardware scanner active — scan any barcode to add instantly</p>
              </div>
              {filteredRetail.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <Package size={40} className="text-gray-200" />
                  <p className="text-sm font-medium">No retail items found</p>
                  <p className="text-xs">Add items in the Retail section or try a different search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredRetail.map((item: any) => {
                    const inCart = cart.find(c => c.id === item._id && c.type === 'retail');
                    return (
                      <div
                        key={item._id}
                        className={`bg-white border-2 rounded-xl p-3 cursor-pointer transition-all flex flex-col ${
                          inCart ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-100 hover:border-blue-300 hover:shadow-md'
                        }`}
                        onClick={() => addRetailToCart(item)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">{item.category}</span>
                          <span className="font-black text-gray-800 text-sm">₹{item.priceINR}</span>
                        </div>
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{item.name}</h3>
                        {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
                        {item.barcode && (
                          <p className="text-[10px] font-mono text-gray-300 mt-auto truncate">{item.barcode}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`text-xs font-medium ${item.stock <= item.lowStockAlert ? 'text-red-500' : 'text-green-600'}`}>
                            {item.stock} {item.unit} left
                          </span>
                          {inCart ? (
                            <div className="flex items-center gap-1 bg-blue-600 rounded-lg px-2 py-0.5" onClick={e => e.stopPropagation()}>
                              <button onClick={() => updateQty(item._id, 'retail', -1)} className="text-white"><Minus size={12} /></button>
                              <span className="text-white text-xs font-black w-4 text-center">{inCart.quantity}</span>
                              <button onClick={() => updateQty(item._id, 'retail', 1)} className="text-white"><Plus size={12} /></button>
                            </div>
                          ) : (
                            <button className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition" onClick={e => { e.stopPropagation(); addRetailToCart(item); }}>
                              <Plus size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart & Checkout ─────────────────────────────────────── */}
      <div className="w-full lg:w-[380px] bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden self-start max-h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="bg-maroon text-white p-4 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><ShoppingCart size={18} /> Current Order</h2>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{totalItems} items</span>
            {cart.length > 0 && (
              <button onClick={resetPOS} className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-xs transition">Clear</button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} className="mb-2 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1 text-gray-300">Click items or scan barcode to add</p>
            </div>
          ) : (
            <>
              {/* Menu items */}
              {cart.filter(c => c.type === 'menu').map((c) => (
                <div key={c.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">₹{c.price}{c.variantName ? ` · ${c.variantName}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-200 p-0.5">
                    <button onClick={() => updateQty(c.id, 'menu', -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><Minus size={13} /></button>
                    <span className="text-sm font-bold w-4 text-center">{c.quantity}</span>
                    <button onClick={() => updateQty(c.id, 'menu', 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><Plus size={13} /></button>
                  </div>
                  <div className="w-16 text-right font-bold text-gray-800 text-sm pl-2">₹{c.price * c.quantity}</div>
                </div>
              ))}

              {/* Retail items — visually distinct */}
              {cart.filter(c => c.type === 'retail').length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 border-t border-dashed border-blue-200" />
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><ShoppingBag size={10} /> RETAIL</span>
                    <div className="flex-1 border-t border-dashed border-blue-200" />
                  </div>
                  {cart.filter(c => c.type === 'retail').map((c) => (
                    <div key={c.id} className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
                        <p className="text-xs text-blue-500">₹{c.price} · {c.unit}</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white rounded-lg border border-blue-200 p-0.5">
                        <button onClick={() => updateQty(c.id, 'retail', -1)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Minus size={13} /></button>
                        <span className="text-sm font-bold w-4 text-center">{c.quantity}</span>
                        <button onClick={() => updateQty(c.id, 'retail', 1)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Plus size={13} /></button>
                      </div>
                      <div className="w-16 text-right font-bold text-blue-700 text-sm pl-2">₹{c.price * c.quantity}</div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Checkout Panel */}
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          {/* Totals */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Est. Tax</span><span>₹{gstEstimate.toFixed(2)}</span>
            </div>
            {cart.filter(c => c.type === 'retail').length > 0 && (
              <div className="flex justify-between text-xs text-blue-600 mb-1">
                <span>🛍 Retail ({cart.filter(c => c.type === 'retail').reduce((s, c) => s + c.quantity, 0)} items)</span>
                <span>₹{cart.filter(c => c.type === 'retail').reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)}</span>
              </div>
            )}

            {/* Payment Mode */}
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              {(['CASH', 'UPI', 'CARD'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                    paymentMode === mode
                      ? mode === 'CASH' ? 'bg-green-600 text-white border-green-700'
                        : mode === 'UPI' ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-purple-600 text-white border-purple-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {mode === 'CASH' ? '💵 Cash' : mode === 'UPI' ? '📱 UPI' : '💳 Card'}
                </button>
              ))}
            </div>

            <button
              onClick={handleProceed} disabled={cart.length === 0 || paying}
              className="w-full mt-3 py-4 bg-maroon hover:bg-opacity-90 text-white font-black text-base rounded-xl shadow disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              {paying ? <Loader2 size={20} className="animate-spin" /> : null}
              {paying ? 'Processing...' : `CREATE INVOICE · ₹${subtotal.toFixed(0)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {showCamera && (
        <CameraScanner
          title="Scan Retail Barcode"
          onScan={(barcode) => { handleBarcodeScan(barcode); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Variant Selection Modal */}
      {itemForVariant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Choose Variant</h3>
              <button onClick={() => setItemForVariant(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3">
               {itemForVariant.imageUrls?.[0] || itemForVariant.imageUrl ? (
                 <img src={getMediaUrl(itemForVariant.imageUrls?.[0] || itemForVariant.imageUrl)} alt={itemForVariant.name} className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
               ) : (
                 <div className="w-16 h-16 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300">
                   <ImageIcon size={20} />
                 </div>
               )}
               <div>
                 <p className="font-bold text-gray-800">{itemForVariant.name}</p>
                 {itemForVariant.hindiName && <p className="text-xs text-gray-500">{itemForVariant.hindiName}</p>}
               </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {itemForVariant.variants.map((v: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    addMenuToCart(itemForVariant, idx);
                    setItemForVariant(null);
                  }}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-maroon hover:bg-red-50 transition-all text-left"
                >
                  <span className="font-semibold text-sm text-gray-800">{v.name}</span>
                  <div className="text-right">
                    {v.specialPriceINR && v.specialPriceINR < v.priceINR ? (
                      <>
                        <span className="text-xs text-gray-400 line-through mr-1.5">₹{v.priceINR}</span>
                        <span className="font-bold text-maroon">₹{v.specialPriceINR}</span>
                      </>
                    ) : (
                      <span className="font-bold text-gray-800">₹{v.priceINR}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
