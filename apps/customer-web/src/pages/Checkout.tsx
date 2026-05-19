import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { createOrder, loadRazorpay } from '../services/api';

export const Checkout = () => {
    const { items, getTotal, getGST, customerName, customerPhone, setCustomerDetails, updateQuantity, removeItem, clearCart, restaurantId, tableNumber } = useCartStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    const total = getTotal();
    const gst = getGST();
    const finalTotal = total + gst;

    const handlePlaceOrder = async (payOnline: boolean) => {
        if (!customerName || customerPhone.length < 10) return alert('Please enter valid Name and Phone.');

        setIsProcessing(true);
        try {
            const payload = {
                restaurantId: restaurantId,
                tableId: tableNumber, // tableNumber in state holds the Mongo ID from the QR code
                items: items.map(i => ({
                    menuItemId: i.menuItemId,
                    name: i.name,
                    variantName: i.variantName,
                    quantity: i.quantity,
                    priceAtOrderTime: i.price,
                    notes: i.notes
                })),
                customerName,
                customerPhone,
                paymentMode: payOnline ? 'RAZORPAY' : 'PAY_AT_COUNTER'
            };

            const res = await createOrder(payload);

            if (payOnline) {
                const scriptLoaded = await loadRazorpay();
                if (!scriptLoaded) throw new Error('Razorpay load failed');

                const options = {
                    key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
                    amount: Math.round(finalTotal * 100),
                    currency: 'INR',
                    name: 'Restaurant Name',
                    description: 'Food Order',
                    order_id: res.razorpayOrderId,
                    handler: function (response: any) {
                        clearCart();
                        navigate(`/tracking/${res.orderId}`);
                    },
                    prefill: {
                        name: customerName,
                        contact: customerPhone
                    },
                    theme: { color: '#B91C1C' }
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
                setIsProcessing(false);
            } else {
                clearCart();
                if (tableNumber) {
                    navigate('/table-order');
                } else {
                    navigate(`/tracking/${res.orderId}`);
                }
            }
        } catch (e) {
            console.error(e);
            alert('Order failed. Please try again.');
            setIsProcessing(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <h2 className="text-xl font-bold text-gray-500 mb-4">Your cart is empty</h2>
                <button onClick={() => navigate('/menu')} className="bg-brand-600 text-white max-w-sm px-6 py-3 rounded-xl font-bold w-full">Back to Menu</button>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col pb-6">
            <header className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 border rounded-xl"><ArrowLeft size={20} /></button>
                <h1 className="text-xl font-bold">Review Order</h1>
            </header>

            <main className="flex-1 p-4 space-y-4">
                {/* Items List */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="font-bold text-gray-900 mb-4">Your Items ({items.length})</h2>
                    {items.map(item => (
                        <div key={item.id} className="flex justify-between items-start mb-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0 last:mb-0">
                            <div className="flex-1 pr-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded border flex items-center justify-center p-[2px]`}>
                                        <div className={`w-full h-full rounded-sm ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                    </div>
                                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                                </div>
                                {item.variantName && <p className="text-xs text-gray-500 mt-1 ml-5">Option: {item.variantName}</p>}
                                <p className="font-bold text-brand-600 mt-1 ml-5">₹{item.price * item.quantity}</p>
                            </div>

                            <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                <button
                                    onClick={() => {
                                        if (item.quantity === 1) removeItem(item.id);
                                        else updateQuantity(item.id, -1);
                                    }}
                                    className="px-3 py-1 font-bold text-brand-600 hover:bg-gray-200"
                                >-</button>
                                <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1 font-bold text-brand-600 hover:bg-gray-200">+</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* User Details */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-bold text-gray-900">Your Details</h2>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Phone Number</label>
                        <input
                            type="tel"
                            value={customerPhone}
                            onChange={async (e) => {
                                const phone = e.target.value;
                                setCustomerDetails(customerName, phone);
                                if (phone.length === 10) {
                                    try {
                                        const { lookupCustomer } = await import('../services/api');
                                        const data = await lookupCustomer(restaurantId || '', phone);
                                        if (data.name) {
                                            setCustomerDetails(data.name, phone);
                                        }
                                    } catch (err) {
                                        // Ignore
                                    }
                                }
                            }}
                            placeholder="10 digit mobile number"
                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:border-brand-500"
                            maxLength={10}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Name</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={e => setCustomerDetails(e.target.value, customerPhone)}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:border-brand-500"
                        />
                    </div>
                </div>

                {/* Bill Details */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="font-bold text-gray-900 mb-3">Bill Summary</h2>
                    <div className="flex justify-between text-sm text-gray-600 mb-2"><span>Item Total</span><span>₹{total.toFixed(2)}</span></div>
                    {gst > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-2"><span>Taxes & GST</span><span>₹{gst.toFixed(2)}</span></div>
                    )}
                    <div className="border-t border-dashed my-3"></div>
                    <div className="flex justify-between font-black text-lg text-gray-900"><span>Grand Total</span><span>₹{finalTotal.toFixed(2)}</span></div>
                </div>
            </main>

            <div className="p-4 space-y-3 mt-auto">
                {tableNumber ? (
                    <button
                        disabled={isProcessing}
                        onClick={() => handlePlaceOrder(false)}
                        className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-brand-700 disabled:opacity-50"
                    >
                        {isProcessing ? 'Processing...' : `Send to Kitchen`}
                    </button>
                ) : (
                    <>
                        <button
                            disabled={isProcessing}
                            onClick={() => handlePlaceOrder(true)}
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isProcessing ? 'Processing...' : `Pay ₹${finalTotal.toFixed(2)} Securely`}
                        </button>
                        <button
                            disabled={isProcessing}
                            onClick={() => handlePlaceOrder(false)}
                            className="w-full border-2 border-brand-200 text-brand-700 font-bold py-3.5 rounded-2xl hover:bg-brand-50 disabled:opacity-50"
                        >
                            Pay at Counter
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
