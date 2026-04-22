import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';

export const Login = () => {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const navigate = useNavigate();

    const handleSendOtp = () => {
        if (phone.length === 10) {
            setStep('OTP');
        }
    };

    const handleVerify = () => {
        if (otp.length === 4) {
            // Mock login success
            localStorage.setItem('customer_token', 'mock_token');
            navigate('/my-account');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-brand-50 p-6">
            <button 
                onClick={() => navigate(-1)} 
                className="absolute top-6 left-6 p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-brand-700 transition-colors"
            >
                <ArrowLeft size={24} />
            </button>
            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-700 text-white mb-6 shadow-lg">
                        {step === 'PHONE' ? <Smartphone size={32} /> : <ShieldCheck size={32} />}
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">
                        {step === 'PHONE' ? 'Welcome Back' : 'Verify Phone'}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        {step === 'PHONE'
                            ? 'Enter your phone number to view your rewards and order history.'
                            : `Enter the 4-digit OTP sent to +91 ${phone}`}
                    </p>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    {step === 'PHONE' ? (
                        <>
                            <div className="flex gap-2">
                                <span className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-gray-500 font-medium">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Mobile Number"
                                    className="flex-1 border border-gray-200 rounded-lg px-4 py-3 font-semibold focus:ring-saffron-500 focus:border-saffron-500 focus:outline-none"
                                />
                            </div>
                            <button
                                onClick={handleSendOtp}
                                disabled={phone.length !== 10}
                                className="w-full bg-brand-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send OTP <ArrowRight size={18} />
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                maxLength={4}
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="• • • •"
                                className="w-full border border-gray-200 rounded-lg px-4 py-4 text-center text-3xl tracking-widest font-bold focus:ring-saffron-500 focus:border-saffron-500 focus:outline-none"
                            />
                            <button
                                onClick={handleVerify}
                                disabled={otp.length !== 4}
                                className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-200"
                            >
                                Verify & Login
                            </button>
                            <button onClick={() => setStep('PHONE')} className="w-full text-sm text-gray-500 font-medium hover:text-brand-700 py-2">
                                Change Phone Number
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
