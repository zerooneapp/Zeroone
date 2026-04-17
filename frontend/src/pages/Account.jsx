import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, LogOut,
  ChevronRight, ArrowLeft, Shield, CreditCard, Bell, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/Button';

const Account = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: User, label: 'Personal Information', sub: 'Name, email, and phone', path: '/account/info' },
    { icon: MapPin, label: 'Saved Addresses', sub: 'Home, office, and more', path: '/account/addresses' },
    { icon: CreditCard, label: 'Payment Methods', sub: 'Cards, UPI, and Wallets', path: '/account/payments' },
    { icon: Bell, label: 'Notification Settings', sub: 'Manage alerts & updates', path: '/account/notifications' },
    { icon: Shield, label: 'Security', sub: 'Passwords & permissions', path: '/account/security' },
    { icon: Settings, label: 'Preferences', sub: 'Theme, language, & region', path: '/account/preferences' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 animate-in fade-in duration-500 pb-28">
      <header className="px-4 pt-2 pb-2 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-40 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1 px-2 -ml-2 text-[#1C2C4E] dark:text-blue-400 active:scale-90 transition-all"
          >
            <ChevronRight className="rotate-180" size={18} strokeWidth={3} />
          </button>
          <h1 className="text-lg font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none">
            Profile
          </h1>
        </div>
      </header>

      <div className="flex flex-col items-center pt-2 pb-2">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full bg-[#1C2C4E] dark:bg-primary shadow-xl flex items-center justify-center border-[3px] border-white dark:border-gray-900 overflow-hidden transition-transform active:scale-95 duration-300">
            {user?.image ? (
              <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[28px] font-black text-white uppercase tracking-tighter">
                {user?.name ? user.name.charAt(0) : 'U'}
              </span>
            )}
          </div>
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md" />
        </div>
        
        <div className="text-center mt-3 space-y-0.5">
          <h2 className="text-lg font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none uppercase">
            {user?.name || 'Guest User'}
          </h2>
          <p className="text-[9px] font-black tracking-[0.2em] text-slate-400 dark:text-gray-500 uppercase mt-1">
            {user?.role || 'Customer'}
          </p>
        </div>
      </div>

      <div className="px-4 mt-2 space-y-1.5">
        {menuItems.map((item, i) => (
          <div
            key={item.label}
            onClick={() => item.path && navigate(item.path)}
            className="group bg-white dark:bg-gray-900 py-2 px-3.5 rounded-xl border border-[#1C2C4E]/10 dark:border-gray-800 flex items-center gap-3.5 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <div className="w-10 h-10 rounded-[10px] bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors border border-slate-100 dark:border-gray-700">
              <item.icon size={18} strokeWidth={3} />
            </div>
            <div className="flex-1 leading-none">
              <p className="text-[14px] font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none">{item.label}</p>
              <p className="text-[10px] font-black text-[#1C2C4E]/40 dark:text-slate-400 tracking-tight mt-1.5 truncate leading-none uppercase">{item.sub}</p>
            </div>
            <ChevronRight size={14} strokeWidth={3} className="text-slate-200 dark:text-gray-700 transition-colors" />
          </div>
        ))}
      </div>

      {/* Logout Action */}
      <div className="px-4 mt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-white dark:bg-red-900/10 border border-[#1C2C4E]/10 dark:border-red-900/20 text-red-500 font-black tracking-widest text-[11px] active:scale-95 transition-all shadow-sm border-b-2 border-slate-100"
        >
          <LogOut size={16} strokeWidth={3} />
          Sign out of account
        </button>
      </div>
    </div>
  );
};

export default Account;
