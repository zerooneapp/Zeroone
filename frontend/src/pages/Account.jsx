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
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      <div className="px-5 pt-10">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Profile</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage your account</p>
      </div>

      <div className="px-5 mt-8">
        <div 
          className="bg-primary p-4 rounded-3xl text-white shadow-xl shadow-primary/30 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
               <User size={24} className="text-white" />
            </div>
            <div className="space-y-0.5">
               <h2 className="text-lg font-black truncate max-w-[200px]">{user?.name || 'Guest User'}</h2>
               <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">{user?.role || 'Customer'}</p>
               <div className="flex items-center gap-2 mt-2 opacity-80">
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 text-[10px] font-black uppercase tracking-tighter shadow-sm border border-white/10">PRO USER</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-4">
        {menuItems.map((item, i) => (
          <div 
            key={item.label}
            className="group bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-50 dark:border-gray-800 flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
               <item.icon size={18} />
            </div>
            <div className="flex-1">
               <p className="font-bold text-sm dark:text-gray-200">{item.label}</p>
               <p className="text-[10px] text-gray-400 font-medium">{item.sub}</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
          </div>
        ))}
      </div>

      {/* Logout Action */}
      <div className="px-5 mt-6">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all group"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          Sign Out of Account
        </button>
      </div>
    </div>
  );
};

export default Account;
