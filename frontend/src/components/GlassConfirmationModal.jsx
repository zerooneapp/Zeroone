import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

const GlassConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }) => {
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
            <div className="py-4 px-6 text-center">
              <div className="w-12 h-12 bg-[#1C2C4E]/10 dark:bg-white/10 text-[#1C2C4E] dark:text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <HelpCircle size={24} strokeWidth={1.5} />
              </div>

              <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-tight capitalize">
                {title}
              </h3>

              <p className="text-[11px] font-bold text-slate-500/80 dark:text-gray-400 mt-1.5 leading-relaxed tracking-tight px-2">
                {message}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  onClick={onClose}
                  className="py-3 bg-slate-100/50 dark:bg-gray-800/50 text-slate-400 dark:text-gray-500 rounded-2xl font-black text-[10px] capitalize tracking-tight active:scale-95 transition-all border border-slate-200/5 dark:border-gray-700/50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="py-3 bg-[#1C2C4E] text-white rounded-2xl font-black text-[10px] capitalize tracking-tight shadow-lg shadow-[#1C2C4E]/20 active:scale-95 transition-all"
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlassConfirmationModal;
