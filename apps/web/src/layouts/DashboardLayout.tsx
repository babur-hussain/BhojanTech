import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import BranchSelector from '../components/BranchSelector';
import { UserRole } from '@restaurant/types';
import GlobalSoundPlayer from '../components/GlobalSoundPlayer';
import { useGlobalSettingsStore } from '../store/globalSettingsStore';
import { Volume2, VolumeX } from 'lucide-react';
import { playNewOrderAlert } from '../utils/audio';

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const { globalMuted, globalVolume, setGlobalMuted, setGlobalVolume } = useGlobalSettingsStore();

  if (loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If user is OWNER/SUPER_OWNER but hasn't set up a restaurant
  const needsSetup = (user.role === UserRole.SUPER_OWNER || user.role === UserRole.OWNER) && !user.restaurantId;
  if (needsSetup) {
    return <Navigate to="/setup" />;
  }

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-8 z-10">
          <div className="text-xl font-black tracking-tight text-gray-900">
            <span className="text-saffron">Resto</span>OS
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGlobalMuted(!globalMuted)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title={globalMuted ? "Unmute Notifications" : "Mute Notifications"}
              >
                {globalMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05" value={globalMuted ? 0 : globalVolume}
                onChange={e => { setGlobalVolume(+e.target.value); setGlobalMuted(false); }}
                className="w-20 accent-amber-500 cursor-pointer"
                title="Notification Volume"
              />
              <button
                onClick={() => !globalMuted && playNewOrderAlert(globalVolume)}
                className="text-[10px] text-gray-500 hover:text-gray-700 uppercase font-bold"
                title="Test Sound"
              >
                Test
              </button>
            </div>
            <BranchSelector />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-cream p-6">
          <GlobalSoundPlayer />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
