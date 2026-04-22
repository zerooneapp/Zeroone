import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ text = 'Loading details...' }) => {
  return (
    <div className="relative flex flex-col items-center justify-center h-[100dvh] w-full bg-white dark:bg-gray-950 animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer Ring */}
        <div className="w-16 h-16 border-4 border-slate-100 dark:border-gray-800 rounded-full" />
        {/* Spinning Ring */}
        <div className="absolute top-0 w-16 h-16 border-4 border-transparent border-t-[#1C2C4E] dark:border-t-blue-500 rounded-full animate-spin" />
        {/* Core Icon */}
        <div className="absolute flex items-center justify-center">
            <div className="w-2 h-2 bg-[#1C2C4E] dark:bg-blue-500 rounded-full animate-ping" />
        </div>
      </div>
      
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1C2C4E]/40 dark:text-white/30 animate-pulse text-center px-6">
        {text}
      </p>
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#1C2C4E]/5 blur-3xl rounded-full -z-10" />
    </div>
  );
};

export default Loader;
