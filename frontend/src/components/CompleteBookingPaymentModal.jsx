import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Banknote, HelpCircle } from 'lucide-react';

const CompleteBookingPaymentModal = ({ isOpen, onClose, onConfirm, title = "Complete Booking", message = "Select payment method to complete the booking:" }) => {
  const [selectedMethod, setSelectedMethod] = useState('offline'); // default to offline (Cash)

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
          {/* Backdrop with strong blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />

          {/* Glass Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-[320px] bg-white/75 dark:bg-gray-900/75 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/40 dark:border-gray-800/50 relative z-10"
          >
            {/* Glossy top decoration */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

            {/* Content */}
            <div className="py-3 px-5 text-center">
              <div className="w-9 h-9 bg-[#00246b]/10 dark:bg-white/10 text-[#00246b] dark:text-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                <HelpCircle size={18} strokeWidth={1.5} />
              </div>

              <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight leading-tight capitalize">
                {title}
              </h3>

              <p className="text-[10px] font-bold text-slate-500/80 dark:text-gray-400 mt-1 leading-relaxed tracking-tight px-1">
                {message}
              </p>

              {/* Payment Methods Selection */}
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('offline')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 ${
                    selectedMethod === 'offline'
                      ? 'border-[#00246b] bg-[#00246b]/5 text-[#00246b] dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-500'
                  }`}
                >
                  <Banknote size={16} className="mb-0.5" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Offline</span>
                  <span className="text-[7.5px] opacity-70">Cash/Direct</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('online')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 ${
                    selectedMethod === 'online'
                      ? 'border-[#00246b] bg-[#00246b]/5 text-[#00246b] dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-500'
                  }`}
                >
                  <CreditCard size={16} className="mb-0.5" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Online</span>
                  <span className="text-[7.5px] opacity-70">UPI/Card</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <button
                  onClick={onClose}
                  className="py-2.5 bg-slate-100/50 dark:bg-gray-800/50 text-slate-400 dark:text-gray-500 rounded-xl font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all border border-slate-200/5 dark:border-gray-700/50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm(selectedMethod);
                    onClose();
                  }}
                  className="py-2.5 bg-[#00246b] text-white rounded-xl font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#00246b]/20 active:scale-95 transition-all"
                >
                  Complete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CompleteBookingPaymentModal;
