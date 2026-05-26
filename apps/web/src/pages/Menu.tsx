import React, { useState, useEffect } from 'react';
import { MenuCategory, MenuItem, ItemVariant } from '@restaurant/types';
import { Plus, GripVertical, Image as ImageIcon, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import ItemModal from '../components/Menu/ItemModal';
import CategoryModal from '../components/Menu/CategoryModal';
import MenuIntelligenceModal from '../components/AI/MenuIntelligence';
import { useBranchStore } from '../store/branchStore';

export default function MenuManagement() {
  const { user, accessToken } = useAuth();
  const { selectedBranchId: branchStoreId } = useBranchStore();
  const isAllBranches = branchStoreId === 'all';
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  const fetchData = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items')
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
    } catch (e) {
      console.error('Failed to load menu', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branchStoreId]);

  const handleToggleCategory = async (id: string, current: boolean) => {
    try {
      setCategories(categories.map(c => (c as any)._id === id || c.id === id ? { ...c, isAvailable: !current } : c));
      await api.patch(`/menu/categories/${id}/availability`, { isAvailable: !current });
    } catch (e) {
      console.error(e);
      fetchData(); // Revert on failure
    }
  };

  const handleToggleItem = async (id: string, current: boolean) => {
    try {
      setItems(items.map(i => (i as any)._id === id || i.id === id ? { ...i, isAvailable: !current } : i));
      await api.patch(`/menu/items/${id}/availability`, { isAvailable: !current });
    } catch (e) {
      console.error(e);
      fetchData(); // Revert on failure
    }
  };

  const filteredItems = selectedCategoryId
    ? items.filter(i => i.categoryId === selectedCategoryId)
    : items;

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel: Categories */}
      <div className="w-1/4 bg-white rounded-lg shadow border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-cream">
          <h2 className="text-lg font-bold text-maroon">Categories</h2>
          <button
            onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}
            disabled={isAllBranches}
            title={isAllBranches ? "Select a specific branch to add categories" : ""}
            className={`p-1 rounded text-white ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-saffron hover:bg-opacity-90'}`}
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {categories.map(cat => (
            <div
              key={(cat as any)._id || cat.id}
              className={`flex items-center justify-between p-3 mb-2 rounded cursor-pointer border-l-4 ${selectedCategoryId === ((cat as any)._id || cat.id) ? 'bg-orange-50 border-saffron' : 'bg-gray-50 border-transparent hover:bg-gray-100'
                }`}
              onClick={() => setSelectedCategoryId((cat as any)._id || cat.id)}
            >
              <div className="flex items-center">
                <GripVertical size={16} className="text-gray-400 mr-2 cursor-grab" />
                <span className="font-medium text-gray-800">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setIsCategoryModalOpen(true); }}
                  className="text-xs px-2 py-1 text-saffron border border-saffron rounded hover:bg-orange-50 mr-2"
                >
                  Edit
                </button>
                <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" className="sr-only peer" checked={cat.isAvailable} onChange={() => handleToggleCategory((cat as any)._id || cat.id, cat.isAvailable)} />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Items */}
      <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-cream">
          <h2 className="text-lg font-bold text-maroon">
            {selectedCategoryId ? categories.find(c => ((c as any)._id || c.id) === selectedCategoryId)?.name : 'All Items'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded border border-[#F47E3E] text-[#F47E3E] font-medium hover:bg-orange-50"
            >
              <Sparkles size={16} /> AI Menu Suggestions
            </button>
            <button
              onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}
              disabled={isAllBranches}
              title={isAllBranches ? "Select a specific branch to add items" : ""}
              className={`flex items-center gap-2 px-4 py-2 rounded text-white font-medium ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-maroon hover:bg-opacity-90'}`}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div key={(item as any)._id || item.id} className={`border rounded-lg p-4 flex flex-col ${!item.isAvailable ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {/* Veg/Non-veg indicator */}
                    <div className={`w-4 h-4 border-2 flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                    </div>
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={item.isAvailable} onChange={() => handleToggleItem((item as any)._id || item.id, item.isAvailable)} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
                {item.hindiName && <p className="text-sm text-gray-500 mb-2">{item.hindiName}</p>}

                {item.imageUrls?.[0] || item.imageUrl ? (
                  <img src={item.imageUrls?.[0] || item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded mb-2" />
                ) : (
                  <div className="w-full h-32 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400">
                    <ImageIcon size={32} />
                  </div>
                )}

                <div className="mt-auto">
                  <div className="flex gap-1 mb-2">
                    {item.zomatoItemId && <span className="bg-red-100 text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-widest">ZOMATO</span>}
                    {item.swiggyItemId && <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-widest">SWIGGY</span>}
                    {item.ondcItemId && <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-widest">ONDC</span>}
                  </div>
                  <div className="text-sm font-medium text-maroon mb-2 flex items-center gap-1">
                    {item.variants.length === 1 ? (
                      <>
                        {item.variants[0].specialPriceINR && (
                          <span className="text-xs text-gray-400 line-through">₹{item.variants[0].priceINR}</span>
                        )}
                        <span>₹{item.variants[0].specialPriceINR || item.variants[0].priceINR}</span>
                      </>
                    ) : (
                      `₹${Math.min(...item.variants.map(v => v.specialPriceINR || v.priceINR))} - ₹${Math.max(...item.variants.map(v => v.specialPriceINR || v.priceINR))}`
                    )}
                  </div>
                  <button
                    onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }}
                    className="w-full py-1 text-sm border border-maroon text-maroon rounded hover:bg-maroon hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isItemModalOpen && (
        <ItemModal
          item={editingItem}
          categories={categories}
          initialCategoryId={selectedCategoryId}
          onClose={() => setIsItemModalOpen(false)}
          onSave={async (item) => {
            try {
              if (editingItem) {
                await api.put(`/menu/items/${(editingItem as any)._id || editingItem.id}`, item);
              } else {
                await api.post('/menu/items', item);
              }
              fetchData();
              setIsItemModalOpen(false);
            } catch (e: any) {
              console.error('Failed to save item', e);
              alert(e?.response?.data?.error || 'Failed to save item. Please try again.');
            }
          }}
          onDelete={async (item) => {
            if (!confirm('Are you sure you want to delete this item?')) return;
            try {
              await api.delete(`/menu/items/${(item as any)._id || item.id}`);
              fetchData();
              setIsItemModalOpen(false);
            } catch (e: any) {
              console.error('Failed to delete item', e);
              alert(e?.response?.data?.error || 'Failed to delete item. Please try again.');
            }
          }}
        />
      )}
      {isCategoryModalOpen && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setIsCategoryModalOpen(false)}
          onSave={async (cat) => {
            try {
              if (editingCategory) {
                await api.put(`/menu/categories/${(editingCategory as any)._id || editingCategory.id}`, cat);
              } else {
                await api.post('/menu/categories', cat);
              }
              fetchData();
              setIsCategoryModalOpen(false);
            } catch (e: any) {
              console.error('Failed to save category', e);
              alert(e?.response?.data?.error || 'Failed to save category. Please try again.');
            }
          }}
          onDelete={async (cat) => {
            if (!confirm('Are you sure you want to delete this category?')) return;
            try {
              await api.delete(`/menu/categories/${(cat as any)._id || cat.id}`);
              fetchData();
              setIsCategoryModalOpen(false);
            } catch (e: any) {
              console.error('Failed to delete category', e);
              alert(e?.response?.data?.error || 'Failed to delete category. Please try again.');
            }
          }}
        />
      )}
      {isAIModalOpen && (
        <MenuIntelligenceModal
          onClose={() => setIsAIModalOpen(false)}
          restaurantId="64abcd1234567890abcd1234" // Dummy ID matching FloatingChatWidget for dev
        />
      )}
    </div>
  );
}
