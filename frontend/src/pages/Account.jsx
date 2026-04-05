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
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20 animate-in fade-in duration-500">
      <header className="px-4 pt-4 pb-2 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-40 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
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
        <p className="text-[9px] font-black text-[#1C2C4E]/60 tracking-widest mt-2 ml-1 opacity-80">Manage your elite account</p>
      </header>

      <div className="px-4 mt-2">
        <div
          className="bg-slate-900 p-3.5 rounded-2xl text-white shadow-2xl relative overflow-hidden border border-white/5"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <User size={20} strokeWidth={3} className="text-white" />
            </div>
            <div className="space-y-0.5 leading-none">
              <h2 className="text-[15px] font-black tracking-tight truncate max-w-[180px]">{user?.name || 'Guest user'}</h2>
              <p className="text-[10px] font-black text-white/40 tracking-widest mt-0.5">{user?.role || 'Customer'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-1.5 space-y-1.5">
        {menuItems.map((item, i) => (
          <div
            key={item.label}
            onClick={() => item.path && navigate(item.path)}
            className="group bg-white dark:bg-gray-900 py-2 px-3.5 rounded-xl border border-[#1C2C4E]/10 dark:border-gray-800 flex items-center gap-3.5 active:scale-[0.98] transition-all shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)] cursor-pointer"
          >
            <div className="w-10 h-10 rounded-[10px] bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors border border-slate-100 dark:border-gray-700">
              <item.icon size={18} strokeWidth={3} />
            </div>
            <div className="flex-1 leading-none">
              <p className="text-[14px] font-black text-slate-900 dark:text-white tracking-tight">{item.label}</p>
              <p className="text-[11px] font-black text-[#1C2C4E]/60 dark:text-slate-500 tracking-widest mt-0.5 truncate">{item.sub}</p>
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
