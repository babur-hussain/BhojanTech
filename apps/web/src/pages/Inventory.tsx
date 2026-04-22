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

// ─── Mock Data ────────────────────────────────────────────────────────────────

type EnrichedItem = InventoryItem & { status: StockStatus };

const MOCK_ITEMS: EnrichedItem[] = [
  { id: 'i1', restaurantId:'r1', name:'Paneer', category:'Dairy', unit:'kg', currentQty:4.5, minThreshold:2, reorderQty:10, costPerUnit:280, isActive:true, linkedMenuItems:[], allergenTags:[], status:'HEALTHY', createdAt: new Date(), updatedAt: new Date() } as any,
  { id: 'i2', restaurantId:'r1', name:'Tomatoes', category:'Vegetables', unit:'kg', currentQty:1.2, minThreshold:3, reorderQty:15, costPerUnit:30, isActive:true, linkedMenuItems:[], status:'LOW', createdAt: new Date(), updatedAt: new Date() } as any,
  { id: 'i3', restaurantId:'r1', name:'Cooking Oil (Sunflower)', category:'Oil', unit:'litres', currentQty:0.5, minThreshold:5, reorderQty:20, costPerUnit:110, isActive:true, linkedMenuItems:[], status:'CRITICAL', createdAt: new Date(), updatedAt: new Date() } as any,
  { id: 'i4', restaurantId:'r1', name:'Basmati Rice', category:'Grains', unit:'kg', currentQty:25, minThreshold:10, reorderQty:50, costPerUnit:85, isActive:true, linkedMenuItems:[], status:'HEALTHY', createdAt: new Date(), updatedAt: new Date() } as any,
  { id: 'i5', restaurantId:'r1', name:'Garam Masala', category:'Spices', unit:'grams', currentQty:300, minThreshold:100, reorderQty:500, costPerUnit:0.8, isActive:true, linkedMenuItems:[], status:'HEALTHY', createdAt: new Date(), updatedAt: new Date() } as any,
  { id: 'i6', restaurantId:'r1', name:'Atta (Wheat Flour)', category:'Grains', unit:'kg', currentQty:3, minThreshold:5, reorderQty:25, costPerUnit:40, isActive:true, linkedMenuItems:[], status:'LOW', createdAt: new Date(), updatedAt: new Date() } as any,
  { id: 'i7', restaurantId:'r1', name:'Fresh Cream', category:'Dairy', unit:'litres', currentQty:1.5, minThreshold:1, reorderQty:5, costPerUnit:180, isActive:true, linkedMenuItems:[], status:'HEALTHY', createdAt: new Date(), updatedAt: new Date() } as any,
  { id: 'i8', restaurantId:'r1', name:'Chicken (Boneless)', category:'Proteins', unit:'kg', currentQty:0, minThreshold:5, reorderQty:20, costPerUnit:220, isActive:true, linkedMenuItems:[], status:'CRITICAL', createdAt: new Date(), updatedAt: new Date() } as any,
];

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
  const [items, setItems]             = useState<EnrichedItem[]>(MOCK_ITEMS);
  const [search, setSearch]           = useState('');
  const [categoryFilter, setCat]      = useState('All');
  const [statusFilter, setStatus]     = useState<'ALL'|StockStatus>('ALL');
  const [activeTab, setTab]           = useState<'items'|'suppliers'>('items');

  // Modals
  const [itemModal, setItemModal]     = useState<{ open: boolean; item: EnrichedItem | null }>({ open: false, item: null });
  const [stockModal, setStockModal]   = useState<EnrichedItem | null>(null);
  const [wastageModal, setWaste]      = useState<EnrichedItem | null>(null);
  const [supplierModal, setSupplier]  = useState(false);

  const lowCount      = items.filter(i => i.status === 'LOW').length;
  const criticalCount = items.filter(i => i.status === 'CRITICAL').length;

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = categoryFilter === 'All' || i.category === categoryFilter;
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const handleSaveItem = (data: any) => {
    if (itemModal.item) {
      setItems(prev => prev.map(i => i.id === itemModal.item!.id ? { ...i, ...data } : i));
    } else {
      setItems(prev => [...prev, { ...data, id: Math.random().toString(), status: 'HEALTHY' }]);
    }
    setItemModal({ open: false, item: null });
  };

  const handleAddStock = (itemId: string, qty: number, cpu: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      const newQty = +(i.currentQty + qty).toFixed(3);
      const s: StockStatus = newQty <= 0 ? 'CRITICAL' : newQty <= i.minThreshold ? 'LOW' : 'HEALTHY';
      return { ...i, currentQty: newQty, costPerUnit: cpu, status: s };
    }));
    setStockModal(null);
  };

  const handleWastage = (itemId: string, qty: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      const newQty = Math.max(0, +(i.currentQty - qty).toFixed(3));
      const s: StockStatus = newQty <= 0 ? 'CRITICAL' : newQty <= i.minThreshold ? 'LOW' : 'HEALTHY';
      return { ...i, currentQty: newQty, status: s };
    }));
    setWaste(null);
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
            className="flex items-center gap-2 px-4 py-2 bg-maroon text-white rounded-lg text-sm font-semibold hover:bg-opacity-90"
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
                <div key={item.id}
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
          </div>
        </>
      )}

      {activeTab === 'suppliers' && (
        <SuppliersTab onAdd={() => setSupplier(true)} />
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
          onSave={(qty, cpu) => handleAddStock(stockModal.id, qty, cpu)}
        />
      )}
      {wastageModal && (
        <WastageModal
          item={wastageModal}
          onClose={() => setWaste(null)}
          onSave={(qty) => handleWastage(wastageModal.id, qty)}
        />
      )}
      {supplierModal && (
        <SupplierModal onClose={() => setSupplier(false)} onSave={() => setSupplier(false)} />
      )}
    </div>
  );
}

function SuppliersTab({ onAdd }: { onAdd: () => void }) {
  const MOCK_SUPPLIERS = [
    { id:'s1', name:'Fresh Farms Pvt. Ltd.', contactName:'Ramesh Kumar', phone:'9876543210', email:'ramesh@freshfarms.in', address:'Azadpur Mandi, Delhi' },
    { id:'s2', name:'Spice Garden Traders',  contactName:'Priya Singh',  phone:'8765432109', email:'priya@spicegarden.in',  address:'Khari Baoli, Delhi' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-gray-700">Suppliers ({MOCK_SUPPLIERS.length})</h2>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-maroon text-white rounded-lg text-sm font-semibold hover:bg-opacity-90">
          <Plus size={16}/> Add Supplier
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_SUPPLIERS.map(s => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-1">{s.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{s.contactName}</p>
            <div className="space-y-1.5">
              <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <Phone size={14}/> {s.phone}
              </a>
              <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <Mail size={14}/> {s.email}
              </a>
              <p className="text-xs text-gray-400">{s.address}</p>
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
              <button className="px-3 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-50">
                <Edit2 size={13}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
