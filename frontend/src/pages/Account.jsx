import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, LogOut,
  ChevronRight, ArrowLeft, Shield, CreditCard, Bell, Settings, Trash2, AlertTriangle, Crown, HelpCircle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/Button';

const Account = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };




  const menuItems = [
    { icon: User, label: 'Personal Information', sub: 'Name, phone, and DOB', path: '/account/info', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: MapPin, label: 'Saved Addresses', sub: 'Home, office, and more', path: '/account/addresses', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: CreditCard, label: 'Payment Methods', sub: 'Cards, UPI, and Wallets', path: '/account/payments', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Shield, label: 'Security', sub: 'Delete Account', path: '/account/security', color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { icon: Crown, label: 'My Memberships', sub: 'Active plans & benefits', path: '/account/memberships', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: Settings, label: 'Preferences', sub: 'Theme', path: '/account/preferences', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { icon: HelpCircle, label: 'Help Desk', sub: 'Contact Support & Tickets', path: '/account/helpdesk', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 animate-in fade-in duration-500 pb-28">


      <div className="flex flex-col items-center pt-24 pb-4">
        <div 
          onClick={() => navigate('/account/info')}
          className="relative group cursor-pointer"
        >
          <div className="w-20 h-20 rounded-full bg-[#00246b] dark:bg-primary shadow-xl flex items-center justify-center border-[3px] border-white dark:border-gray-900 overflow-hidden transition-transform active:scale-95 duration-300">
            {user?.image ? (
              <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[28px] font-black text-white capitalize tracking-tighter">
                {user?.name ? user.name.charAt(0) : 'U'}
              </span>
            )}
          </div>

        </div>
        
        <div className="text-center mt-5 space-y-0.5">
          <h2 className="text-lg font-black text-[#00246b] dark:text-white tracking-tight leading-none capitalize">
            {user?.name || 'Guest User'}
          </h2>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-1.5">
        {menuItems.map((item, i) => (
          <div
            key={item.label}
            onClick={() => item.path && navigate(item.path)}
            className="group bg-white dark:bg-gray-900 py-2 px-3.5 rounded-xl border border-[#00246b]/10 dark:border-gray-800 flex items-center gap-3.5 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center transition-colors ${item.bg} ${item.color}`}>
              <item.icon size={18} strokeWidth={2.5} />
            </div>
            <div className="flex-1 leading-none">
              <p className="text-[14px] font-black text-[#00246b] dark:text-white tracking-tight leading-none">{item.label}</p>
              <p className="text-[10px] font-black text-[#00246b]/40 dark:text-slate-400 tracking-tight mt-1.5 truncate leading-none">{item.sub}</p>
            </div>
            <ChevronRight size={14} strokeWidth={3} className="text-slate-200 dark:text-gray-700 transition-colors" />
          </div>
        ))}
      </div>

      {/* Logout Action */}
      <div className="px-4 mt-4 space-y-2">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-red-500/30 dark:border-red-500/30 text-red-500 dark:text-red-400 font-black tracking-widest text-[11px] active:scale-95 transition-all shadow-sm"
        >
          <LogOut size={16} strokeWidth={3} />
          Log Out of Account
        </button>
      </div>


      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl relative z-10 p-5 text-center"
            >
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100/50">
                <LogOut size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Confirm Logout</h3>
              <p className="text-[12px] text-slate-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to log out? You will need to login again.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-xl font-black text-[11px] capitalize tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-[11px] capitalize tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}



      </AnimatePresence>
    </div>
  );
};

export default Account;
