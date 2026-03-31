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
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="px-5 pt-10">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Profile</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage your account</p>
      </div>

      {/* User Card */}
      <div className="px-5 mt-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary p-8 rounded-[3rem] text-white shadow-2xl shadow-primary/30 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
               <User size={40} className="text-white" />
            </div>
            <div className="space-y-1">
               <h2 className="text-2xl font-black truncate max-w-[200px]">{user?.name || 'Guest User'}</h2>
               <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{user?.role || 'Customer'}</p>
               <div className="flex items-center gap-2 mt-2 opacity-80">
                  <span className="px-2 py-0.5 rounded-lg bg-white/20 text-[10px] font-black uppercase tracking-tighter shadow-sm border border-white/10">PRO USER</span>
               </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Menu List */}
      <div className="px-5 mt-10 space-y-4">
        {menuItems.map((item, i) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group bg-white dark:bg-gray-900 p-5 rounded-[2rem] border border-gray-50 dark:border-gray-800 flex items-center gap-4 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
               <item.icon size={20} />
            </div>
            <div className="flex-1">
               <p className="font-bold text-sm dark:text-gray-200">{item.label}</p>
               <p className="text-[10px] text-gray-400 font-medium">{item.sub}</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
          </motion.div>
        ))}
      </div>

      {/* Logout Action */}
      <div className="px-5 mt-10">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-4 p-6 rounded-[2.5rem] bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/20 text-red-500 font-black uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-all group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          Sign Out of Account
        </button>
      </div>
    </div>
  );
};

export default Account;
