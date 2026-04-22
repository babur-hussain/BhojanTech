import React, { useState, useEffect } from 'react';
import { MenuItem, MenuCategory, ItemVariant } from '@restaurant/types';
import { X, Plus, Trash2, Upload } from 'lucide-react';

interface Props {
  item: MenuItem | null;
  categories: MenuCategory[];
  onClose: () => void;
  onSave: (item: any) => void;
}

export default function ItemModal({ item, categories, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    hindiName: '',
    description: '',
    categoryId: categories[0]?.id || '',
    isVeg: true,
    variants: [{ name: 'Regular', priceINR: 0 }],
    gstSlab: 5,
    allergenTags: [],
    isAvailable: true,
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app:
    // 1. Fetch presigned URL from backend `/api/menu/upload-url`
    // 2. PUT file to S3 using the signedUrl
    // 3. Update formData.imageUrl with the publicUrl
    alert('S3 presigned URL upload flow would happen here!');
  };

  const updateVariant = (index: number, field: keyof ItemVariant, value: string | number) => {
    const newVariants = [...(formData.variants || [])];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const addVariant = () => {
    setFormData({ ...formData, variants: [...(formData.variants || []), { name: '', priceINR: 0 }] });
  };

  const removeVariant = (index: number) => {
    setFormData({ ...formData, variants: (formData.variants || []).filter((_, i) => i !== index) });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-cream rounded-t-lg">
          <h2 className="text-xl font-bold text-maroon">{item ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
                <input type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron focus:ring-saffron" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (Hindi)</label>
                <input type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron focus:ring-saffron" 
                  value={formData.hindiName} onChange={e => setFormData({...formData, hindiName: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron focus:ring-saffron"
                  value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4 mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={formData.isVeg} onChange={() => setFormData({...formData, isVeg: true})} className="text-green-600 focus:ring-green-500" />
                  <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-green-600"></div></div>
                  <span className="text-sm font-medium">Veg</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!formData.isVeg} onChange={() => setFormData({...formData, isVeg: false})} className="text-red-600 focus:ring-red-500" />
                  <div className="w-4 h-4 border-2 border-red-600 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-red-600"></div></div>
                  <span className="text-sm font-medium">Non-Veg</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Variants & Pricing</label>
                <button type="button" onClick={addVariant} className="text-sm text-saffron flex items-center hover:underline">
                  <Plus size={16} /> Add Variant
                </button>
              </div>
              {formData.variants?.map((variant, index) => (
                <div key={index} className="flex gap-2 mb-2 items-center">
                  <input type="text" placeholder="Size (e.g. Half)" className="flex-1 border-gray-300 rounded-md text-sm" 
                    value={variant.name} onChange={e => updateVariant(index, 'name', e.target.value)} />
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">₹</span>
                    <input type="number" className="w-full pl-8 border-gray-300 rounded-md text-sm" 
                      value={variant.priceINR || ''} onChange={e => updateVariant(index, 'priceINR', Number(e.target.value))} />
                  </div>
                  {formData.variants!.length > 1 && (
                    <button type="button" onClick={() => removeVariant(index)} className="text-red-500 p-1">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Slab</label>
                <select className="w-full border-gray-300 rounded-md shadow-sm"
                  value={formData.gstSlab} onChange={e => setFormData({...formData, gstSlab: Number(e.target.value) as 5|12|18})}>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Upload</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex-1">
                    <Upload size={16} className="mr-2" /> Choose File
                    <input type="file" className="hidden" accept="image/jpeg, image/webp" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            </div>

          </form>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSave(formData)} className="px-4 py-2 bg-maroon text-white rounded-md hover:bg-opacity-90">Save Item</button>
        </div>
      </div>
    </div>
  );
}
