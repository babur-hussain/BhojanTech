import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { auth } from '../config/firebase';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { Smartphone, ShieldCheck, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { OTPInput } from '../components/OTPInput';

export const Login = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((s) => s.setUser);

  // Stable refs — survive re-renders, never touch React-owned DOM
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);

  /**
   * Lazily create the RecaptchaVerifier on first use, then reuse it.
   * On subsequent calls, reset the existing widget for a fresh token
   * via grecaptcha.reset() — no DOM manipulation needed.
   */
  const getVerifier = async (): Promise<RecaptchaVerifier> => {
    // If we already have a verifier, just reset the widget for a fresh token
    if (recaptchaVerifierRef.current) {
      try {
        const g = (window as any).grecaptcha;
        if (g && recaptchaWidgetIdRef.current != null) {
          g.reset(recaptchaWidgetIdRef.current);
        }
      } catch {
        // reset failed — will still try to use verifier as-is
      }
      return recaptchaVerifierRef.current;
    }

    // First time: create and render the verifier
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
    const widgetId = await verifier.render();
    recaptchaVerifierRef.current = verifier;
    recaptchaWidgetIdRef.current = widgetId;
    return verifier;
  };

  // Where to redirect after login (from router state or default)
  const from = (location.state as any)?.from || '/my-account';

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    setError('');
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    try {
      const verifier = await getVerifier();
      const phoneWithCode = `+91${phone}`;

      const result = await signInWithPhoneNumber(auth, phoneWithCode, verifier);
      setConfirmationResult(result);
      setStep('OTP');
      setResendTimer(30);
    } catch (err: any) {
      console.error('OTP send error:', err);

      const errorCode = err.code || '';
      switch (errorCode) {
        case 'auth/invalid-phone-number':
          setError('Invalid phone number. Please check and try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please wait a few minutes before trying again.');
          break;
        case 'auth/invalid-app-credential':
          setError('Authentication configuration error. Please contact support.');
          break;
        case 'auth/captcha-check-failed':
          setError('reCAPTCHA verification failed. Please try again.');
          break;
        case 'auth/quota-exceeded':
          setError('SMS quota exceeded. Please try again later.');
          break;
        case 'auth/missing-phone-number':
          setError('Please enter a valid phone number.');
          break;
        case 'auth/operation-not-allowed':
          setError('Phone authentication is not enabled. Please contact support.');
          break;
        default:
          setError('Failed to send OTP. Please try again.');
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (!confirmationResult) return;
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const credential = await confirmationResult.confirm(otp);
      const firebaseUser = credential.user;
      const firebaseToken = await firebaseUser.getIdToken();

      // Exchange Firebase token for backend JWT
      const { data } = await api.post('/auth/customer-login', { firebaseToken, restaurantId: useCartStore.getState().restaurantId });

      setUser({
        uid: firebaseUser.uid,
        phoneNumber: firebaseUser.phoneNumber || `+91${phone}`,
        token: data.token,
        displayName: data.customer?.name || firebaseUser.displayName || `+91${phone}`,
      });

      // Sign out of Firebase (we use our own JWT now)
      await signOut(auth);

      if (!data.customer?.name || data.customer?.name === 'Guest') {
        navigate('/onboarding', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error('OTP verify error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Incorrect OTP. Please try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('OTP has expired. Please request a new one.');
        setStep('PHONE');
      } else if (err.response?.status === 401) {
        setError('Authentication failed. Please try again.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtp('');
    setStep('PHONE');
    setConfirmationResult(null);
    setError('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      {/* Invisible reCAPTCHA container - Rendered persistently to avoid DOM wipeouts */}
      <div id="recaptcha-container"></div>

      {/* Back Button */}
      <button
        onClick={() => {
          if (step === 'OTP') {
            setStep('PHONE');
            setError('');
          } else {
            navigate(-1);
          }
        }}
        className="absolute top-6 left-6 p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-orange-600 hover:shadow-lg transition-all"
      >
        <ArrowLeft size={22} />
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-lg mb-2 transition-all duration-500 ${step === 'PHONE'
                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
                : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
              }`}
          >
            {step === 'PHONE' ? <Smartphone size={36} /> : <ShieldCheck size={36} />}
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            {step === 'PHONE' ? 'Sign In' : 'Verify OTP'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {step === 'PHONE'
              ? 'Enter your mobile number to access rewards & order history.'
              : `Enter the 6-digit code sent to\n+91 ${phone}`}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-4">
            {step === 'PHONE' ? (
              <>
                {/* Phone Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 font-semibold text-sm">
                      🇮🇳 +91
                    </span>
                    <input
                      id="phone-input"
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        setError('');
                        setPhone(e.target.value.replace(/\D/g, ''));
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                      placeholder="10-digit number"
                      autoFocus
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 font-semibold text-gray-900 text-base focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl border border-red-100">
                    <span className="text-base">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Send OTP Button */}
                <button
                  id="send-otp-btn"
                  onClick={handleSendOtp}
                  disabled={phone.length !== 10 || loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-orange-200 hover:shadow-orange-300 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending OTP…
                    </>
                  ) : (
                    <>
                      <Smartphone size={18} />
                      Get OTP
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* OTP Input */}
                <div>
                  <OTPInput value={otp} onChange={setOtp} length={6} onComplete={handleVerifyOtp} />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl border border-red-100 mb-4">
                    <span className="text-base">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Verify Button */}
                <button
                  id="verify-otp-btn"
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-green-200 hover:shadow-green-300 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      Verify &amp; Login
                    </>
                  )}
                </button>

                {/* Resend */}
                <div className="flex items-center justify-center gap-2 pt-1 mt-2">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-gray-400">
                      Resend OTP in <span className="font-bold text-orange-500">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      <RefreshCw size={14} />
                      Resend OTP
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer note */}
          <div className="bg-gray-50 border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-400 text-center">
              🔒 Secured with Firebase Authentication
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          By continuing, you agree to receive an OTP on your registered mobile number.
        </p>
      </div>
    </div>
  );
};
