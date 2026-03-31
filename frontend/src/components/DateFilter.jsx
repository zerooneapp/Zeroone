import React from 'react';
import { Calendar } from 'lucide-react';

const DateFilter = ({ from, to, onFromChange, onToChange }) => {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-4 rounded-[2rem] border border-gray-50 dark:border-gray-800 shadow-sm">
      <div className="flex-1 space-y-1">
        <label className="text-[8px] font-black uppercase text-gray-400 px-1">From</label>
        <div className="relative">
          <input 
            type="date" 
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl px-3 py-2 text-xs font-bold dark:text-white focus:ring-1 focus:ring-primary/20 appearance-none"
          />
          <Calendar size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="text-gray-300 font-bold mt-4">→</div>

      <div className="flex-1 space-y-1">
        <label className="text-[8px] font-black uppercase text-gray-400 px-1">To</label>
        <div className="relative">
          <input 
            type="date" 
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl px-3 py-2 text-xs font-bold dark:text-white focus:ring-1 focus:ring-primary/20 appearance-none"
          />
          <Calendar size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default DateFilter;
