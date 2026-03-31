import React from 'react';
import { cn } from '../utils/cn';

const Card = ({ children, className, hover = false }) => {
  return (
    <div
      className={cn(
        'bg-card-light dark:bg-card-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 transition-all',
        hover && 'hover:shadow-md hover:-translate-y-1',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;
