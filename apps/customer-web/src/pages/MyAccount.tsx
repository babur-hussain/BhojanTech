import { useNavigate } from 'react-router-dom';
import { User, Gift, Crown, History, LogOut, ChevronRight, Share2 } from 'lucide-react';

export const MyAccount = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('customer_token');
        navigate('/menu');
    };

    // Mock Customer profile
    const profile = {
        name: 'Rahul Sharma',
        phone: '+91 98765 43210',
        tier: 'GOLD',
        points: 450,
        visits: 8,
        referralCode: 'RAHUL50',
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-brand-700 text-white px-5 pt-8 pb-12 rounded-b-[2.5rem] shadow-lg relative">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-black">{profile.name}</h1>
                        <p className="text-white text-opacity-80 text-sm">{profile.phone}</p>
                    </div>
                    <button className="bg-white bg-opacity-20 p-2 rounded-full backdrop-blur-sm">
                        <User size={20} />
                    </button>
                </div>

                {/* Loyalty Card */}
                <div className="absolute -bottom-16 left-5 right-5 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl text-white transform hover:-translate-y-1 transition-transform border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Crown size={24} className="text-yellow-400" />
                            <span className="font-black tracking-widest text-yellow-400 text-sm">GOLD MEMBER</span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">8 Visits</p>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Available Points</p>
                            <div className="flex items-baseline gap-1">
                                <h2 className="text-4xl font-black">{profile.points}</h2>
                                <span className="text-sm text-gray-400 font-medium">pts</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 mb-1">Value</p>
                            <p className="font-bold text-lg">₹{(profile.points * 0.5).toFixed(0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 pt-24 pb-8 space-y-4">
                {/* Referral Section */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Refer & Earn <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded ml-1">50 Pts</span></h3>
                        <p className="text-gray-500 text-xs mt-0.5">Share your code: <b className="text-gray-800">{profile.referralCode}</b></p>
                    </div>
                    <button className="bg-saffron-500 bg-opacity-10 text-saffron-500 p-2.5 rounded-xl hover:bg-opacity-20">
                        <Share2 size={18} />
                    </button>
                </div>

                {/* Menu Options */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button onClick={() => navigate('/menu')} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-50 text-orange-500 p-2 rounded-lg"><Gift size={20} /></div>
                            <span className="font-semibold text-gray-800">Order & Earn Rewards</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-400" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 text-blue-500 p-2 rounded-lg"><History size={20} /></div>
                            <span className="font-semibold text-gray-800">Visit History</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-400" />
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-50 text-red-600 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-50 p-2 rounded-lg"><LogOut size={20} /></div>
                            <span className="font-semibold">Log Out</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
