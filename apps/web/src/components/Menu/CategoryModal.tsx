import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../utils/api';

interface Props {
  category?: any;
  onClose: () => void;
  onSave: (cat: any) => void;
  onDelete?: (cat: any) => void;
}

export default function CategoryModal({ category, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setImageUrl(category.imageUrl || '');
    }
  }, [category]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('images', files[0]);

      const res = await api.post('/menu/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.urls && res.data.urls.length > 0) {
        setImageUrl(res.data.urls[0]);
      }
    } catch (error: any) {
      console.error('Upload failed', error);
      alert(error?.response?.data?.error || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-cream rounded-t-lg">
          <h2 className="text-xl font-bold text-maroon">{category ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
          <input 
            type="text" 
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron focus:ring-saffron mb-4" 
            value={name} 
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Starters"
            autoFocus
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">Category Image (Optional)</label>
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              {isUploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2" />}
              {isUploading ? 'Uploading...' : 'Choose File'}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
            </label>
            
            {imageUrl && (
              <div className="relative group mt-2 w-full flex justify-center">
                <img src={imageUrl} alt="Preview" className="h-24 w-24 object-cover rounded border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute -top-2 right-12 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center rounded-b-lg">
          <div>
            {category && onDelete && (
              <button onClick={() => onDelete(category)} className="text-red-500 p-2 hover:bg-red-50 rounded">
                <Trash2 size={20} />
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100">Cancel</button>
            <button onClick={() => onSave({ ...category, name, imageUrl })} className="px-4 py-2 bg-maroon text-white rounded-md hover:bg-opacity-90" disabled={!name.trim() || isUploading}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
