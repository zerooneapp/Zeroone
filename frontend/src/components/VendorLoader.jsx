import React from 'react';
import { motion } from 'framer-motion';

const VendorLoader = () => {
  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center z-[9999]">
      <div className="relative flex flex-col items-center gap-6">
        {/* Spinner Container */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[#00246b]/10 dark:border-white/5 rounded-full" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-t-[#00246b] dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full"
          />
        </div>

        {/* Text Details */}
        <div className="text-center space-y-2">
          <h2 className="text-[#00246b] dark:text-white text-xl font-bold tracking-tight">ZeroOne Partner</h2>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#00246b] dark:bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-[#00246b] dark:bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-[#00246b] dark:bg-white rounded-full animate-bounce" />
          </div>
          <p className="text-[#00246b]/40 dark:text-white/40 text-[10px] font-black uppercase tracking-[0.2em] pt-2">Loading Dashboard</p>
        </div>
      </div>
    </div>
  );
};

export default VendorLoader;
