import React from 'react';
import { motion } from 'framer-motion';

const StatusTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'confirmed', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="flex gap-1 p-1.5 bg-slate-100/80 dark:bg-gray-800/50 backdrop-blur-md rounded-[1.5rem] border border-slate-200/50 dark:border-gray-700/30">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative flex-1 px-4 py-2.5 outline-none transition-all"
          >
            {isActive && (
              <motion.div 
                layoutId="activeTabSlot"
                className="absolute inset-0 bg-white dark:bg-gray-900 rounded-[1.2rem] shadow-sm z-0"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className={`relative z-10 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
              isActive 
              ? 'text-primary' 
              : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default StatusTabs;
