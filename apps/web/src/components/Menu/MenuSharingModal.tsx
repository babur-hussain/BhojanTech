import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Share2, Loader2, Search } from 'lucide-react';
import { api } from '../../utils/api';

interface Props {
  categories: any[];
  items: any[];
  onClose: () => void;
  onSuccess: () => void;
  currentBranchId: string;
}

export default function MenuSharingModal({ categories, items, onClose, onSuccess, currentBranchId }: Props) {
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const [overwrite, setOverwrite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch branches
    api.get('/branches').then(res => {
      // Filter out the current branch if it's selected
      const allBranches = Array.isArray(res.data) ? res.data : [];
      setBranches(allBranches.filter(b => b._id !== currentBranchId));
    }).catch(console.error)
    .finally(() => setLoadingBranches(false));
  }, [currentBranchId]);

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      // Remove category and its items
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
      const catItems = items.filter(i => i.categoryId === categoryId).map(i => i._id);
      setSelectedItems(prev => prev.filter(id => !catItems.includes(id)));
    } else {
      // Add category and its items
      setSelectedCategories(prev => [...prev, categoryId]);
      const catItems = items.filter(i => i.categoryId === categoryId).map(i => i._id);
      setSelectedItems(prev => Array.from(new Set([...prev, ...catItems])));
    }
  };

  const handleItemToggle = (itemId: string, categoryId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    } else {
      setSelectedItems(prev => [...prev, itemId]);
      if (!selectedCategories.includes(categoryId)) {
        setSelectedCategories(prev => [...prev, categoryId]);
      }
    }
  };

  const handleBranchToggle = (branchId: string) => {
    if (selectedBranches.includes(branchId)) {
      setSelectedBranches(prev => prev.filter(id => id !== branchId));
    } else {
      setSelectedBranches(prev => [...prev, branchId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedBranches.length === 0) return alert('Select at least one target branch.');
    if (selectedCategories.length === 0 && selectedItems.length === 0) return alert('Select at least one category or item to share.');

    try {
      setIsSubmitting(true);
      await api.post('/menu/share', {
        targetBranchIds: selectedBranches,
        categoryIds: selectedCategories,
        itemIds: selectedItems,
        overwrite
      });
      alert('Menu items shared successfully!');
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to share menu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Share2 size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-800">Share Menu to Branches</h2>
              <p className="text-xs text-gray-500">Copy categories and items to other branches</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Branches */}
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                1. Select Target Branches
              </h3>
              <p className="text-xs text-gray-500 mb-3">Which branches should receive these menu items?</p>
            </div>

            {loadingBranches ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
              </div>
            ) : branches.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
                No other branches available.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {branches.map(b => (
                  <label key={b._id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedBranches.includes(b._id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                  }`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                      checked={selectedBranches.includes(b._id)}
                      onChange={() => handleBranchToggle(b._id)}
                    />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{b.name}</p>
                      {b.location && <p className="text-xs text-gray-500">{b.location}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 mt-0.5 text-amber-600 rounded border-amber-300"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                />
                <div>
                  <p className="text-sm font-bold text-amber-800">Overwrite Existing Items</p>
                  <p className="text-xs text-amber-700 mt-1">If checked, items with the same name in the target branch will be updated with these details.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Right Column: Menu Selection */}
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                2. Select Menu Items
              </h3>
              <p className="text-xs text-gray-500 mb-3">Choose the categories and items to share</p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map(cat => {
                const catItems = items.filter(i => i.categoryId === cat._id);
                const isCatSelected = selectedCategories.includes(cat._id);
                const selectedCatItems = catItems.filter(i => selectedItems.includes(i._id));
                const isIndeterminate = selectedCatItems.length > 0 && selectedCatItems.length < catItems.length;

                return (
                  <div key={cat._id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                          checked={isCatSelected}
                          ref={el => { if (el) el.indeterminate = !isCatSelected && isIndeterminate; }}
                          onChange={() => handleCategoryToggle(cat._id)}
                        />
                        <span className="font-bold text-sm text-gray-800">{cat.name}</span>
                      </label>
                      <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-md border">{catItems.length} items</span>
                    </div>
                    
                    {catItems.length > 0 && (
                      <div className="p-2 space-y-1 bg-white">
                        {catItems.map(item => (
                          <label key={item._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer ml-6">
                            <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 text-indigo-500 rounded border-gray-300"
                              checked={selectedItems.includes(item._id)}
                              onChange={() => handleItemToggle(item._id, cat._id)}
                            />
                            <span className="text-sm text-gray-600">{item.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <div className="text-xs text-gray-500 font-medium">
            Sharing {selectedItems.length} items to {selectedBranches.length} branch(es)
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedBranches.length === 0 || selectedItems.length === 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-200"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Sharing...' : 'Share Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
