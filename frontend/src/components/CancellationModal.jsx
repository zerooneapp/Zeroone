import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

const CancellationModal = ({ isOpen, onClose, onConfirm, title = "Cancel Booking", message = "Please provide a reason for cancellation" }) => {
  const [reason, setReason] = useState('');
  const [isManual, setIsManual] = useState(false);

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
    onClose();
  };

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
            className="w-full max-w-[320px] bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/40 dark:border-gray-800/50 relative z-10"
          >
            {/* Glossy top decoration */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

            {/* Content */}
            <div className="py-3 px-6 text-center">
              <div className="w-10 h-10 bg-[#1C2C4E]/10 dark:bg-white/10 text-[#1C2C4E] dark:text-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                <AlertCircle size={20} strokeWidth={1.5} />
              </div>

              <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-tight uppercase">
                {title}
              </h3>

              <p className="text-[10px] font-bold text-slate-500/80 dark:text-gray-400 mt-1.5 leading-relaxed uppercase tracking-widest px-2">
                {message}
              </p>

              <div className="mt-4 space-y-3">
                <div className="relative group">
                  <select
                    onChange={(e) => {
                      if (e.target.value === 'manual') {
                        setIsManual(true);
                        setReason('');
                      } else {
                        setIsManual(false);
                        setReason(e.target.value);
                      }
                    }}
                    value={isManual ? 'manual' : reason}
                    className="w-full p-3 bg-white/50 dark:bg-gray-900/50 border border-slate-200/50 dark:border-gray-800 rounded-xl text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1C2C4E]/30 appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="text-slate-400">Choose a reason...</option>
                    <option value="Customer not reachable">1. Customer not reachable</option>
                    <option value="Customer Running late">2. Customer Running late</option>
                    <option value="Wrong Booking">3. Wrong Booking</option>
                    <option value="Emergency">4. Emergency</option>
                    <option value="manual">Other (Self)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <AlertCircle size={12} className="rotate-180" />
                  </div>
                </div>

                {isManual && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                  >
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter your reason here..."
                      className="w-full h-20 p-3 bg-white/50 dark:bg-gray-900/50 border border-slate-200/50 dark:border-gray-800 rounded-xl text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1C2C4E]/30 resize-none placeholder:text-slate-300"
                      autoFocus
                    />
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="py-2.5 bg-slate-100/50 dark:bg-gray-800/50 text-slate-400 dark:text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all border border-slate-200/5 dark:border-gray-700/50"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!reason.trim()}
                  className="py-2.5 bg-[#1C2C4E] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#1C2C4E]/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CancellationModal;
