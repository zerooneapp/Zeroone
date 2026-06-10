import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const SecuritySettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await api.delete('/users/profile');
      toast.success('Account deleted successfully');
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-gray-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* 🛡️ HEADER */}
      <header className="px-2.5 pt-[46px] pb-3 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all"
          >
            <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
          </button>
          <div className="leading-none">
            <h1 className="font-extrabold text-[15px] text-[#00246b] dark:text-white tracking-tight">
              Security
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-6 pb-24 space-y-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Danger Zone</label>
          </div>
          
          {/* Warning Box with Red Border */}
          <div className="p-5 bg-red-500/5 dark:bg-red-500/5 rounded-2xl border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.02)] space-y-3">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle size={20} strokeWidth={2.5} />
              <h3 className="text-[14px] font-black tracking-tight leading-none">Warning</h3>
            </div>
            <p className="text-[12px] font-semibold text-red-600/80 dark:text-red-400/80 leading-relaxed">
              Deleting your account will permanently remove all of your profile information, bookings, active memberships, saved addresses, and payment methods. This action is irreversible.
            </p>
          </div>

          {/* Delete Account Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-red-500/30 dark:border-red-500/30 text-red-500 dark:text-red-400 font-black tracking-widest text-[12px] active:scale-95 transition-all shadow-sm"
          >
            <Trash2 size={16} strokeWidth={3} />
            Delete Account
          </button>
        </section>
      </main>

      {/* 🗑️ DELETE ACCOUNT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            key="delete-confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
          >
            <div
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl relative z-10 p-5 text-center border border-red-500/20"
            >
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100/50">
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Delete Account</h3>
              <p className="text-[12px] text-slate-400 dark:text-gray-500 mt-1.5 leading-relaxed font-bold">
                Are you sure you want to permanently delete your account? This action cannot be undone.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-xl font-black text-[11px] capitalize tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-[11px] capitalize tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecuritySettings;
