import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Order, IntegrationPlatform } from '@restaurant/types';
import { Clock, Truck, XCircle } from 'lucide-react';

export default function DeliveryOrdersLive() {
    const { subscribe } = useSocket();
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        // Listen for new delivery orders
        const unsub1 = subscribe('delivery_order_placed', ({ order, platform, badgeColor }) => {
            setOrders(prev => [order, ...prev]);
        });

        // Listen for cancellations
        const unsub2 = subscribe('delivery_order_cancelled', ({ externalOrderId }) => {
            setOrders(prev => prev.map(o => o.externalOrderId === externalOrderId ? { ...o, status: 'CANCELLED' } : o));
        });

        return () => {
            unsub1();
            unsub2();
        };
    }, [subscribe]);

    const getPlatformColors = (platform?: IntegrationPlatform) => {
        switch (platform) {
            case 'ZOMATO': return 'bg-red-600 text-white border-red-800';
            case 'SWIGGY': return 'bg-orange-600 text-white border-orange-800';
            case 'ONDC': return 'bg-blue-600 text-white border-blue-800';
            default: return 'bg-gray-600 text-white border-gray-800';
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-b-4 border-maroon inline-block pb-1">
                        Live Delivery Orders
                    </h1>
                    <p className="text-gray-500 mt-2">Manage incoming orders from aggregators in real-time.</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                {orders.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        No live delivery orders at the moment.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {orders.map(order => {
                            const platformColors = getPlatformColors(order.deliveryPlatform);
                            const isCancelled = order.status === 'CANCELLED';

                            return (
                                <div key={order.externalOrderId} className={`rounded-xl border shadow-sm bg-white overflow-hidden flex flex-col ${isCancelled ? 'opacity-50' : ''}`}>
                                    <div className={`px-4 py-3 flex items-center justify-between ${platformColors}`}>
                                        <span className="font-bold tracking-wider">{order.deliveryPlatform}</span>
                                        <span className="text-sm font-mono bg-black bg-opacity-20 px-2 py-1 rounded">
                                            #{order.externalOrderId?.slice(-6) || 'N/A'}
                                        </span>
                                    </div>

                                    <div className="p-4 flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="font-semibold text-lg">{order.customerName}</p>
                                                <p className="text-sm text-gray-500">{order.customerPhone}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg">₹{order.totalAmountINR}</p>
                                                <p className="text-xs text-gray-400">
                                                    {order.paymentMode} - {order.paymentStatus}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-4 border-t border-b border-gray-100 py-3">
                                            {order.items.map(item => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span>{item.quantity} × {item.name} {item.variantName && `(${item.variantName})`}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-auto">
                                            <Truck className="w-4 h-4" />
                                            {order.deliveryPartner?.name ?
                                                `${order.deliveryPartner.name} (${order.deliveryPartner.phone})` :
                                                'Assigning partner...'}
                                        </div>

                                        {order.estimatedDeliveryTime && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                                                <Clock className="w-4 h-4" />
                                                ETA: {new Date(order.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </div>

                                    {!isCancelled && (
                                        <div className="p-3 bg-gray-50 border-t flex justify-end">
                                            <button className="text-red-600 flex items-center gap-1 text-sm font-medium hover:text-red-700">
                                                <XCircle className="w-4 h-4" /> Cancel Order
                                            </button>
                                        </div>
                                    )}
                                    {isCancelled && (
                                        <div className="p-3 bg-red-100 border-t flex justify-center text-red-800 font-bold">
                                            CANCELLED
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
