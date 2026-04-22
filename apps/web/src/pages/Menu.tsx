import React, { useState, useEffect } from 'react';
import { MenuCategory, MenuItem, ItemVariant } from '@restaurant/types';
import { Plus, GripVertical, Image as ImageIcon, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
// import { io } from 'socket.io-client'; // Assuming configured somewhere
import ItemModal from '../components/Menu/ItemModal';
import CategoryModal from '../components/Menu/CategoryModal';
import MenuIntelligenceModal from '../components/AI/MenuIntelligence';

export default function MenuManagement() {
  const { user, accessToken } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Mock initial data fetch
  useEffect(() => {
    // In real app, fetch /api/menu/categories and /api/menu/items
    setCategories([
      { id: '1', restaurantId: 'r1', name: 'Starters', order: 0, isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '2', restaurantId: 'r1', name: 'Main Course', order: 1, isAvailable: true, createdAt: new Date(), updatedAt: new Date() }
    ]);
    setItems([
      {
        id: 'i1', restaurantId: 'r1', categoryId: '1', name: 'Paneer Tikka', hindiName: 'पनीर टिक्का',
        isVeg: true, variants: [{ name: 'Half', priceINR: 150 }, { name: 'Full', priceINR: 280 }],
        gstSlab: 5, isAvailable: true, allergenTags: ['Dairy'], zomatoItemId: 'z123', swiggyItemId: 's123', isAvailableOnline: true, isBestseller: false, isChefSpecial: false, createdAt: new Date(), updatedAt: new Date()
      },
      {
        id: 'i2', restaurantId: 'r1', categoryId: '2', name: 'Butter Chicken', hindiName: 'बटर चिकन',
        isVeg: false, variants: [{ name: 'Half', priceINR: 350 }, { name: 'Full', priceINR: 600 }],
        gstSlab: 5, isAvailable: false, allergenTags: ['Dairy'], ondcItemId: 'o123', isAvailableOnline: true, isBestseller: false, isChefSpecial: false, createdAt: new Date(), updatedAt: new Date()
      }
    ]);
  }, []);

  const handleToggleCategory = (id: string, current: boolean) => {
    setCategories(categories.map(c => c.id === id ? { ...c, isAvailable: !current } : c));
    // Emit API call
  };

  const handleToggleItem = (id: string, current: boolean) => {
    setItems(items.map(i => i.id === id ? { ...i, isAvailable: !current } : i));
    // Emit API call
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
            onClick={() => setIsCategoryModalOpen(true)}
            className="p-1 rounded bg-saffron text-white hover:bg-opacity-90"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={`flex items-center justify-between p-3 mb-2 rounded cursor-pointer border-l-4 ${selectedCategoryId === cat.id ? 'bg-orange-50 border-saffron' : 'bg-gray-50 border-transparent hover:bg-gray-100'
                }`}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              <div className="flex items-center">
                <GripVertical size={16} className="text-gray-400 mr-2 cursor-grab" />
                <span className="font-medium text-gray-800">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" className="sr-only peer" checked={cat.isAvailable} onChange={() => handleToggleCategory(cat.id, cat.isAvailable)} />
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
            {selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : 'All Items'}
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
              className="flex items-center gap-2 px-4 py-2 rounded bg-maroon text-white font-medium hover:bg-opacity-90"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className={`border rounded-lg p-4 flex flex-col ${!item.isAvailable ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {/* Veg/Non-veg indicator */}
                    <div className={`w-4 h-4 border-2 flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                    </div>
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={item.isAvailable} onChange={() => handleToggleItem(item.id, item.isAvailable)} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
                {item.hindiName && <p className="text-sm text-gray-500 mb-2">{item.hindiName}</p>}

                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded mb-2" />
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
                  <div className="text-sm font-medium text-maroon mb-2">
                    {item.variants.length === 1
                      ? `₹${item.variants[0].priceINR}`
                      : `₹${Math.min(...item.variants.map(v => v.priceINR))} - ₹${Math.max(...item.variants.map(v => v.priceINR))}`
                    }
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
          onClose={() => setIsItemModalOpen(false)}
          onSave={(item) => {
            if (editingItem) setItems(items.map(i => i.id === item.id ? item : i));
            else setItems([...items, { ...item, id: Math.random().toString() }]);
            setIsItemModalOpen(false);
          }}
        />
      )}
      {isCategoryModalOpen && (
        <CategoryModal
          onClose={() => setIsCategoryModalOpen(false)}
          onSave={(cat) => {
            setCategories([...categories, { ...cat, id: Math.random().toString(), isAvailable: true, order: categories.length }]);
            setIsCategoryModalOpen(false);
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
