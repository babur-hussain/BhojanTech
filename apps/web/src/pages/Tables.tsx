import React, { useState, useEffect } from 'react';
import { Table } from '@restaurant/types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus, X } from 'lucide-react';
import { api } from '../utils/api';
import { useBranchStore } from '../store/branchStore';

export default function Tables() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedBranchId } = useBranchStore();
  const isAllBranches = selectedBranchId === 'all';
  const [tables, setTables] = useState<Table[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTable, setNewTable] = useState({ number: '', capacity: 2 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDownloadQRs = async () => {
    if (!user?.restaurantId) return;
    try {
      setIsDownloading(true);
      const response = await api.get(`/qr/download/restaurant/${user.restaurantId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Table_QRs_${user.restaurantId}.pdf`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF', error);
      alert('Failed to download QR PDF. Please ensure you have the correct permissions.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTable.number) return;
    try {
      setIsSubmitting(true);
      await api.post('/tables', { ...newTable, branchId: (user as any)?.branchId });
      setIsAddModalOpen(false);
      setNewTable({ number: '', capacity: 2 });

      const res = await api.get('/tables');
      setTables(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to add table');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await api.get('/tables');
        setTables(res.data);
      } catch (err) {
        console.error('Failed to fetch tables', err);
      }
    };
    fetchTables();

    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update every minute for time seated
    return () => clearInterval(timer);
  }, []);

  const handleTableClick = (table: Table) => {
    navigate(`/order/${table.id}`);
  };

  const formatTurnTime = (seatedAt?: Date) => {
    if (!seatedAt) return '';
    const diffMins = Math.floor((currentTime.getTime() - seatedAt.getTime()) / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-maroon">Floor Plan</h1>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-sm">Available</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span className="text-sm">Occupied</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div><span className="text-sm">Reserved</span></div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isAllBranches}
            title={isAllBranches ? "Select a specific branch to add tables" : ""}
            className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg font-semibold transition shadow ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-maroon hover:bg-opacity-90'}`}
          >
            <Plus size={16} /> Add Table
          </button>

          <button
            onClick={handleDownloadQRs}
            disabled={isDownloading || tables.length === 0}
            className={`flex items-center gap-2 bg-saffron text-white px-4 py-2 rounded-lg font-semibold transition ${(isDownloading || tables.length === 0) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-orange-600'}`}
          >
            {isDownloading ? 'Downloading...' : 'Download QR Codes'}
          </button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-gray-300 p-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="text-gray-400 w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">No tables yet</h3>
          <p className="text-gray-500 text-sm mb-6">Add your restaurant tables to get started with orders and QR codes.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isAllBranches}
            title={isAllBranches ? "Select a specific branch to add tables" : ""}
            className={`text-white px-6 py-2 rounded-lg font-semibold transition inline-flex items-center gap-2 shadow ${isAllBranches ? 'bg-gray-400 cursor-not-allowed' : 'bg-maroon hover:bg-opacity-90'}`}
          >
            <Plus size={16} /> Add First Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {tables.map(table => (
            <div
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`cursor-pointer rounded-lg shadow-md p-4 flex flex-col items-center justify-center aspect-square transition-transform hover:scale-105 ${table.status === 'AVAILABLE' ? 'bg-white border-2 border-green-500' :
                  table.status === 'OCCUPIED' ? 'bg-red-50 border-2 border-red-500' :
                    'bg-yellow-50 border-2 border-yellow-500'
                }`}
            >
              <span className="text-3xl font-bold text-gray-800 mb-2">{table.number}</span>
              <span className="text-xs text-gray-500 mb-2">{table.capacity} Seats</span>
              {table.status === 'OCCUPIED' && table.seatedAt && (
                <div className="mt-auto flex items-center text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-medium">
                  <Clock size={12} className="mr-1" />
                  {formatTurnTime(table.seatedAt)}
                </div>
              )}
              {table.status === 'RESERVED' && <div className="mt-auto text-yellow-700 text-xs font-medium">Reserved</div>}
              {table.status === 'AVAILABLE' && <div className="mt-auto text-green-700 text-xs font-medium">Open</div>}
            </div>
          ))}
        </div>
      )}

      {/* Add Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h2 className="text-xl font-bold text-gray-900">Add New Table</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Table Number / Name</label>
                <input
                  required
                  autoFocus
                  type="text"
                  placeholder="e.g. T1, Table 5, Terrace-1"
                  value={newTable.number}
                  onChange={e => setNewTable({ ...newTable, number: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Seating Capacity</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="50"
                  value={newTable.capacity}
                  onChange={e => setNewTable({ ...newTable, capacity: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-maroon text-white py-2.5 rounded-lg font-bold hover:bg-opacity-90 transition disabled:opacity-50 shadow">
                  {isSubmitting ? 'Saving...' : 'Add Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
