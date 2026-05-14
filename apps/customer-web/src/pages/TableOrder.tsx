import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { getLiveTableOrder, requestBill, payOnlineOrder, loadRazorpay } from '../services/api';
import { ArrowLeft, Clock, CreditCard, Receipt, Loader } from 'lucide-react';
import { getSocket } from '../services/socket';

export const TableOrder = () => {
    const navigate = useNavigate();
    const { tableNumber } = useCartStore();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchOrder = async () => {
        if (!tableNumber) {
            navigate('/menu');
            return;
        }
        try {
            const data = await getLiveTableOrder(tableNumber);
            setOrder(data);
        } catch (error) {
            console.error(error);
            // If no active order, go back to menu
            navigate('/menu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();

        const socket = getSocket();
        
        // Listen for updates on this order
        const handleStatusUpdate = (data: any) => {
            if (order && data.orderId === order._id) {
                fetchOrder();
            }
        };

        socket.on('order_status_update', handleStatusUpdate);

        // Also poll every 10 seconds just in case
        const interval = setInterval(fetchOrder, 10000);

        return () => {
            socket.off('order_status_update', handleStatusUpdate);
            clearInterval(interval);
        };
    }, [tableNumber, navigate]);

    const handleRequestBill = async () => {
        if (!order) return;
        if (!window.confirm('Are you done eating and ready for the bill?')) return;
        
        setProcessing(true);
        try {
            await requestBill(order._id);
            alert('Bill requested! A waiter will be with you shortly.');
            fetchOrder();
        } catch (error) {
            console.error(error);
            alert('Failed to request bill.');
        } finally {
            setProcessing(false);
        }
    };

    const handlePayOnline = async () => {
        if (!order) return;
        setProcessing(true);
        try {
            const res = await payOnlineOrder(order._id);
            const scriptLoaded = await loadRazorpay();
            if (!scriptLoaded) throw new Error('Razorpay load failed');

            const options = {
                key: 'rzp_test_stub', // Should use env var
                amount: res.amount,
                currency: 'INR',
                name: 'Restaurant Name',
                description: 'Table Bill Payment',
                order_id: res.razorpayOrderId,
                handler: function () {
                    alert('Payment Successful!');
                    navigate('/menu'); // Reset to menu after paying
                },
                theme: { color: '#B91C1C' }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error(error);
            alert('Payment failed. Please try again or ask the waiter.');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <Loader className="w-8 h-8 text-brand-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading your table...</p>
            </div>
        );
    }

    if (!order) return null;

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col pb-6">
            <header className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigate('/menu')} className="p-2 border rounded-xl hover:bg-gray-50">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Table Order</h1>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">Live Session</p>
                </div>
                {order.status === 'BILLED' && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                        Bill Requested
                    </span>
                )}
            </header>

            <main className="flex-1 p-4 space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-brand-50 p-4 border-b border-brand-100">
                        <h2 className="font-bold text-brand-900 flex items-center gap-2">
                            <Clock size={18} className="text-brand-600" /> 
                            Ordered Items ({order.items.length})
                        </h2>
                    </div>
                    
                    <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
                        {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-start pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                <div className="flex-1 pr-4">
                                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                                    {item.variantName && <p className="text-xs text-gray-500 mt-1">{item.variantName}</p>}
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                                        <span className="text-sm font-bold text-gray-900">₹{(item.priceAtOrderTime * item.quantity).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="mt-1">
                                    {/* Real app would have per-item KOT status tracking, here we just show sent */}
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">Sent</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                    <div className="flex justify-between text-gray-600">
                        <span>Item Total</span>
                        <span className="font-medium">₹{order.totalAmountINR.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Taxes & GST (5%)</span>
                        <span className="font-medium">₹{(order.totalAmountINR * 0.05).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-dashed my-2 pt-3 flex justify-between font-black text-xl text-gray-900">
                        <span>Total Bill</span>
                        <span>₹{(order.totalAmountINR * 1.05).toFixed(2)}</span>
                    </div>
                </div>
            </main>

            <div className="p-4 bg-white border-t border-gray-100 mt-auto space-y-3 pb-8">
                {order.status === 'OPEN' && (
                    <button 
                        onClick={() => navigate('/menu')}
                        className="w-full bg-brand-50 text-brand-700 font-bold py-3.5 rounded-2xl hover:bg-brand-100 transition-colors"
                    >
                        + Add More Food
                    </button>
                )}
                
                <div className="flex gap-3">
                    <button 
                        disabled={processing || order.status === 'BILLED'}
                        onClick={handleRequestBill}
                        className="flex-1 flex flex-col items-center justify-center gap-1 bg-gray-900 text-white font-bold py-3 rounded-2xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        <Receipt size={20} />
                        <span className="text-sm">Request Bill</span>
                    </button>
                    <button 
                        disabled={processing}
                        onClick={handlePayOnline}
                        className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-blue-500/20 shadow-lg"
                    >
                        <CreditCard size={20} />
                        <span className="text-sm">Pay Online</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
