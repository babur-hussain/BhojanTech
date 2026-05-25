import { useState, useRef, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createOrder, loadRazorpay, api, updateProfile } from '../services/api';
import { auth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';

export const Checkout = () => {
    const { items, getTotal, getGST, customerName, customerPhone, setCustomerDetails, updateQuantity, removeItem, clearCart, restaurantId, tableNumber } = useCartStore();
    const { isAuthenticated, user, setUser } = useAuthStore();
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Auth State for Inline Login
    const [dob, setDob] = useState('');
    const [otp, setOtp] = useState('');
    const [otpStep, setOtpStep] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [authError, setAuthError] = useState('');
    const [checkoutError, setCheckoutError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    const navigate = useNavigate();

    const total = getTotal();
    const gst = getGST();
    const finalTotal = total + gst;

    // Sync logged-in user to cartStore
    useEffect(() => {
        if (isAuthenticated && user) {
            setCustomerDetails(user.displayName || '', user.phoneNumber.replace('+91', ''));
        }
    }, [isAuthenticated, user, setCustomerDetails]);

    const getVerifier = async (): Promise<RecaptchaVerifier> => {
        if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
        const verifier = new RecaptchaVerifier(auth, 'checkout-recaptcha', { size: 'invisible' });
        await verifier.render();
        recaptchaVerifierRef.current = verifier;
        return verifier;
    };

    const handleSendOtp = async () => {
        setAuthError('');
        if (customerPhone.length !== 10) return setAuthError('Enter a valid 10-digit number');
        if (!customerName.trim()) return setAuthError('Please enter your name');

        setIsVerifying(true);
        try {
            const verifier = await getVerifier();
            const result = await signInWithPhoneNumber(auth, `+91${customerPhone}`, verifier);
            setConfirmationResult(result);
            setOtpStep(true);
        } catch (err: any) {
            console.error(err);
            setAuthError('Failed to send OTP. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerifyOtp = async () => {
        setAuthError('');
        if (!confirmationResult || otp.length !== 6) return setAuthError('Enter 6-digit OTP');

        setIsVerifying(true);
        try {
            const credential = await confirmationResult.confirm(otp);
            const firebaseUser = credential.user;
            const firebaseToken = await firebaseUser.getIdToken();
            
            const { data } = await api.post('/auth/customer-login', { firebaseToken, restaurantId });
            setUser({
                uid: firebaseUser.uid,
                phoneNumber: firebaseUser.phoneNumber || `+91${customerPhone}`,
                token: data.token,
                displayName: customerName,
            });
            await signOut(auth);

            // Update profile with name and dob
            if (dob || customerName) {
                await updateProfile({ name: customerName, dob: dob || undefined });
            }

            setOtpStep(false);
        } catch (err: any) {
            console.error(err);
            setAuthError('Invalid OTP');
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePlaceOrder = async (payOnline: boolean) => {
        setCheckoutError('');
        if (!isAuthenticated) {
            if (!customerName || customerPhone.length < 10) {
                setCheckoutError('Please enter your Name and a valid 10-digit Phone number to continue.');
                return;
            }
            if (!otpStep) {
                await handleSendOtp();
                return;
            } else {
                setCheckoutError('Please verify your OTP first before placing the order.');
                return;
            }
        }

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
                    handler: function (_response: any) {
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
            setCheckoutError('Order failed. Please try again.');
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
            <div id="checkout-recaptcha"></div>
            <header className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 border rounded-xl"><ArrowLeft size={20} /></button>
                <h1 className="text-xl font-bold">Review Order</h1>
            </header>

            <main className="p-4 space-y-4">
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
                {!isAuthenticated && (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-gray-900">Your Details</h2>
                            {otpStep && <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">OTP Sent</span>}
                        </div>
                        
                        {!otpStep ? (
                            <>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Phone Number *</label>
                                    <div className="flex gap-2">
                                        <span className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm">
                                            +91
                                        </span>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={e => setCustomerDetails(customerName, e.target.value.replace(/\D/g, ''))}
                                            placeholder="10 digit mobile number"
                                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:border-brand-500"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Name *</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={e => setCustomerDetails(e.target.value, customerPhone)}
                                        placeholder="e.g. Rahul Sharma"
                                        className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Date of Birth (Optional)</label>
                                    <input
                                        type="date"
                                        value={dob}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={e => setDob(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:border-brand-500"
                                    />
                                </div>
                                {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
                                <button
                                    onClick={handleSendOtp}
                                    disabled={isVerifying}
                                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isVerifying ? <Loader2 size={18} className="animate-spin" /> : 'Verify to Continue'}
                                </button>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">Enter the 6-digit code sent to +91 {customerPhone}</p>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter OTP"
                                    className="w-full text-center tracking-[0.5em] text-lg bg-gray-50 border border-gray-200 p-4 rounded-xl font-black focus:outline-none focus:border-brand-500"
                                />
                                {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setOtpStep(false)}
                                        className="w-1/3 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleVerifyOtp}
                                        disabled={isVerifying || otp.length !== 6}
                                        className="flex-1 bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isVerifying ? <Loader2 size={18} className="animate-spin" /> : 'Confirm OTP'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

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

                {checkoutError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm animate-pulse">
                        <span className="text-xl">⚠️</span>
                        <span>{checkoutError}</span>
                    </div>
                )}
            </main>

            <div className="p-4 space-y-3">
                {(!isAuthenticated && !otpStep) ? (
                     <button
                        onClick={handleSendOtp}
                        className="w-full bg-gray-200 text-gray-500 font-bold py-4 rounded-2xl shadow-sm opacity-70 cursor-not-allowed"
                     >
                        Verify details to order
                     </button>
                ) : tableNumber ? (
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
