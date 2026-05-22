import React, { useState } from 'react';
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Utensils } from 'lucide-react';
import { OTPInput } from '../components/OTPInput';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await login(token);
      navigate('/');
    } catch (error) {
      console.error('Google sign in error', error);
      setError('Failed to sign in with Google');
    }
  };

  const setupRecaptcha = () => {
    try {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
      }
    } catch (e) {
      // If it throws "already rendered", we can ignore or clear
      console.log("Recaptcha already initialized");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      setupRecaptcha();
      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier);
      setConfirmationResult(result);
    } catch (error: any) {
      console.error('Send OTP error', error);
      
      // Filter out scary internal Firebase messages and show user-friendly ones
      if (error.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format.');
      } else if (error.message && error.message.includes('reCAPTCHA has already been rendered')) {
        // This is a known React StrictMode bug. If it happens, we forcefully clear and retry.
        if ((window as any).recaptchaVerifier) {
          (window as any).recaptchaVerifier.clear();
          (window as any).recaptchaVerifier = null;
        }
        document.getElementById('recaptcha-container')!.innerHTML = '';
        setError('Please click Send OTP again.');
      } else {
        setError(error.message || 'Failed to send OTP. Please try again.');
      }
      
      // Cleanup recaptcha so it doesn't get stuck
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const token = await result.user.getIdToken();
      await login(token);
      navigate('/');
    } catch (error: any) {
      console.error('Verify OTP error', error);
      setError(error.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex justify-center h-12 w-12 rounded-full bg-saffron items-center text-white">
          <Utensils size={24} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-maroon">
          Indian Restaurant OS
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-saffron">
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div id="recaptcha-container"></div>

          {!confirmationResult ? (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    maxLength={10}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-saffron focus:border-saffron sm:text-sm"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={phone.length !== 10 || loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-maroon hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-center mb-4">
                  Enter 6-digit OTP sent to +91 {phone}
                </label>
                <div className="mt-1 flex justify-center">
                  <OTPInput value={otp} onChange={setOtp} length={6} />
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={otp.length !== 6 || loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-maroon hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>
              </div>
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationResult(null);
                    setOtp('');
                    setError('');
                  }}
                  className="text-sm text-maroon hover:text-saffron font-medium"
                >
                  Change Phone Number
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron"
              >
                Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
