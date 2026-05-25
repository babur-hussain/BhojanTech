import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../services/api';
import { User, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Onboarding = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { user, setUser } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) {
            setError('Please enter your full name to continue.');
            return;
        }

        setIsLoading(true);
        try {
            const updatedCustomer = await updateProfile({ name, dob: dob || undefined });
            if (user) {
                // Update local store name
                setUser({ ...user, displayName: updatedCustomer.name });
            }
            navigate('/menu', { replace: true });
        } catch (error) {
            console.error(error);
            setError('Failed to update profile. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col p-6">
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-2">Complete Your Profile</h1>
                    <p className="text-gray-500 text-sm">Please tell us a bit about yourself so we can personalize your experience and send you birthday treats! 🎁</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Full Name *</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Rahul Sharma"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Date of Birth (Optional)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Calendar size={18} />
                            </div>
                            <input
                                type="date"
                                value={dob}
                                max={new Date().toISOString().split('T')[0]} // Cannot be in future
                                onChange={(e) => setDob(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 ml-1">We'll use this to send you special birthday rewards!</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm animate-pulse">
                            <span className="text-xl">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isLoading ? 'Saving...' : 'Save & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
};
