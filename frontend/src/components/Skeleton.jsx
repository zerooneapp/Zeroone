import React from 'react';
import { cn } from '../utils/cn';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800", className)}
      {...props}
    />
  );
};

export const VendorSkeleton = () => (
  <div className="min-w-[280px] space-y-4">
    <Skeleton className="w-full h-40" />
    <div className="space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

export default Skeleton;
