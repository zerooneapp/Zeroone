import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, LogOut,
  ChevronRight, Shield, CreditCard, Bell, Settings
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
    { icon: User, label: 'Personal Information', sub: 'Name, email, and phone' },
    { icon: MapPin, label: 'Saved Addresses', sub: 'Home, office, and more' },
    { icon: CreditCard, label: 'Payment Methods', sub: 'Cards, UPI, and Wallets' },
    { icon: Bell, label: 'Notification Settings', sub: 'Manage alerts & updates' },
    { icon: Shield, label: 'Security', sub: 'Passwords & permissions' },
    { icon: Settings, label: 'Preferences', sub: 'Theme, language, & region' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20 animate-in fade-in duration-500">
      <div className="px-4 pt-8">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Profile</h1>
        <p className="text-[8px] font-black text-slate-400 tracking-widest mt-1.5 opacity-60">Manage your elite account</p>
      </div>

      <div className="px-4 mt-6">
        <div
          className="bg-slate-900 p-3.5 rounded-2xl text-white shadow-2xl relative overflow-hidden border border-white/5"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <User size={20} strokeWidth={3} className="text-white" />
            </div>
            <div className="space-y-0.5 leading-none">
              <h2 className="text-[14px] font-black tracking-tight truncate max-w-[180px]">{user?.name || 'Guest user'}</h2>
              <p className="text-[8px] font-black text-white/40 tracking-widest mt-0.5">{user?.role || 'Customer'}</p>
              <div className="flex items-center gap-2 mt-2 opacity-80">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[8px] font-black tracking-widest shadow-sm border border-white/10 italic">Pro user</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-2">
        {menuItems.map((item, i) => (
          <div
            key={item.label}
            className="group bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-[#1C2C4E]/10 dark:border-gray-800 flex items-center gap-3 active:scale-[0.98] transition-all shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)]"
          >
            <div className="w-9 h-9 rounded-[10px] bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors border border-slate-100 dark:border-gray-700">
              <item.icon size={16} strokeWidth={3} />
            </div>
            <div className="flex-1 leading-none">
              <p className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight">{item.label}</p>
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-widest mt-0.5 opacity-60 truncate">{item.sub}</p>
            </div>
            <ChevronRight size={14} strokeWidth={3} className="text-slate-200 dark:text-gray-700 transition-colors" />
          </div>
        ))}
      </div>

      {/* Logout Action */}
      <div className="px-4 mt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-white dark:bg-red-900/10 border border-[#1C2C4E]/10 dark:border-red-900/20 text-red-500 font-black tracking-widest text-[9px] active:scale-95 transition-all shadow-sm border-b-2 border-slate-100"
        >
          <LogOut size={16} strokeWidth={3} />
          Sign out of account
        </button>
      </div>
    </div>
  );
};

export default Account;
