import React from 'react';

const AdminPlaceholder = ({ title }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tight">{title}</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Management and moderation control hub</p>
        </div>
      </div>
      
      <div className="p-12 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center space-y-4 text-center">
         <div className="w-16 h-16 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center animate-bounce">
            👑
         </div>
         <div>
            <h2 className="text-xl font-black dark:text-white">Module Coming Soon</h2>
            <p className="text-sm text-gray-400 font-medium">We are currently implementing this admin feature. Stay tuned!</p>
         </div>
      </div>
    </div>
  );
};

export default AdminPlaceholder;

export const AdminVendors = () => <AdminPlaceholder title="Vendor Management" />;
export const AdminUsers = () => <AdminPlaceholder title="User Management" />;
export const AdminBookings = () => <AdminPlaceholder title="Platform Bookings" />;
export const AdminCategories = () => <AdminPlaceholder title="Category Management" />;
export const AdminPlans = () => <AdminPlaceholder title="Subscription Plans" />;
export const AdminTransactions = () => <AdminPlaceholder title="Financial Transactions" />;
export const AdminReviews = () => <AdminPlaceholder title="Review Moderation" />;
export const AdminNotifications = () => <AdminPlaceholder title="Admin Notifications" />;
