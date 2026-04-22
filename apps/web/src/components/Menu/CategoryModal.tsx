import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSave: (cat: any) => void;
}

export default function CategoryModal({ onClose, onSave }: Props) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-cream rounded-t-lg">
          <h2 className="text-xl font-bold text-maroon">Add Category</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
          <input 
            type="text" 
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-saffron focus:ring-saffron" 
            value={name} 
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Starters"
            autoFocus
          />
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSave({ name })} className="px-4 py-2 bg-maroon text-white rounded-md hover:bg-opacity-90" disabled={!name.trim()}>Save</button>
        </div>
      </div>
    </div>
  );
}
