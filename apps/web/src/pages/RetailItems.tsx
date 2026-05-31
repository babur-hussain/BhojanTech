import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Plus, Package, AlertTriangle, Search, TrendingDown, TrendingUp,
  Edit2, Trash2, X, Check, ChevronDown, BarChart2, Loader2, Camera, 
  History, ArrowDownToLine, ScanLine, FileText
} from 'lucide-react';
import { api } from '../utils/api';
import CameraScanner from '../components/CameraScanner';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useBranchStore } from '../store/branchStore';

interface RetailItem {
  _id: string;
  name: string;
  description?: string;
  brand?: string;
  category: string;
  priceINR: number;
  costPriceINR?: number;
  mrp?: number;
  taxInclusive: boolean;
  gstSlab: number;
  unit: string;
  stock: number;
  lowStockAlert: number;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  isActive: boolean;
}

const CATEGORIES = ['Beverages', 'Confectionery', 'Snacks', 'Decoration', 'Tobacco', 'Dairy', 'General'];
const UNITS = ['pcs', 'bottle', 'pack', 'box', 'can', 'kg', 'g', 'litre', 'ml'];
const GST_SLABS = [0, 5, 12, 18, 28];

// Category abbreviation map for SKU prefix
const CAT_PREFIX: Record<string, string> = {
  Beverages: 'BEV', Confectionery: 'CNF', Snacks: 'SNK',
  Decoration: 'DEC', Tobacco: 'TBC', Dairy: 'DRY', General: 'GEN',
};

const EMPTY_FORM = {
  name: '', description: '', brand: '', category: 'Beverages',
  priceINR: '', costPriceINR: '', mrp: '', taxInclusive: true, gstSlab: 18,
  unit: 'pcs', stock: '', lowStockAlert: 5, sku: '', barcode: '', hsnCode: ''
};

export default function RetailItems() {
  const [items, setItems] = useState<RetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RetailItem | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [stockModal, setStockModal] = useState<RetailItem | null>(null);
  const [stockDelta, setStockDelta] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [scanTarget, setScanTarget] = useState<'search' | 'form'>('search');
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const { selectedBranchId } = useBranchStore();

  // ── GRN (Goods Received Note) state ─────────────────────────────────────────
  const [grnModal, setGrnModal] = useState<RetailItem | null>(null); // item to receive stock for
  const [grnQty, setGrnQty] = useState('');
  const [grnNote, setGrnNote] = useState('');
  const [grnCostPrice, setGrnCostPrice] = useState('');
  const [grnSaving, setGrnSaving] = useState(false);

  // ── Stock audit log drawer ──────────────────────────────────────────────────
  const [logDrawer, setLogDrawer] = useState<RetailItem | null>(null);
  const [stockLogs, setStockLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  /** Generate the next sequential SKU for a given category */
  const generateNextSKU = React.useCallback((category: string, existingItems = items) => {
    const prefix = CAT_PREFIX[category] || category.slice(0, 3).toUpperCase();
    const existing = existingItems
      .map(i => i.sku || '')
      .filter(s => s.startsWith(prefix + '-'))
      .map(s => parseInt(s.split('-')[1] || '0', 10))
      .filter(n => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}-${String(next).padStart(3, '0')}`;
  }, [items]);

  const handleGlobalScan = React.useCallback((barcode: string) => {
    if (showForm) {
      setForm((prev: any) => ({ ...prev, barcode }));
    } else {
      const existing = items.find(i => i.barcode === barcode && i.isActive);
      if (existing) {
        // ── PRODUCTION: existing barcode → open GRN modal immediately ──────
        setGrnModal(existing);
        setGrnQty('');
        setGrnNote('');
        setGrnCostPrice(existing.costPriceINR != null ? String(existing.costPriceINR) : '');
      } else {
        setForm({ ...EMPTY_FORM, barcode });
        setEditItem(null);
        setShowForm(true);
      }
    }
  }, [showForm, items]);

  useBarcodeScanner(handleGlobalScan, { interceptAll: showForm });

  const fetchItems = React.useCallback(async () => {
    try {
      const res = await api.get('/retail-items');
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    const autoSku = generateNextSKU('Beverages');
    setEditItem(null);
    setSkuManuallyEdited(false);
    setForm({ ...EMPTY_FORM, sku: autoSku });
    setShowForm(true);
  };
  const openEdit = (item: RetailItem) => {
    setEditItem(item);
    setForm({ 
      ...item, 
      priceINR: String(item.priceINR), 
      stock: String(item.stock),
      costPriceINR: item.costPriceINR != null ? String(item.costPriceINR) : '',
      mrp: item.mrp != null ? String(item.mrp) : '',
      description: item.description || '',
      brand: item.brand || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      hsnCode: item.hsnCode || '',
      taxInclusive: item.taxInclusive ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.priceINR) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        priceINR: Number(form.priceINR) || 0,
        stock: form.stock !== '' ? Number(form.stock) : 0,
        costPriceINR: form.costPriceINR ? Number(form.costPriceINR) : undefined,
        mrp: form.mrp ? Number(form.mrp) : undefined,
        lowStockAlert: form.lowStockAlert !== '' ? Number(form.lowStockAlert) : 5,
      };
      if (editItem) {
        await api.patch(`/retail-items/${editItem._id}`, payload);
      } else {
        try {
          await api.post('/retail-items', payload);
        } catch (err: any) {
          if (err?.response?.status === 409 && err.response.data?.existingItem) {
            // ── BARCODE DUPLICATE: close form, open GRN modal ───────────────
            const existing: RetailItem = err.response.data.existingItem;
            setShowForm(false);
            setGrnModal(existing);
            setGrnQty(String(form.stock || ''));
            setGrnNote('Stock received with new item entry');
            setGrnCostPrice(form.costPriceINR || '');
            setSaving(false);
            return;
          }
          throw err;
        }
      }
      await fetchItems();
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  // ── GRN: receive stock for an existing item ──────────────────────────────
  const handleGRN = async () => {
    if (!grnModal || !grnQty || Number(grnQty) <= 0) return;
    try {
      setGrnSaving(true);
      await api.post(`/retail-items/barcode/${grnModal.barcode}/receive`, {
        quantity: Number(grnQty),
        note: grnNote || undefined,
        costPriceINR: grnCostPrice ? Number(grnCostPrice) : undefined,
      });
      await fetchItems();
      setGrnModal(null);
      setGrnQty('');
      setGrnNote('');
      setGrnCostPrice('');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to receive stock');
    } finally {
      setGrnSaving(false);
    }
  };

  // ── Open stock audit log drawer ──────────────────────────────────────────
  const openStockLog = async (item: RetailItem) => {
    setLogDrawer(item);
    setLogsLoading(true);
    try {
      const res = await api.get(`/retail-items/${item._id}/stock-log?limit=50`);
      setStockLogs(res.data.logs || []);
    } catch { setStockLogs([]); }
    finally { setLogsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this item?')) return;
    await api.delete(`/retail-items/${id}`);
    setItems(items.filter(i => i._id !== id));
  };

  const handleAdjustStock = async (type: 'add' | 'remove') => {
    if (!stockModal || !stockDelta) return;
    const delta = type === 'add' ? +stockDelta : -Math.abs(+stockDelta);
    const action = type === 'add' ? 'MANUAL_ADD' : 'MANUAL_REMOVE';
    await api.post(`/retail-items/${stockModal._id}/stock`, { delta, action, note: 'Manual adjustment from RetailItems page' });
    await fetchItems();
    setStockModal(null);
    setStockDelta('');
  };

  const filtered = items.filter(i =>
    i.isActive &&
    (filterCat === 'all' || i.category === filterCat) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.barcode?.includes(search))
  );

  const lowStock = items.filter(i => i.isActive && i.stock <= i.lowStockAlert);
  const categories = [...new Set(items.map(i => i.category))];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-maroon" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ShoppingBag className="text-maroon" size={28} /> Retail Items
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage retail stock — chocolates, cold drinks, candles, sparkles & more</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-maroon text-white rounded-xl font-bold shadow hover:bg-opacity-90 transition active:scale-95">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
            <AlertTriangle size={16} /> Low Stock Alert ({lowStock.length} items)
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(item => (
              <span key={item._id} className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full">
                {item.name} — {item.stock} {item.unit} left
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: items.filter(i => i.isActive).length, icon: Package, color: 'bg-blue-50 text-blue-600' },
          { label: 'Low Stock', value: lowStock.length, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
          { label: 'Categories', value: categories.length, icon: BarChart2, color: 'bg-purple-50 text-purple-600' },
          {
            label: 'Stock Value', 
            value: `₹${items.filter(i => i.isActive).reduce((s, i) => s + i.stock * i.priceINR, 0).toLocaleString('en-IN')}`,
            icon: TrendingUp, color: 'bg-green-50 text-green-600'
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-black text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search items by name or barcode..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-maroon focus:border-transparent"
            />
          </div>
          <button 
            onClick={() => { setScanTarget('search'); setShowCamera(true); }}
            className="px-4 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition flex items-center justify-center shadow-sm"
            title="Scan with Camera"
          >
            <Camera size={18} />
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCat('all')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterCat === 'all' ? 'bg-maroon text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            All
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterCat === cat ? 'bg-maroon text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">GST</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No items found. Click "Add Item" to get started.</td></tr>
            ) : filtered.map(item => (
              <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  {item.barcode && <p className="text-xs text-gray-400 font-mono">{item.barcode}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">{item.category}</span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-800">₹{item.priceINR}</td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full">{item.gstSlab}%</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-bold ${item.stock <= item.lowStockAlert ? 'text-red-600' : 'text-green-600'}`}>
                    {item.stock} {item.unit}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => { setStockModal(item); setStockDelta(''); }}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Adjust Stock"
                    >
                      <TrendingDown size={15} />
                    </button>
                    <button onClick={() => openStockLog(item)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Stock Audit Log">
                      <History size={15} />
                    </button>
                    <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 className="text-xl font-black text-gray-800">{editItem ? 'Edit Retail Item' : 'Add Retail Item'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span> 
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Item Name *</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pepsi 500ml" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional details..." rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Category</label>
                    <select
                      value={form.category}
                      onChange={e => {
                        const newCat = e.target.value;
                        setForm((f: any) => ({
                          ...f,
                          category: newCat,
                          // Only auto-update SKU if not manually edited
                          sku: (!editItem && !skuManuallyEdited) ? generateNextSKU(newCat) : f.sku,
                        }));
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all bg-white"
                    >
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Brand</label>
                    <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g. PepsiCo" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Pricing & Taxes */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">2</span> 
                  Pricing & Taxes
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Selling Price (₹) *</label>
                    <input type="number" value={form.priceINR} onChange={e => setForm({ ...form, priceINR: e.target.value })} placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Cost Price (₹)</label>
                    <input type="number" value={form.costPriceINR} onChange={e => setForm({ ...form, costPriceINR: e.target.value })} placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">MRP (₹)</label>
                    <input type="number" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">GST Slab</label>
                    <select value={form.gstSlab} onChange={e => setForm({ ...form, gstSlab: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all bg-white">
                      {GST_SLABS.map(s => <option key={s} value={s}>{s}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">HSN Code</label>
                    <input value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} placeholder="e.g. 2202" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                  </div>
                  <div className="flex items-center mt-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={form.taxInclusive} onChange={e => setForm({ ...form, taxInclusive: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-maroon focus:ring-maroon transition-all" />
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">Selling price is inclusive of tax</span>
                    </label>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Inventory & Tracking */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">3</span> 
                  Inventory & Tracking
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU (Stock Keeping Unit)</label>
                      {!editItem && (
                        <button
                          type="button"
                          onClick={() => { setForm((f: any) => ({ ...f, sku: generateNextSKU(f.category) })); setSkuManuallyEdited(false); }}
                          className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 hover:bg-blue-100 transition"
                          title="Re-generate SKU"
                        >
                          ↺ Auto-generate
                        </button>
                      )}
                    </div>
                    <input
                      value={form.sku}
                      onChange={e => { setSkuManuallyEdited(true); setForm({ ...form, sku: e.target.value }); }}
                      placeholder="e.g. BEV-001"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all font-mono"
                    />
                    {!editItem && !skuManuallyEdited && form.sku && (
                      <p className="text-[10px] text-blue-500 mt-1">Auto-generated • type to override</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Barcode / UPC / EAN</label>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Scanner Active
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={form.barcode}
                        onChange={e => setForm({ ...form, barcode: e.target.value })}
                        placeholder="Scan barcode or type manually"
                        className="flex-1 border-2 border-green-300 bg-green-50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all font-mono"
                        readOnly
                      />
                      <button 
                        onClick={() => { setScanTarget('form'); setShowCamera(true); }}
                        className="px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition flex items-center justify-center bg-white shadow-sm"
                        title="Scan with Camera"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                    {form.barcode && (
                      <p className="text-xs text-green-600 font-mono mt-1">✓ {form.barcode}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Unit</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all bg-white">
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                      {editItem ? 'Stock (Current Level)' : 'Initial Stock Level'}
                      {editItem && <span className="ml-2 text-[10px] text-amber-600 font-normal normal-case">⚠ changing this logs a stock correction</span>}
                    </label>
                    <input
                      type="number" min="0"
                      value={form.stock}
                      onChange={e => setForm({ ...form, stock: e.target.value })}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all bg-gray-50"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Low Stock Alert Level</label>
                    <input type="number" value={form.lowStockAlert} onChange={e => setForm({ ...form, lowStockAlert: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex gap-3 justify-end bg-gray-50 shrink-0 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-maroon text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-90 disabled:opacity-50 transition-all">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {editItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-black text-gray-800">Adjust Stock — {stockModal.name}</h2>
              <button onClick={() => setStockModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-gray-800">{stockModal.stock} <span className="text-base text-gray-400 font-normal">{stockModal.unit}</span></p>
                <p className="text-xs text-gray-400 mt-1">Current Stock</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Quantity</label>
                <input
                  type="number" min="1"
                  value={stockDelta} onChange={e => setStockDelta(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 text-center text-xl font-bold focus:ring-2 focus:ring-maroon"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleAdjustStock('add')} disabled={!stockDelta} className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold disabled:opacity-40 hover:bg-green-700 transition">
                  <TrendingUp size={16} /> Add Stock
                </button>
                <button onClick={() => handleAdjustStock('remove')} disabled={!stockDelta} className="flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-40 hover:bg-red-700 transition">
                  <TrendingDown size={16} /> Remove Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {showCamera && (
        <CameraScanner 
          title={scanTarget === 'form' ? 'Scan to Add' : 'Scan to Search'}
          onScan={(barcode) => {
            if (scanTarget === 'form') {
              setForm({ ...form, barcode });
            } else {
              const existing = items.find(i => i.barcode === barcode && i.isActive);
              if (existing) {
                // Open GRN modal instead of just searching
                setGrnModal(existing);
                setGrnQty('');
                setGrnNote('');
                setGrnCostPrice(existing.costPriceINR != null ? String(existing.costPriceINR) : '');
              } else {
                setForm({ ...EMPTY_FORM, barcode });
                setEditItem(null);
                setShowForm(true);
              }
            }
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* ── GRN Modal (Stock Receive) ───────────────────────────────────────── */}
      {grnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setGrnModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownToLine size={20} />
                <div>
                  <h2 className="font-black text-lg">Stock Receive (GRN)</h2>
                  <p className="text-emerald-100 text-xs">Goods Received Note</p>
                </div>
              </div>
              <button onClick={() => setGrnModal(null)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Item Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black text-gray-900 text-base">{grnModal.name}</p>
                    {grnModal.brand && <p className="text-xs text-gray-500">{grnModal.brand}</p>}
                    <p className="text-xs text-gray-400 mt-1 font-mono">{grnModal.barcode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Current Stock</p>
                    <p className={`text-2xl font-black ${grnModal.stock <= grnModal.lowStockAlert ? 'text-red-600' : 'text-emerald-700'}`}>
                      {grnModal.stock} <span className="text-sm font-normal text-gray-400">{grnModal.unit}</span>
                    </p>
                  </div>
                </div>
                {grnModal.stock <= grnModal.lowStockAlert && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    <AlertTriangle size={12} /> Low stock alert — receiving is required
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Quantity Received <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="1" autoFocus
                  value={grnQty} onChange={e => setGrnQty(e.target.value)}
                  className="w-full border-2 border-emerald-300 focus:border-emerald-500 rounded-xl px-4 py-3 text-2xl font-black text-center focus:outline-none focus:ring-0 transition"
                  placeholder="0"
                />
                {grnQty && Number(grnQty) > 0 && (
                  <p className="text-center text-xs text-emerald-700 mt-1.5 font-semibold">
                    New stock: {grnModal.stock} + {grnQty} = <span className="font-black">{grnModal.stock + Number(grnQty)} {grnModal.unit}</span>
                  </p>
                )}
              </div>

              {/* Cost Price (optional update) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Purchase/Cost Price (₹) <span className="text-gray-400 font-normal text-xs">optional — updates cost for margin calc</span>
                </label>
                <input
                  type="number" min="0"
                  value={grnCostPrice} onChange={e => setGrnCostPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  placeholder={grnModal.costPriceINR ? String(grnModal.costPriceINR) : 'Enter purchase price'}
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Note / Supplier / PO Reference</label>
                <input
                  type="text"
                  value={grnNote} onChange={e => setGrnNote(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  placeholder="e.g. Supplier: ABC Foods, Invoice #INV-001"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setGrnModal(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button
                  onClick={handleGRN}
                  disabled={!grnQty || Number(grnQty) <= 0 || grnSaving}
                  className="flex-2 flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 disabled:opacity-40 transition flex items-center justify-center gap-2"
                >
                  {grnSaving ? <Loader2 size={18} className="animate-spin" /> : <ArrowDownToLine size={18} />}
                  {grnSaving ? 'Saving…' : 'Confirm Receipt'}
                </button>
              </div>

              {/* View Log link */}
              <button
                onClick={() => { setGrnModal(null); openStockLog(grnModal); }}
                className="w-full text-center text-xs text-emerald-600 hover:underline flex items-center justify-center gap-1"
              >
                <History size={12} /> View full stock log for this item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Audit Log Drawer ─────────────────────────────────────────────── */}
      {logDrawer && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setLogDrawer(null)}>
          <div className="flex-1" />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col h-full" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <History size={18} />
                  <h2 className="font-black">Stock Audit Log</h2>
                </div>
                <p className="text-gray-400 text-xs mt-0.5">{logDrawer.name} · {logDrawer.sku}</p>
              </div>
              <button onClick={() => setLogDrawer(null)} className="p-2 hover:bg-white/10 rounded-lg"><X size={18} /></button>
            </div>

            {/* Current Stock Summary */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">Current Stock</span>
              <span className="text-xl font-black text-gray-900">{logDrawer.stock} {logDrawer.unit}</span>
            </div>

            {/* Log Entries */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
              ) : stockLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                  <FileText size={36} className="text-gray-200" />
                  <p className="font-semibold text-sm">No stock movements yet</p>
                </div>
              ) : (
                stockLogs.map((log: any) => {
                  const ACTION_COLORS: Record<string, string> = {
                    GRN: 'bg-emerald-100 text-emerald-800',
                    INITIAL: 'bg-blue-100 text-blue-800',
                    MANUAL_ADD: 'bg-green-100 text-green-800',
                    MANUAL_REMOVE: 'bg-red-100 text-red-700',
                    SALE: 'bg-orange-100 text-orange-700',
                    WASTAGE: 'bg-gray-100 text-gray-600',
                    CORRECTION: 'bg-purple-100 text-purple-700',
                  };
                  const isPositive = log.quantityChanged > 0;
                  return (
                    <div key={log._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                            {log.action.replace('_', ' ')}
                          </span>
                          <span className={`font-black text-base ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{log.quantityChanged}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                          <p className="text-gray-400">Before</p>
                          <p className="font-bold text-gray-700">{log.quantityBefore}</p>
                        </div>
                        <div className={`rounded-lg px-2 py-1.5 text-center ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          <p className={isPositive ? 'text-emerald-500' : 'text-red-400'}>Change</p>
                          <p className={`font-black ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>{isPositive ? '+' : ''}{log.quantityChanged}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                          <p className="text-gray-400">After</p>
                          <p className="font-bold text-gray-700">{log.quantityAfter}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-600">{log.userName}</span>
                          <span>·</span>
                          <span>{log.userRole}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ScanLine size={10} />
                          <span className="font-mono">{log.deviceIp}</span>
                        </div>
                      </div>
                      {log.note && (
                        <p className="text-xs text-gray-500 mt-1.5 italic bg-gray-50 rounded px-2 py-1">📝 {log.note}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

