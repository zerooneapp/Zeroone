import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Landmark } from 'lucide-react';

const RevenueBreakdownModal = ({ isOpen, onClose, onlineAmount = 0, offlineAmount = 0, totalAmount = 0 }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-[320px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/40 dark:border-gray-800/50 relative z-10 p-5 text-center"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-gray-800">
              <span className="text-xs font-black uppercase tracking-wider text-[#00246b] dark:text-blue-400 flex items-center gap-1.5">
                <Landmark size={14} /> Revenue Breakdown
              </span>
              <button
                onClick={onClose}
                className="p-1 bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-lg hover:scale-105 active:scale-95 transition-transform"
              >
                <X size={14} />
              </button>
            </div>

            {/* Total Revenue Display */}
            <div className="py-3 px-4 bg-[#00246b]/5 dark:bg-blue-950/20 rounded-2xl mb-4 border border-[#00246b]/10 dark:border-blue-900/30">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Today's Total Revenue</span>
              <h2 className="text-2xl font-black text-[#00246b] dark:text-white leading-tight mt-0.5">
                ₹{totalAmount.toLocaleString()}
              </h2>
            </div>

            {/* Split breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-950 rounded-2xl border border-slate-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <CreditCard size={16} />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">Online</span>
                    <span className="text-[8px] text-slate-400">UPI/Cards</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-800 dark:text-white">
                  ₹{onlineAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-950 rounded-2xl border border-slate-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Banknote size={16} />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">Offline</span>
                    <span className="text-[8px] text-slate-400">Cash/Direct</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-800 dark:text-white">
                  ₹{offlineAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full mt-4 py-3 bg-[#00246b] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RevenueBreakdownModal;
