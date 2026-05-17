import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Plus, Package, AlertTriangle, Search, TrendingDown, TrendingUp,
  Edit2, Trash2, X, Check, ChevronDown, BarChart2, Loader2, Camera
} from 'lucide-react';
import { api } from '../utils/api';
import CameraScanner from '../components/CameraScanner';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

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

  const handleGlobalScan = React.useCallback((barcode: string) => {
    if (showForm) {
      setForm((prev: any) => ({ ...prev, barcode }));
    } else {
      const existing = items.find(i => i.barcode === barcode);
      if (existing) {
        setSearch(barcode);
      } else {
        setForm({ ...EMPTY_FORM, barcode });
        setEditItem(null);
        setShowForm(true);
      }
    }
  }, [showForm, items]);

  useBarcodeScanner(handleGlobalScan);

  const fetchItems = async () => {
    try {
      const res = await api.get('/retail-items');
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true); };
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
        priceINR: +form.priceINR, 
        stock: +form.stock || 0,
        costPriceINR: form.costPriceINR ? +form.costPriceINR : undefined,
        mrp: form.mrp ? +form.mrp : undefined,
        lowStockAlert: +form.lowStockAlert || 5,
      };
      if (editItem) {
        await api.patch(`/retail-items/${editItem._id}`, payload);
      } else {
        await api.post('/retail-items', payload);
      }
      await fetchItems();
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this item?')) return;
    await api.delete(`/retail-items/${id}`);
    setItems(items.filter(i => i._id !== id));
  };

  const handleAdjustStock = async (type: 'add' | 'remove') => {
    if (!stockModal || !stockDelta) return;
    const delta = type === 'add' ? +stockDelta : -Math.abs(+stockDelta);
    await api.post(`/retail-items/${stockModal._id}/stock`, { delta });
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
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all bg-white">
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
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">SKU (Stock Keeping Unit)</label>
                    <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. P500-BEV" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Barcode / UPC / EAN</label>
                    <div className="flex gap-2">
                      <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or type" className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                      <button 
                        onClick={() => { setScanTarget('form'); setShowCamera(true); }}
                        className="px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition flex items-center justify-center bg-white shadow-sm"
                        title="Scan with Camera"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Unit</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all bg-white">
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Low Stock Alert Level</label>
                    <input type="number" value={form.lowStockAlert} onChange={e => setForm({ ...form, lowStockAlert: +e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Initial Stock Level</label>
                    <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-maroon focus:border-transparent transition-all bg-gray-50" />
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
              const existing = items.find(i => i.barcode === barcode);
              if (existing) {
                setSearch(barcode);
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
    </div>
  );
}
