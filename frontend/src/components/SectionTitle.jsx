import React from 'react';
import { cn } from '../utils/cn';

const SectionTitle = ({ title, subtitle, className, actionLabel, onAction }) => {
  return (
    <div className={cn('flex items-center justify-between mb-2', className)}>
      <div>
        <h2 className="text-[15px] font-extrabold text-[#1F2C4E] dark:text-white leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[10px] text-gray-400 font-medium">
            {subtitle}
          </p>
        )}
      </div>
      {actionLabel && (
        <button 
          onClick={onAction}
          className="text-gray-400 font-bold text-[11px] flex items-center gap-1 hover:text-[#1F2C4E] transition-colors"
        >
          {actionLabel} <span className="tracking-[-2.5px] ml-0.5 text-xs text-gray-400">››</span>
        </button>
      )}
    </div>
  );
};

export default SectionTitle;
