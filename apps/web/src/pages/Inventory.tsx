import React, { useState, useEffect } from 'react';
import { InventoryItem, StockStatus } from '@restaurant/types';
import {
  Plus, Package, AlertTriangle, TrendingDown, Search,
  Download, Edit2, Trash2, RefreshCw, Phone, Mail,
} from 'lucide-react';
import ItemModal from '../components/Inventory/ItemModal';
import AddStockModal from '../components/Inventory/AddStockModal';
import WastageModal from '../components/Inventory/WastageModal';
import SupplierModal from '../components/Inventory/SupplierModal';
import { useBranchStore } from '../store/branchStore';
import { api } from '../utils/api';
import PageLoader from '../components/PageLoader';

type EnrichedItem = InventoryItem & { status: StockStatus, _id: string, id?: string };

const CATEGORIES = ['All', 'Dairy', 'Vegetables', 'Spices', 'Grains', 'Oil', 'Proteins', 'Beverages', 'Other'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockPct(item: EnrichedItem) {
  const max = item.minThreshold * 4; // treat 4× threshold as 100%
  return Math.min(100, Math.round((item.currentQty / Math.max(max, 0.001)) * 100));
}

function barColor(status: StockStatus) {
  if (status === 'HEALTHY') return 'bg-green-500';
  if (status === 'LOW') return 'bg-amber-400';
  return 'bg-red-500';
}

function statusBadge(status: StockStatus) {
  if (status === 'HEALTHY') return 'bg-green-100 text-green-700';
  if (status === 'LOW') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700 animate-pulse';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Inventory() {
  const { selectedBranchId } = useBranchStore();
  const isAllBranches = selectedBranchId === 'all';
  
  const [items, setItems]             = useState<EnrichedItem[]>([]);
  const [suppliers, setSuppliers]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  
  const [search, setSearch]           = useState('');
  const [categoryFilter, setCat]      = useState('All');
  const [statusFilter, setStatus]     = useState<'ALL'|StockStatus>('ALL');
  const [activeTab, setTab]           = useState<'items'|'suppliers'>('items');

  // Modals
  const [itemModal, setItemModal]     = useState<{ open: boolean; item: EnrichedItem | null }>({ open: false, item: null });
  const [stockModal, setStockModal]   = useState<EnrichedItem | null>(null);
  const [wastageModal, setWaste]      = useState<EnrichedItem | null>(null);
  const [supplierModal, setSupplier]  = useState<{ open: boolean; supplier: any | null }>({ open: false, supplier: null });

  const fetchData = async () => {
    try {
      setLoading(true);
      const qs = isAllBranches ? '' : `?branchId=${selectedBranchId}`;
      const [itemsRes, suppliersRes] = await Promise.all([
        api.get(`/inventory/items${qs}`),
        api.get(`/inventory/suppliers${qs}`)
      ]);
      // Normalize ids for the UI
      const fetchedItems = itemsRes.data.map((i: any) => ({ ...i, id: i._id }));
      const fetchedSuppliers = suppliersRes.data.map((s: any) => ({ ...s, id: s._id }));
      setItems(fetchedItems);
      setSuppliers(fetchedSuppliers);
    } catch (e) {
      console.error('Failed to fetch inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranchId]);

  if (loading) {
    return <PageLoader />;
  }

  const lowCount      = items.filter(i => i.status === 'LOW').length;
  const criticalCount = items.filter(i => i.status === 'CRITICAL').length;

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = categoryFilter === 'All' || i.category === categoryFilter;
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const handleSaveItem = async (data: any) => {
    try {
      if (itemModal.item) {
        await api.put(`/inventory/items/${itemModal.item._id}`, data);
      } else {
        await api.post('/inventory/items', data);
      }
      setItemModal({ open: false, item: null });
      fetchData();
    } catch (e) {
      console.error('Failed to save item:', e);
      alert('Failed to save item. Please try again.');
    }
  };

  const handleAddStock = async (itemId: string, qty: number, cpu: number, supplierName?: string, invoiceNumber?: string) => {
    try {
      await api.post('/inventory/stock/add', {
        inventoryItemId: itemId,
        quantityAdded: qty,
        costPerUnit: cpu,
        supplierName,
        invoiceNumber
      });
      setStockModal(null);
      fetchData();
    } catch (e) {
      console.error('Failed to add stock:', e);
      alert('Failed to add stock. Please try again.');
    }
  };

  const handleWastage = async (itemId: string, qty: number, reason?: string, notes?: string) => {
    try {
      await api.post('/inventory/stock/wastage', {
        inventoryItemId: itemId,
        quantity: qty,
        reason: reason || 'Spoilage',
        notes: notes || ''
      });
      setWaste(null);
      fetchData();
    } catch (e: any) {
      console.error('Failed to log wastage:', e);
      alert(e.response?.data?.error || 'Failed to log wastage.');
    }
  };
  
  const handleSaveSupplier = async (data: any) => {
    try {
      if (supplierModal.supplier) {
        await api.put(`/inventory/suppliers/${supplierModal.supplier._id}`, data);
      } else {
        await api.post('/inventory/suppliers', data);
      }
      setSupplier({ open: false, supplier: null });
      fetchData();
    } catch (e) {
      console.error('Failed to save supplier:', e);
      alert('Failed to save supplier. Please try again.');
    }
  };

  const handleReorder = (item: EnrichedItem) => {
    const msg = `Hi, please send ${item.reorderQty} ${item.unit} of ${item.name}. — Saffron Palace Restaurant`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {(lowCount + criticalCount) > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          <AlertTriangle size={20} className="shrink-0" />
          <span className="font-semibold">
            Stock Alert: {criticalCount} critical, {lowCount} low stock items require attention.
          </span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-maroon">Inventory</h1>
          <p className="text-gray-500 text-sm">{items.length} items tracked</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="/api/inventory/reports/purchases"
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download size={15}/> Purchase Report
          </a>
          <a
            href="/api/inventory/reports/wastage"
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download size={15}/> Wastage Report
          </a>
          <button
            onClick={() => setItemModal({ open: true, item: null })}
            disabled={isAllBranches}
            title={isAllBranches ? "Select a specific branch to add items" : ""}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-maroon hover:bg-opacity-90'}`}
          >
            <Plus size={16}/> Add Item
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['items', 'suppliers'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors capitalize ${
              activeTab === t ? 'border-maroon text-maroon' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'items' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search items…"
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-saffron focus:border-saffron"
              />
            </div>
            <select value={categoryFilter} onChange={e => setCat(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron focus:border-saffron">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatus(e.target.value as any)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-saffron focus:border-saffron">
              <option value="ALL">All Status</option>
              <option value="HEALTHY">Healthy</option>
              <option value="LOW">Low</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(item => {
              const pct = stockPct(item);
              return (
                <div key={item._id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{item.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => setItemModal({ open: true, item })}
                        className="p-1.5 text-gray-400 hover:text-maroon hover:bg-red-50 rounded">
                        <Edit2 size={14}/>
                      </button>
                    </div>
                  </div>

                  {/* Stock Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="font-semibold text-gray-700 text-sm">
                        {item.currentQty} <span className="text-gray-400 font-normal">{item.unit}</span>
                      </span>
                      <span>Min: {item.minThreshold} {item.unit}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(item.status)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="text-xs text-gray-500 mb-3">
                    ₹{item.costPerUnit}/{item.unit} · Total: ₹{(item.currentQty * item.costPerUnit).toFixed(0)}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => setStockModal(item)}
                      className="flex-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700">
                      + Add Stock
                    </button>
                    <button onClick={() => setWaste(item)}
                      className="flex-1 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded hover:bg-gray-50 flex items-center justify-center gap-1">
                      <TrendingDown size={12}/> Wastage
                    </button>
                    {item.status !== 'HEALTHY' && (
                      <button onClick={() => handleReorder(item)}
                        className="py-1.5 px-2 bg-amber-100 text-amber-700 text-xs font-semibold rounded hover:bg-amber-200 flex items-center gap-1">
                        <RefreshCw size={12}/> Reorder
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500">
                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                <p>No inventory items found.</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'suppliers' && (
        <SuppliersTab 
          suppliers={suppliers} 
          onAdd={() => setSupplier({ open: true, supplier: null })} 
          onEdit={(s) => setSupplier({ open: true, supplier: s })}
          isAllBranches={isAllBranches} 
        />
      )}

      {/* Modals */}
      {itemModal.open && (
        <ItemModal
          item={itemModal.item}
          onClose={() => setItemModal({ open: false, item: null })}
          onSave={handleSaveItem}
        />
      )}
      {stockModal && (
        <AddStockModal
          item={stockModal}
          onClose={() => setStockModal(null)}
          onSave={(qty, cpu, supplier, inv) => handleAddStock(stockModal._id, qty, cpu, supplier, inv)}
        />
      )}
      {wastageModal && (
        <WastageModal
          item={wastageModal}
          onClose={() => setWaste(null)}
          onSave={(qty, reason, notes) => handleWastage(wastageModal._id, qty, reason, notes)}
        />
      )}
      {supplierModal.open && (
        <SupplierModal 
          supplier={supplierModal.supplier}
          onClose={() => setSupplier({ open: false, supplier: null })} 
          onSave={handleSaveSupplier} 
        />
      )}
    </div>
  );
}

function SuppliersTab({ suppliers, onAdd, onEdit, isAllBranches }: { suppliers: any[], onAdd: () => void, onEdit: (s: any) => void, isAllBranches: boolean }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-gray-700">Suppliers ({suppliers.length})</h2>
        <button onClick={onAdd} disabled={isAllBranches} title={isAllBranches ? "Select a specific branch to add suppliers" : ""} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-maroon hover:bg-opacity-90'}`}>
          <Plus size={16}/> Add Supplier
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.map(s => (
          <div key={s._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-1">{s.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{s.contactName || 'No contact specified'}</p>
            <div className="space-y-1.5">
              {s.phone && (
                <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <Phone size={14}/> {s.phone}
                </a>
              )}
              {s.email && (
                <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <Mail size={14}/> {s.email}
                </a>
              )}
              {s.address && (
                <p className="text-xs text-gray-400">{s.address}</p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <a
                href={`https://wa.me/91${s.phone}?text=${encodeURIComponent('Hi, we need to place a reorder.')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded text-center hover:bg-green-700"
              >
                WhatsApp Reorder
              </a>
              <button onClick={() => onEdit(s)} className="px-3 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-50">
                <Edit2 size={13}/>
              </button>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            <p>No suppliers found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
