import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MenuItem, MenuCategory, Order, OrderItem } from '@restaurant/types';
import { ArrowLeft, Send, Plus, Minus, Search, MessageSquare } from 'lucide-react';
import { api } from '../utils/api';
import { useSocket } from '../hooks/useSocket';

export default function OrderDetails() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { subscribe } = useSocket();
  const [tableName, setTableName] = useState('');
  
  // Current active order state
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // Variant selection modal
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  const fetchMenu = async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items')
      ]);
      setCategories(catsRes.data);
      setMenuItems(itemsRes.data);
      if (catsRes.data.length > 0) setSelectedCategory(catsRes.data[0]._id || catsRes.data[0].id);
    } catch (err) {
      console.error('Failed to fetch menu', err);
    }
  };

  const fetchActiveOrder = async () => {
    try {
      const res = await api.get('/orders/active');
      const orders = res.data;
      const tableOrder = orders.find((o: any) => o.tableId === tableId);
      if (tableOrder) {
        setActiveOrder(tableOrder);
        setOrderItems(tableOrder.items.map((i: any) => ({...i, id: i._id || i.id})));
      } else {
        setActiveOrder(null);
      }
    } catch (err) {
      console.error('Failed to fetch active order', err);
    }
  };

  useEffect(() => {
    api.get('/tables').then(res => {
      const table = res.data.find((t: any) => t._id === tableId || t.id === tableId);
      if (table) setTableName(table.number);
    });
    fetchMenu();
    fetchActiveOrder();
  }, [tableId]);

  useEffect(() => {
    const unsub = subscribe('order_update', (data: any) => {
      const { order } = data;
      if (order && order.tableId === tableId) {
        setActiveOrder(order);
        setOrderItems(order.items.map((i: any) => ({...i, id: i._id || i.id})));
      }
    });
    return () => unsub();
  }, [subscribe, tableId]);

  const handleAddItem = (item: MenuItem, variantName?: string) => {
    const variant = variantName ? item.variants.find(v => v.name === variantName) : item.variants[0];
    if (!variant) return;

    setOrderItems([...orderItems, {
      id: Math.random().toString(),
      menuItemId: (item as any)._id || item.id,
      name: item.name,
      variantName: variant.name,
      quantity: 1,
      priceAtOrderTime: variant.priceINR,
      sentToKitchen: false
    }]);
    setSelectedMenuItem(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const updateNotes = (id: string, notes: string) => {
    setOrderItems(orderItems.map(item => item.id === id ? { ...item, notes } : item));
  };

  const handleSendToKitchen = async () => {
    const itemsToSend = orderItems.filter(i => !i.sentToKitchen);
    if (itemsToSend.length === 0) return;
    
    setIsSending(true);
    try {
      let currentOrderId = (activeOrder as any)?._id || activeOrder?.id;

      if (!currentOrderId) {
        // Create order
        const res = await api.post('/orders', {
          tableId,
          items: itemsToSend.map(i => ({
            menuItemId: i.menuItemId,
            name: i.name,
            variantName: i.variantName,
            quantity: i.quantity,
            priceAtOrderTime: i.priceAtOrderTime,
            notes: i.notes
          }))
        });
        currentOrderId = res.data._id || res.data.id;
        
        const newItems = res.data.items.filter((i: any) => !i.sentToKitchen).map((i: any) => i._id);
        if (newItems.length > 0) {
          await api.post(`/orders/${currentOrderId}/kot`, { itemIds: newItems });
        }
      } else {
        // Add items to existing order
        const res = await api.post(`/orders/${currentOrderId}/items`, {
          items: itemsToSend.map(i => ({
            menuItemId: i.menuItemId,
            name: i.name,
            variantName: i.variantName,
            quantity: i.quantity,
            priceAtOrderTime: i.priceAtOrderTime,
            notes: i.notes
          }))
        });
        
        const updatedOrder = res.data;
        const unsentItems = updatedOrder.items.filter((i: any) => !i.sentToKitchen).map((i: any) => i._id);
        
        if (unsentItems.length > 0) {
          await api.post(`/orders/${currentOrderId}/kot`, { itemIds: unsentItems });
        }
      }
      
      await fetchActiveOrder();
    } catch (error) {
      console.error(error);
      alert('Failed to send to kitchen');
    } finally {
      setIsSending(false);
    }
  };

  const filteredMenu = menuItems.filter(i => 
    (selectedCategory ? (i.categoryId === selectedCategory || (i as any).categoryId?._id === selectedCategory) : true) &&
    (searchQuery ? i.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
  );

  const totalAmount = orderItems.reduce((sum, item) => sum + (item.priceAtOrderTime * item.quantity), 0);

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      
      {/* Left Panel: Order Summary */}
      <div className="w-1/3 flex flex-col border-r border-gray-200 bg-gray-50">
        <div className="p-4 bg-maroon text-white flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/tables')} className="mr-3 hover:bg-white hover:bg-opacity-20 p-1 rounded">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold">Table {tableName || tableId}</h2>
          </div>
          <span className="text-sm bg-white text-maroon px-2 py-1 rounded font-bold">
            Total: ₹{totalAmount}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {orderItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">No items in order</div>
          ) : (
            orderItems.map((item) => (
              <div key={item.id} className={`bg-white p-3 rounded-lg shadow-sm border-l-4 ${item.sentToKitchen ? 'border-gray-400 opacity-70' : 'border-saffron'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-800">{item.name}</h4>
                    {item.variantName && item.variantName !== 'Regular' && (
                      <span className="text-xs text-gray-500">{item.variantName}</span>
                    )}
                  </div>
                  <span className="font-semibold">₹{item.priceAtOrderTime * item.quantity}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center border rounded">
                    <button onClick={() => updateQuantity(item.id, -1)} disabled={item.sentToKitchen} className="p-1 hover:bg-gray-100 disabled:opacity-50"><Minus size={16} /></button>
                    <span className="px-3 font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} disabled={item.sentToKitchen} className="p-1 hover:bg-gray-100 disabled:opacity-50"><Plus size={16} /></button>
                  </div>
                  {!item.sentToKitchen && (
                    <div className="relative flex-1 ml-4">
                      <MessageSquare size={14} className="absolute left-2 top-2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Instructions..." 
                        value={item.notes || ''}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="w-full pl-7 pr-2 py-1 text-xs border rounded bg-gray-50"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white border-t">
          <button 
            onClick={handleSendToKitchen}
            disabled={orderItems.filter(i => !i.sentToKitchen).length === 0 || isSending}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={20} /> {isSending ? 'Sending...' : 'Send to Kitchen'}
          </button>
        </div>
      </div>

      {/* Right Panel: Menu */}
      <div className="flex-1 flex flex-col bg-cream">
        <div className="p-4 border-b bg-white flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search menu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-full focus:ring-saffron focus:border-saffron"
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Category Tabs */}
          <div className="w-48 bg-white border-r overflow-y-auto">
            {categories.map(cat => (
              <button 
                key={(cat as any)._id || cat.id}
                onClick={() => setSelectedCategory((cat as any)._id || cat.id)}
                className={`w-full text-left px-4 py-4 border-b font-medium transition-colors ${selectedCategory === ((cat as any)._id || cat.id) ? 'bg-orange-50 text-maroon border-l-4 border-l-saffron' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMenu.map(item => (
                <div 
                  key={(item as any)._id || item.id} 
                  onClick={() => {
                    if (item.variants.length > 1) setSelectedMenuItem(item);
                    else handleAddItem(item);
                  }}
                  className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:border-saffron transition-colors ${!item.isAvailable ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className={`w-4 h-4 border-2 flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                    </div>
                    <span className="font-bold text-maroon">
                      ₹{item.variants[0].priceINR}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 leading-tight mb-1">{item.name}</h3>
                  {item.variants.length > 1 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Multiple Variants</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {selectedMenuItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-w-[90%]">
            <h3 className="text-xl font-bold mb-4">{selectedMenuItem.name} - Select Variant</h3>
            <div className="space-y-3">
              {selectedMenuItem.variants.map(variant => (
                <button 
                  key={variant.name}
                  onClick={() => handleAddItem(selectedMenuItem, variant.name)}
                  className="w-full flex justify-between items-center p-4 border rounded hover:border-saffron hover:bg-orange-50"
                >
                  <span className="font-medium">{variant.name}</span>
                  <span className="font-bold text-maroon">₹{variant.priceINR}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setSelectedMenuItem(null)} className="mt-6 w-full py-2 text-gray-500 font-medium hover:bg-gray-100 rounded">Cancel</button>
          </div>
        </div>
      )}

    </div>
  );
}
