import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { getLiveTableOrder, requestBill, payOnlineOrder, loadRazorpay } from '../services/api';
import { ArrowLeft, Clock, CreditCard, Receipt, Loader, CheckCircle, PartyPopper } from 'lucide-react';
import { getSocket } from '../services/socket';

export const TableOrder = () => {
    const navigate = useNavigate();
    const { tableNumber } = useCartStore();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [sessionClosed, setSessionClosed] = useState(false);
    const [error, setError] = useState('');

    const fetchOrder = async () => {
        if (!tableNumber) { navigate('/menu'); return; }
        try {
            const data = await getLiveTableOrder(tableNumber);
            setOrder(data);
            if (data?._id) {
                const socket = getSocket();
                socket.emit('join_order', data._id);
            }
            if (data?.status === 'PAID') setSessionClosed(true);
        } catch (error) {
            console.error(error);
            navigate('/menu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
        const socket = getSocket();

        const handleOrderUpdate = (data: any) => {
            // ORDER_PAID only sends orderId
            if (data.type === 'ORDER_PAID' || data.type === 'ORDER_COMPLETED') {
                setSessionClosed(true);
                return;
            }

            const updatedOrder = data.order;
            if (!updatedOrder) return;

            // Update order if it's billed or updated
            setOrder(updatedOrder);
        };

        socket.on('order_update', handleOrderUpdate);
        const interval = setInterval(fetchOrder, 15000);

        return () => {
            socket.off('order_update', handleOrderUpdate);
            clearInterval(interval);
        };
    }, [tableNumber, navigate]);

    const handleRequestBill = async () => {
        setError('');
        if (!order) return;
        setProcessing(true);
        try {
            await requestBill(order._id);
            fetchOrder();
        } catch (err) {
            console.error(err);
            setError('Failed to request bill. Please call a waiter.');
        } finally {
            setProcessing(false);
        }
    };

    const handlePayOnline = async () => {
        setError('');
        if (!order) return;
        setProcessing(true);
        try {
            const res = await payOnlineOrder(order._id);
            const scriptLoaded = await loadRazorpay();
            if (!scriptLoaded) throw new Error('Razorpay load failed');
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
                amount: res.amount,
                currency: 'INR',
                name: 'Restaurant',
                description: 'Table Bill Payment',
                order_id: res.razorpayOrderId,
                handler: () => setSessionClosed(true),
                theme: { color: '#B91C1C' }
            };
            new (window as any).Razorpay(options).open();
        } catch (err) {
            console.error(err);
            setError('Payment failed. Please ask the waiter.');
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

    // ── Session Closed (payment collected from POS) ───────────────────────────
    if (sessionClosed) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full space-y-5">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle size={48} className="text-green-500" />
                        </div>
                        <PartyPopper size={28} className="text-yellow-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Thank You!</h1>
                        <p className="text-gray-500 mt-2 text-sm">
                            Your payment has been collected.<br />
                            We hope you enjoyed your meal! 🍽️
                        </p>
                    </div>
                    {order?.totalAmountINR && (
                        <div className="bg-green-50 rounded-2xl px-5 py-3 border border-green-100">
                            <p className="text-xs text-gray-500 font-medium">Amount Paid</p>
                            <p className="text-3xl font-black text-green-700">₹{order.totalAmountINR.toFixed(2)}</p>
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/menu')}
                        className="w-full text-white font-bold py-3.5 rounded-2xl transition-colors"
                        style={{ background: '#B91C1C' }}
                    >
                        Back to Menu
                    </button>
                </div>
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

            <main className="p-4 space-y-4">
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
                        <span>Taxes &amp; GST (5%)</span>
                        <span className="font-medium">₹{(order.totalAmountINR * 0.05).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-dashed my-2 pt-3 flex justify-between font-black text-xl text-gray-900">
                        <span>Total Bill</span>
                        <span>₹{(order.totalAmountINR * 1.05).toFixed(2)}</span>
                    </div>
                </div>
            </main>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 m-4 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm animate-pulse">
                    <span className="text-xl">⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            <div className="p-4 space-y-3 pb-8">
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
