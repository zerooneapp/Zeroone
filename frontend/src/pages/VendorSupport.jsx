import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare, Trash2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';
import { useAuthStore } from '../store/authStore';

const VendorSupport = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const currentShopId = localStorage.getItem('activeVendorId') || user?.lastActiveVendorId;

  const [loading, setLoading] = useState(true);
  const [supportSettings, setSupportSettings] = useState({
    supportWhatsApp: '',
    supportPhone: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings/shared');
        setSupportSettings({
          supportWhatsApp: res.data?.supportWhatsApp || '',
          supportPhone: res.data?.supportPhone || ''
        });
      } catch (err) {
        toast.error('Failed to load support information');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const getWhatsAppLink = () => {
    const cleaned = supportSettings.supportWhatsApp.replace(/\D/g, '');
    return `https://wa.me/${cleaned.length === 10 ? '91' + cleaned : cleaned}`;
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await api.delete(`/users/profile?vendorId=${currentShopId}`);
      toast.success('Shop deleted successfully');
      logout();
      navigate('/vendor-login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loader text="Loading support options..." />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <header className="px-4 pt-[46px] pb-3 flex items-center gap-3 fixed top-0 left-0 right-0 max-w-4xl mx-auto z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800 active:scale-95 transition-all"
        >
          <ArrowLeft size={16} className="text-gray-900 dark:text-white" strokeWidth={2.5} />
        </button>
        <h1 className="font-extrabold text-[15px] text-gray-900 dark:text-white tracking-tight">
          Quick Support
        </h1>
      </header>

      <div className="pt-[102px] px-4 pb-4 max-w-lg mx-auto space-y-5">
        {/* 3 Support Cards */}
        <div className="grid grid-cols-3 gap-2">

          {/* Call Support */}
          {supportSettings.supportPhone ? (
            <a
              href={`tel:${supportSettings.supportPhone.replace(/\D/g, '')}`}
              className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm active:scale-95 transition-all"
            >
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-2">
                <Phone size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black text-[#00246b] dark:text-white uppercase tracking-tight">Call Support</span>
              <span className="text-[7px] font-bold text-slate-400 mt-1">{supportSettings.supportPhone}</span>
            </a>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm opacity-40">
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-2">
                <Phone size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black text-[#00246b] dark:text-white uppercase tracking-tight">Call Support</span>
              <span className="text-[7px] font-bold text-slate-400 mt-1">Unavailable</span>
            </div>
          )}

          {/* WhatsApp Support */}
          {supportSettings.supportWhatsApp ? (
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm active:scale-95 transition-all"
            >
              <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-2">
                <MessageSquare size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black text-[#00246b] dark:text-white uppercase tracking-tight">WhatsApp Us</span>
              <span className="text-[7px] font-bold text-slate-400 mt-1">{supportSettings.supportWhatsApp}</span>
            </a>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm opacity-40">
              <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-2">
                <MessageSquare size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black text-[#00246b] dark:text-white uppercase tracking-tight">WhatsApp Us</span>
              <span className="text-[7px] font-bold text-slate-400 mt-1">Unavailable</span>
            </div>
          )}

          {/* Account Deletion */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm active:scale-95 transition-all"
          >
            <div className="w-9 h-9 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center mb-2">
              <Trash2 size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-[#00246b] dark:text-white uppercase tracking-tight">Delete Account</span>
            <span className="text-[7px] font-bold text-slate-400 mt-1">Danger Zone</span>
          </button>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center p-0">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl p-6 space-y-5 z-10 pb-10"
            >
              {/* Close */}
              <button
                onClick={() => !deleting && setShowDeleteConfirm(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={14} className="text-slate-600 dark:text-gray-300" />
              </button>

              {/* Warning Icon */}
              <div className="flex flex-col items-center text-center gap-3 pt-2">
                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center">
                  <AlertTriangle size={28} className="text-red-500" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-[16px] font-black text-gray-900 dark:text-white tracking-tight">Delete Account?</h2>
                  <p className="text-[11px] font-medium text-slate-400 mt-1 leading-relaxed max-w-[260px]">
                    This will permanently remove your partner profile, shop details, services, staff, bookings & earnings. This action is irreversible.
                  </p>
                </div>
              </div>

              {/* Warning Box */}
              <div className="p-3.5 bg-red-500/5 rounded-2xl border border-red-500/20 flex items-start gap-2.5">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-red-500/80 leading-relaxed">
                  All data will be permanently deleted. You cannot undo this action.
                </p>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="py-3.5 rounded-2xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="py-3.5 rounded-2xl bg-red-500 text-white text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} strokeWidth={2.5} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorSupport;
