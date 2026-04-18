import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, LogOut,
  ChevronRight, ArrowLeft, Shield, CreditCard, Bell, Settings, Trash2, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/Button';

const Account = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await api.delete('/users/profile');
      toast.success('Account deleted successfully');
      logout();
      navigate('/login');
    } catch (err) {
      toast.error('Deletion failed');
    } finally {
      setDeleting(false);
    }
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
      <header className="p-2.5 py-3 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all"
          >
            <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
          </button>
          <div className="leading-none">
            <h1 className="font-extrabold text-[15px] text-[#1C2C4E] dark:text-white tracking-tight">
              Profile
            </h1>
          </div>
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
      <div className="px-4 mt-4 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#1C2C4E]/10 dark:border-gray-800 text-slate-600 dark:text-gray-400 font-black tracking-widest text-[11px] active:scale-95 transition-all shadow-sm"
        >
          <LogOut size={16} strokeWidth={3} />
          Sign out of account
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/20 text-red-500 font-black tracking-widest text-[11px] active:scale-95 transition-all"
        >
          <Trash2 size={16} strokeWidth={3} />
          Delete my account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10 p-5 text-center"
            >
              <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">Delete Account?</h3>
              <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 mt-2 uppercase tracking-widest">
                This action is permanent and cannot be undone. All your data will be lost.
              </p>
              <div className="flex gap-2 mt-6">
                <button
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-xl font-bold text-xs disabled:opacity-50"
                >
                  Keep Account
                </button>
                <button
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-black text-xs shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {deleting ? 'Wait...' : 'Delete'}
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
