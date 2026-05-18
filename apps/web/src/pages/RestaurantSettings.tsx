import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Save, Store, CreditCard, FileText, MapPin, Loader2, CheckCircle, AlertCircle, QrCode, Printer, Wifi, WifiOff, RefreshCw, Settings, BookOpen, Plus, X } from 'lucide-react';
import { useQZTray } from '../hooks/useQZTray';
import { printTestReceipt } from '../utils/thermalPrint';

interface RestaurantForm {
  name: string;
  address: string;
  gstin: string;
  fssaiNumber: string;
  logoUrl: string;
  upiId: string;
  printerName: string;
  businessType: string;
  bookingCategories: string[];
  defaultBookingCategory: string;
}

const INITIAL: RestaurantForm = { 
  name: '', address: '', gstin: '', fssaiNumber: '', logoUrl: '', upiId: '', printerName: '',
  businessType: 'Bakery', bookingCategories: ['Cake Pre-order', 'Sweets Box'], defaultBookingCategory: 'Cake Pre-order'
};

export default function RestaurantSettings() {
  const [form, setForm] = useState<RestaurantForm>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'compliance' | 'payments' | 'bookings'>('general');
  const [newCategory, setNewCategory] = useState('');

  const [qzStatus, setQzStatus] = useState<'checking' | 'connected' | 'disconnected'>('disconnected');
  const [qzTesting, setQzTesting] = useState(false);

  const {
    qzConnected,
    checking: qzChecking,
    printers,
    discovering,
    checkStatus,
    discoverPrinters,
  } = useQZTray();

  useEffect(() => {
    if (qzChecking) setQzStatus('checking');
    else setQzStatus(qzConnected ? 'connected' : 'disconnected');
  }, [qzConnected, qzChecking]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/restaurant/info');
        setForm({
          name: data.name || '',
          address: data.address || '',
          gstin: data.gstin || '',
          fssaiNumber: data.fssaiNumber || '',
          logoUrl: data.logoUrl || '',
          upiId: data.upiId || '',
          printerName: data.printerName || '',
          businessType: data.businessType || 'Bakery',
          bookingCategories: data.bookingCategories?.length ? data.bookingCategories : ['Cake Pre-order', 'Sweets Box'],
          defaultBookingCategory: data.defaultBookingCategory || 'Cake Pre-order',
        });
      } catch {
        showToast('error', 'Failed to load restaurant info');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const testQZConnection = async () => {
    setQzTesting(true);
    try {
      const ok = await checkStatus();
      setQzStatus(ok ? 'connected' : 'disconnected');
      if (ok) {
        await printTestReceipt(form.printerName || null);
        showToast('success', 'Connection successful! Printing test receipt...');
      } else {
        showToast('error', 'QZ Tray is not connected. Make sure it is running.');
      }
    } catch (err: any) {
      showToast('error', 'Connected, but print failed: ' + (err.message || 'Check printer.'));
    } finally {
      setQzTesting(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await api.patch('/restaurant/info', form);
      showToast('success', 'Settings saved successfully!');
    } catch (err: any) {
      showToast('error', err?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (!newCategory.trim() || form.bookingCategories.includes(newCategory.trim())) return;
    setForm(prev => ({
      ...prev,
      bookingCategories: [...prev.bookingCategories, newCategory.trim()]
    }));
    setNewCategory('');
  };

  const removeCategory = (cat: string) => {
    setForm(prev => ({
      ...prev,
      bookingCategories: prev.bookingCategories.filter(c => c !== cat),
      defaultBookingCategory: prev.defaultBookingCategory === cat 
        ? (prev.bookingCategories.filter(c => c !== cat)[0] || '')
        : prev.defaultBookingCategory
    }));
  };

  const upiQrUrl = form.upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${form.upiId}&pn=${form.name}&cu=INR`)}`
    : null;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-maroon" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: <Store size={18} /> },
    { id: 'compliance', label: 'Compliance', icon: <FileText size={18} /> },
    { id: 'payments', label: 'Payments & Printing', icon: <CreditCard size={18} /> },
    { id: 'bookings', label: 'Bookings & Modules', icon: <BookOpen size={18} /> },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 pb-12">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl font-semibold text-white transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="sticky top-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-maroon text-white rounded-xl shadow-sm">
              <Settings size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Global Settings</h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Manage workspace</p>
            </div>
          </div>

          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-maroon shadow-sm border border-gray-100' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <form onSubmit={handleSave} className="space-y-6">
          {/* General Tab */}
          <div className={activeTab === 'general' ? 'block' : 'hidden'}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h2 className="font-bold text-gray-800 text-lg">General Information</h2>
                <p className="text-xs text-gray-500">Your core business identity details.</p>
              </div>
              <div className="p-6 grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Name <span className="text-red-500">*</span></label>
                    <input
                      required type="text" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Saffron Palace"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Type</label>
                    <select
                      value={form.businessType}
                      onChange={e => setForm(f => ({ ...f, businessType: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition bg-white"
                    >
                      <option value="Restaurant">Restaurant</option>
                      <option value="Bakery">Bakery</option>
                      <option value="Sweets Shop">Sweets Shop</option>
                      <option value="Cafe">Cafe</option>
                      <option value="Retail">Retail Store</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><MapPin size={14} /> Address</label>
                  <textarea
                    rows={2} value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Full business address"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Logo URL</label>
                  <input
                    type="url" value={form.logoUrl}
                    onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="https://your-logo.png"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition"
                  />
                  {form.logoUrl && (
                    <div className="mt-3 flex items-center gap-3">
                      <img src={form.logoUrl} alt="Logo preview" className="h-16 w-16 object-contain border rounded-xl p-1 bg-gray-50" />
                      <span className="text-xs text-gray-500 font-medium">Active logo preview</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Tab */}
          <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h2 className="font-bold text-gray-800 text-lg">Tax & Compliance</h2>
                <p className="text-xs text-gray-500">Legal registration details for invoicing.</p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">GSTIN</label>
                  <input
                    type="text" value={form.gstin}
                    onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                    placeholder="22AAAAA0000A1Z5" maxLength={15}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maroon focus:border-transparent transition uppercase"
                  />
                  <p className="text-xs text-gray-400 mt-1">15-character GST Identification Number</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">FSSAI License Number</label>
                  <input
                    type="text" value={form.fssaiNumber}
                    onChange={e => setForm(f => ({ ...f, fssaiNumber: e.target.value }))}
                    placeholder="12345678901234" maxLength={14}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maroon focus:border-transparent transition"
                  />
                  <p className="text-xs text-gray-400 mt-1">14-digit FSSAI food license number</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payments & Printing Tab */}
          <div className={activeTab === 'payments' ? 'block' : 'hidden'}>
            <div className="space-y-6">
              {/* UPI */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2"><QrCode size={18} className="text-maroon"/> Digital Payments</h2>
                  <p className="text-xs text-gray-500">Configure your UPI receiving account.</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">UPI ID / VPA</label>
                    <input
                      type="text" value={form.upiId}
                      onChange={e => setForm(f => ({ ...f, upiId: e.target.value.trim() }))}
                      placeholder="yourrestaurant@upi"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maroon focus:border-transparent transition"
                    />
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      Embedded in thermal receipt QR codes for instant scans.
                    </p>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-800 font-semibold">⚠️ Verify this ID carefully to avoid misdirected payments.</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center border-l pl-8">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Live Preview</p>
                    {upiQrUrl ? (
                      <div className="p-3 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
                        <img src={upiQrUrl} alt="UPI QR" className="w-32 h-32" />
                        <p className="text-center text-xs font-mono text-gray-600 mt-2 truncate w-32">{form.upiId}</p>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400">
                        <QrCode size={32} className="mb-2 opacity-40" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Printing */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Printer size={18} className="text-maroon"/> Receipt Printing</h2>
                  <p className="text-xs text-gray-500">Configure silent thermal printing via QZ Tray.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border ${qzStatus === 'connected' ? 'bg-green-50 border-green-200' : qzStatus === 'checking' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-3 mb-3 md:mb-0">
                      {qzStatus === 'connected' ? <Wifi size={24} className="text-green-600" /> : <WifiOff size={24} className="text-red-500" />}
                      <div>
                        <p className={`font-bold ${qzStatus === 'connected' ? 'text-green-800' : 'text-red-800'}`}>
                          QZ Tray {qzStatus === 'connected' ? 'Connected' : qzStatus === 'checking' ? 'Checking…' : 'Disconnected'}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">Required for background printing.</p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button type="button" onClick={testQZConnection} disabled={qzTesting} className="flex-1 md:flex-none justify-center flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-60">
                        {qzTesting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Test System
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">Target Printer Name</label>
                      <button type="button" onClick={discoverPrinters} disabled={discovering || qzStatus !== 'connected'} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <RefreshCw size={12} className={discovering ? 'animate-spin' : ''} /> Refresh List
                      </button>
                    </div>
                    {printers.length > 0 && (
                      <select
                        value={form.printerName}
                        onChange={e => setForm(f => ({ ...f, printerName: e.target.value }))}
                        className="w-full mb-3 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maroon bg-gray-50 outline-none"
                      >
                        <option value="">— select from detected printers —</option>
                        {printers.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                    <input
                      type="text" value={form.printerName}
                      onChange={e => setForm(f => ({ ...f, printerName: e.target.value }))}
                      placeholder="e.g. EPSON TM-T88V"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maroon outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bookings & Modules Tab */}
          <div className={activeTab === 'bookings' ? 'block' : 'hidden'}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h2 className="font-bold text-gray-800 text-lg">Booking & Reservation Module</h2>
                <p className="text-xs text-gray-500">Customize the booking system for your specific business type.</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Active Booking Categories</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.bookingCategories.map(cat => (
                      <div key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium border border-gray-200">
                        {cat}
                        <button type="button" onClick={() => removeCategory(cat)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                      placeholder="e.g. Custom Cake Order, Wedding Catering"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-maroon outline-none"
                    />
                    <button type="button" onClick={addCategory} className="px-4 py-2 bg-gray-900 text-white font-bold rounded-xl text-sm hover:bg-gray-800 transition-colors flex items-center gap-1.5">
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Default Category for New Bookings</label>
                  <select
                    value={form.defaultBookingCategory}
                    onChange={e => setForm(f => ({ ...f, defaultBookingCategory: e.target.value }))}
                    className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon outline-none bg-white"
                  >
                    {form.bookingCategories.length === 0 && <option value="">No categories available</option>}
                    {form.bookingCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3.5 bg-maroon text-white font-black tracking-wide rounded-xl shadow-lg hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-60"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
