import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import { Bell, MapPin, Heart, ChevronDown } from 'lucide-react';

const Header = ({ onOpenNotifications }) => {
  const { user } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const cleanAddress = (addr) => {
    if (!addr) return '';
    // Remove Hindi characters (Devanagari range: \u0900-\u097F)
    return addr.replace(/[\u0900-\u097F]/g, '').replace(/\s\s+/g, ' ').trim();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl px-4 pt-[46px] pb-2 border-b border-slate-100 dark:border-gray-800 shadow-sm">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand & Location HUD */}
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-[26px] font-black tracking-tighter leading-none flex items-center">
            <span className="text-[#1C2C4E] dark:text-white">Zero</span>
            <span className="text-[#1C2C4E]/30 dark:text-gray-600">One</span>
          </h1>
          <button
            onClick={() => navigate('/account/addresses')}
            className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-[#1C2C4E] transition-colors group"
          >
            <MapPin size={10} className="text-[#1C2C4E] dark:text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="truncate max-w-[150px] uppercase tracking-widest">
              {cleanAddress(user?.address?.split(',')[0]) || 'Select Location'}
            </span>
            <ChevronDown size={10} strokeWidth={4} className="text-slate-400 opacity-60 group-hover:text-[#1C2C4E] transition-colors" />
          </button>
        </div>

        {/* Right: Premium Action HUD */}
        <div className="flex items-center gap-1">


          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 text-[#1C2C4E] dark:text-gray-300 hover:opacity-70 active:scale-90 transition-all"
          >
            <Bell size={18} strokeWidth={2.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm animate-pulse" />
            )}
          </button>

          <button
            onClick={() => navigate('/favorites')}
            className="p-1.5 text-[#1C2C4E] dark:text-gray-300 hover:opacity-70 active:scale-90 transition-all"
          >
            <Heart size={19} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
