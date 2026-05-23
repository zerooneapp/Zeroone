import React from 'react';
import { motion } from 'framer-motion';
import logo from '../assests/logo.jpeg';

const AdminLoader = () => {
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="relative">
        {/* Outer Pulsing Ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-8 bg-primary/20 rounded-full blur-2xl"
        />
        
        {/* Logo Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-20 h-20 bg-white dark:bg-gray-900 rounded-[2rem] p-1 shadow-2xl border border-slate-100 dark:border-gray-800 flex items-center justify-center overflow-hidden"
        >
          <img src={logo} alt="ZeroOne" className="w-full h-full object-cover" />
        </motion.div>

        {/* Loading Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(28,44,78,0.4)]"
            />
          ))}
        </div>
      </div>
      
      <p className="mt-4 text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] animate-pulse">
        Optimizing Dashboard
      </p>
    </div>
  );
};

export default AdminLoader;
