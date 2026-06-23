import React, { useState, useEffect } from 'react';
import { MenuItem, MenuCategory, ItemVariant } from '@restaurant/types';
import { X, Plus, Trash2, Upload, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { api, getMediaUrl } from '../../utils/api';

interface Props {
  item: MenuItem | null;
  categories: MenuCategory[];
  initialCategoryId?: string | null;
  onClose: () => void;
  onSave: (item: any) => void;
  onDelete?: (item: any) => void;
}

// ── Preset size/quantity templates ────────────────────────────────────────────
const PRESETS: Record<string, { name: string; variants: { name: string }[] }> = {
  plate: {
    name: '🍽️ Plate (Quarter / Half / Full)',
    variants: [
      { name: 'Quarter Plate' },
      { name: 'Half Plate' },
      { name: 'Full Plate' },
    ],
  },
  weight: {
    name: '⚖️ Weight (250g / 500g / 1kg)',
    variants: [
      { name: '250g' },
      { name: '500g' },
      { name: '1 Kg' },
    ],
  },
  drink: {
    name: '🥤 Drink (Small / Medium / Large)',
    variants: [
      { name: 'Small' },
      { name: 'Medium' },
      { name: 'Large' },
    ],
  },
  pieces: {
    name: '🔢 Pieces (1pc / 2pc / 4pc / 6pc / 12pc)',
    variants: [
      { name: '1 Pc' },
      { name: '2 Pcs' },
      { name: '4 Pcs' },
      { name: '6 Pcs' },
      { name: '12 Pcs' },
    ],
  },
  cake: {
    name: '🎂 Cake (500g / 1kg / 2kg)',
    variants: [
      { name: '500g' },
      { name: '1 Kg' },
      { name: '2 Kg' },
    ],
  },
  single: {
    name: '1️⃣ Single Price (Regular)',
    variants: [
      { name: 'Regular' },
    ],
  },
};

export default function ItemModal({ item, categories, initialCategoryId, onClose, onSave, onDelete }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    hindiName: '',
    description: '',
    categoryId: initialCategoryId || (categories[0] as any)?._id || categories[0]?.id || '',
    isVeg: true,
    variants: [{ name: 'Regular', priceINR: 0, specialPriceINR: undefined }],
    gstSlab: 0,
    allergenTags: [],
    imageUrls: [],
    isAvailable: true,
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);

      // Upload files to our backend, which proxies them to S3
      // This avoids CORS issues entirely (browser → our server → S3)
      const formData2 = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData2.append('images', files[i]);
      }

      const res = await api.post('/menu/upload', formData2, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // Allow up to 60 seconds for image uploads
      });

      const newUrls: string[] = res.data.urls;

      // Update formData with the returned S3 URLs
      setFormData(prev => ({
        ...prev,
        imageUrls: [...(prev.imageUrls || []), ...newUrls],
      }));

    } catch (error: any) {
      console.error('Upload failed', error);
      alert(error?.response?.data?.error || 'Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
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

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    // Preserve existing prices if variant count matches
    const existingVariants = formData.variants || [];
    const newVariants = preset.variants.map((pv, idx) => ({
      name: pv.name,
      priceINR: existingVariants[idx]?.priceINR || 0,
      specialPriceINR: existingVariants[idx]?.specialPriceINR,
    }));
    setFormData({ ...formData, variants: newVariants });
    setShowPresets(false);
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
                  {categories.map(c => <option key={(c as any)._id || c.id} value={(c as any)._id || c.id}>{c.name}</option>)}
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

            {/* ── Variants & Quantity-wise Pricing ───────────────────────── */}
            <div className="border border-orange-200 rounded-lg bg-orange-50/50 p-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-gray-800">
                  📏 Size / Quantity & Pricing
                </label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPresets(!showPresets)}
                      className="text-xs px-3 py-1.5 bg-white border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50 flex items-center gap-1 font-medium"
                    >
                      Quick Presets {showPresets ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {showPresets && (
                      <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
                        {Object.entries(PRESETS).map(([key, preset]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => applyPreset(key)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={addVariant} className="text-xs px-3 py-1.5 bg-maroon text-white rounded-md hover:bg-opacity-90 flex items-center gap-1 font-medium">
                    <Plus size={12} /> Add Size
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3">
                Set different sizes/quantities with individual prices. E.g., Half Plate ₹69, Full Plate ₹109 or 500g ₹299, 1kg ₹549
              </p>

              {/* Column headers */}
              <div className="grid gap-2 mb-1" style={{ gridTemplateColumns: '1fr 1fr 1fr 32px' }}>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Size / Qty</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Price (₹)</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Offer Price (₹)</span>
                <span></span>
              </div>

              {formData.variants?.map((variant, index) => (
                <div key={index} className="grid gap-2 mb-2 items-center" style={{ gridTemplateColumns: '1fr 1fr 1fr 32px' }}>
                  <input
                    type="text"
                    placeholder="e.g. Half Plate, 500g, Large"
                    className="border-gray-300 rounded-md text-sm focus:border-saffron focus:ring-saffron bg-white"
                    value={variant.name}
                    onChange={e => updateVariant(index, 'name', e.target.value)}
                  />
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="MRP"
                      className="w-full pl-7 border-gray-300 rounded-md text-sm focus:border-saffron focus:ring-saffron bg-white"
                      value={variant.priceINR || ''}
                      onChange={e => updateVariant(index, 'priceINR', Number(e.target.value))}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="Offer"
                      className="w-full pl-7 border-gray-300 rounded-md text-sm focus:border-saffron focus:ring-saffron bg-white"
                      value={variant.specialPriceINR || ''}
                      onChange={e => updateVariant(index, 'specialPriceINR', Number(e.target.value) || undefined)}
                    />
                  </div>
                  {formData.variants!.length > 1 ? (
                    <button type="button" onClick={() => removeVariant(index)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <div className="w-4" />
                  )}
                </div>
              ))}

              {/* Quick-add common sizes */}
              {(formData.variants?.length || 0) <= 1 && (
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <span className="text-xs text-gray-500 mr-2">Quick add:</span>
                  {['Half Plate', 'Full Plate', '250g', '500g', '1 Kg', 'Small', 'Medium', 'Large', '1 Pc', '6 Pcs'].map(label => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        // Check if already exists
                        const exists = formData.variants?.some(v => v.name === label);
                        if (exists) return;
                        setFormData(prev => ({
                          ...prev,
                          variants: [...(prev.variants || []), { name: label, priceINR: 0 }],
                        }));
                      }}
                      className="inline-block text-xs px-2 py-1 mr-1 mb-1 bg-white border border-gray-300 rounded-full text-gray-600 hover:border-orange-400 hover:text-orange-700 transition-colors"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Slab</label>
                <select className="w-full border-gray-300 rounded-md shadow-sm"
                  value={formData.gstSlab} onChange={e => setFormData({...formData, gstSlab: Number(e.target.value) as 0|5|12|18})}>
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image Upload</label>
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    {isUploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2" />}
                    {isUploading ? 'Uploading...' : 'Choose File(s)'}
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={isUploading} />
                  </label>
                  
                  {/* Image Previews */}
                  {formData.imageUrls && formData.imageUrls.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                      {formData.imageUrls.map((url, idx) => (
                        <div key={idx} className="relative group shrink-0">
                          <img src={getMediaUrl(url)} alt="Upload preview" className="h-16 w-16 object-cover rounded border border-gray-200" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls?.filter((_, i) => i !== idx) }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Advanced Details (Collapsible) ──────────────────────────── */}
            <div className="border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <span>Advanced Details (Optional)</span>
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showAdvanced && (
                <div className="p-4 pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (mins)</label>
                      <input type="number" className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron" 
                        value={formData.preparationTime || ''} onChange={e => setFormData({...formData, preparationTime: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Packing Charges (₹)</label>
                      <input type="number" className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron" 
                        value={formData.packingCharges || ''} onChange={e => setFormData({...formData, packingCharges: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
                      <input type="number" className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron" 
                        value={formData.costPriceINR || ''} onChange={e => setFormData({...formData, costPriceINR: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
                      <input type="number" className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron" 
                        value={formData.calories || ''} onChange={e => setFormData({...formData, calories: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Short Code</label>
                      <input type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron" 
                        value={formData.shortCode || ''} onChange={e => setFormData({...formData, shortCode: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Barcode / SKU</label>
                      <input type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron" 
                        value={formData.barcode || ''} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center rounded-b-lg">
          <div>
            {item && onDelete && (
              <button type="button" onClick={() => onDelete(item)} className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50 flex items-center gap-2">
                <Trash2 size={16} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100">Cancel</button>
            <button type="button" onClick={() => onSave(formData)} className="px-4 py-2 bg-maroon text-white rounded-md hover:bg-opacity-90">Save Item</button>
          </div>
        </div>
      </div>
    </div>
  );
}
