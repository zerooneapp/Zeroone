import React from 'react';
import { Delete, X } from 'lucide-react';
import { cn } from '../utils/cn';

const NumericKeypad = ({ onKeyPress, onDelete, className }) => {
  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '', '0', 'delete'
  ];

  return (
    <div className={cn(
      "grid grid-cols-3 gap-3 p-4 bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl border-t border-gray-100 dark:border-gray-800",
      className
    )}>
      {keys.map((key, index) => (
        <button
          key={index}
          type="button"
          onClick={() => {
            if (key === 'delete') onDelete?.();
            else if (key !== '') onKeyPress?.(key);
          }}
          className={cn(
            "h-14 flex items-center justify-center rounded-xl text-2xl font-semibold transition-all active:scale-95 select-none",
            key === '' && "invisible",
            "text-[#1C2C4E] dark:text-white bg-white/80 dark:bg-gray-800/80 shadow-sm border border-gray-100 dark:border-gray-800 active:bg-gray-200 dark:active:bg-gray-700",
            key === 'delete' && "bg-transparent dark:bg-transparent border-none shadow-none text-gray-400 dark:text-gray-500 active:bg-transparent"
          )}
        >
          {key === 'delete' ? (
            <div className="bg-gray-200/50 dark:bg-gray-800/50 p-3 rounded-full">
              <Delete size={20} />
            </div>
          ) : key}
        </button>
      ))}
    </div>
  );
};

export default NumericKeypad;
