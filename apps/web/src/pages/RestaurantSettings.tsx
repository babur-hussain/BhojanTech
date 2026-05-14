import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Save, Store, CreditCard, FileText, MapPin, Loader2, CheckCircle, AlertCircle, QrCode, Printer, Wifi, WifiOff, RefreshCw } from 'lucide-react';
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
}

const INITIAL: RestaurantForm = { name: '', address: '', gstin: '', fssaiNumber: '', logoUrl: '', upiId: '', printerName: '' };

export default function RestaurantSettings() {
  const [form, setForm] = useState<RestaurantForm>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
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

  // Keep local qzStatus in sync with hook
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
        // Test connection worked! Let's print a physical test slip.
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl font-semibold text-white transition-all duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2.5 bg-maroon/10 rounded-xl">
          <Store size={22} className="text-maroon" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Restaurant Settings</h1>
          <p className="text-sm text-gray-500">Manage your restaurant profile, tax details, and payment settings</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Basic Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <Store size={16} className="text-maroon" />
            <h2 className="font-bold text-gray-800">Basic Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Restaurant Name <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Saffron Palace"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><MapPin size={13} /> Address</label>
              <textarea
                rows={2}
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Full restaurant address"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Logo URL</label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://your-logo.png"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition"
              />
            </div>
            {form.logoUrl && (
              <div className="flex items-center gap-3">
                <img src={form.logoUrl} alt="Logo preview" className="h-16 w-16 object-contain border rounded-xl p-1 bg-gray-50" />
                <span className="text-xs text-gray-500">Logo preview</span>
              </div>
            )}
          </div>
        </div>

        {/* Tax & Compliance Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <FileText size={16} className="text-maroon" />
            <h2 className="font-bold text-gray-800">Tax & Compliance</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">GSTIN</label>
              <input
                type="text"
                value={form.gstin}
                onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maroon focus:border-transparent transition uppercase"
              />
              <p className="text-xs text-gray-400 mt-1">15-character GST Identification Number</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">FSSAI License Number</label>
              <input
                type="text"
                value={form.fssaiNumber}
                onChange={e => setForm(f => ({ ...f, fssaiNumber: e.target.value }))}
                placeholder="12345678901234"
                maxLength={14}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maroon focus:border-transparent transition"
              />
              <p className="text-xs text-gray-400 mt-1">14-digit FSSAI food license number</p>
            </div>
          </div>
        </div>

        {/* UPI Payment Settings Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <QrCode size={16} className="text-maroon" />
            <h2 className="font-bold text-gray-800">UPI Payment Settings</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <CreditCard size={13} /> UPI ID / VPA
                </label>
                <input
                  type="text"
                  value={form.upiId}
                  onChange={e => setForm(f => ({ ...f, upiId: e.target.value.trim() }))}
                  placeholder="yourrestaurant@upi"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maroon focus:border-transparent transition"
                />
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  This UPI ID will be embedded in the QR code printed on every thermal receipt, allowing customers to scan and pay instantly.
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium">⚠️ Important: Verify this UPI ID is correct before saving. Incorrect IDs will misdirect payments.</p>
                </div>
              </div>

              {/* Live QR Preview */}
              <div className="flex flex-col items-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Live QR Preview</p>
                {upiQrUrl ? (
                  <div className="p-3 bg-white border-2 border-gray-200 rounded-2xl shadow-inner">
                    <img src={upiQrUrl} alt="UPI QR Code" className="w-40 h-40" />
                    <p className="text-center text-xs font-mono text-gray-600 mt-2 break-all">{form.upiId}</p>
                    <p className="text-center text-[10px] text-gray-400 mt-1">Scan to pay via any UPI app</p>
                  </div>
                ) : (
                  <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400">
                    <QrCode size={36} className="mb-2 opacity-40" />
                    <p className="text-xs text-center px-4">Enter a UPI ID to preview QR</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Printer Settings Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
            <Printer size={16} className="text-maroon" />
            <h2 className="font-bold text-gray-800">Thermal Printer (QZ Tray)</h2>
          </div>
          <div className="p-6 space-y-5">

            {/* QZ Tray Status Banner */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${qzStatus === 'connected' ? 'bg-green-50 border-green-200' : qzStatus === 'checking' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                {qzStatus === 'connected' ? <Wifi size={20} className="text-green-600" /> : <WifiOff size={20} className="text-gray-400" />}
                <div>
                  <p className={`font-bold text-sm ${qzStatus === 'connected' ? 'text-green-800' : 'text-gray-600'}`}>
                    QZ Tray {qzStatus === 'connected' ? 'Connected ✅' : qzStatus === 'checking' ? 'Checking…' : 'Not detected'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {qzStatus === 'connected'
                      ? 'Ready for silent/dialog-free printing'
                      : 'Install QZ Tray for direct thermal printing without dialogs'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href="/override.crt"
                  download="override.crt"
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <FileText size={14} /> Download Certificate
                </a>
                <button
                  type="button"
                  onClick={testQZConnection}
                  disabled={qzTesting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {qzTesting ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                  Test Connection
                </button>
              </div>
            </div>

                        {/* Printer Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Printer Name (exact)</label>
                <button
                  type="button"
                  onClick={async () => {
                    const list = await discoverPrinters();
                    if (list.length === 0) alert('No printers found. Make sure QZ Tray is running and printers are installed.');
                  }}
                  disabled={discovering || qzStatus !== 'connected'}
                  title={qzStatus !== 'connected' ? 'Connect QZ Tray first' : 'Discover printers via QZ Tray'}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {discovering ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Discover Printers
                </button>
              </div>

              {/* Dropdown of discovered printers */}
              {printers.length > 0 && (
                <div className="mb-2">
                  <select
                    value={form.printerName}
                    onChange={e => setForm(f => ({ ...f, printerName: e.target.value }))}
                    className="w-full border border-green-300 bg-green-50 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                  >
                    <option value="">— select a printer —</option>
                    {printers.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <p className="text-xs text-green-700 mt-1">✅ {printers.length} printer{printers.length !== 1 ? 's' : ''} found via QZ Tray. Select one above or type manually below.</p>
                </div>
              )}

              <input
                type="text"
                value={form.printerName}
                onChange={e => setForm(f => ({ ...f, printerName: e.target.value }))}
                placeholder="e.g. EPSON TM-T88V, Star TSP143, Posiflex PP-8000"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-maroon focus:border-transparent transition"
              />
              <p className="text-xs text-gray-400 mt-2">
                Must match exactly what Windows/macOS shows in <strong>Printers &amp; Scanners</strong>.
                QZ Tray uses this name to route print jobs to the correct device.
              </p>
            </div>

            {/* How to find printer name guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">How to find your printer name</p>
              <div className="text-xs text-blue-900 space-y-1">
                <p>🍎 <strong>macOS:</strong> System Settings → Printers &amp; Scanners → click your printer → copy the exact name</p>
                <p>🪟 <strong>Windows:</strong> Settings → Bluetooth &amp; devices → Printers &amp; scanners → your printer's name</p>
                <p>📥 <strong>QZ Tray download:</strong> <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="underline font-semibold">qz.io/download</a> (free, open-source)</p>
              </div>
            </div>

          </div>
        </div>

        {/* Save Button */}

        <div className="flex justify-end pb-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2.5 px-8 py-3 bg-maroon text-white font-bold rounded-xl shadow-lg hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>
    </div>
  );
}
