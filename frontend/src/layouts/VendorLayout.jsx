import React from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Home, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';

const VendorLayout = () => {
  const { role } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (role !== 'vendor') {
    return <Navigate to="/" replace />;
  }

  const menuItems = [
    { label: 'Home', icon: Home, path: '/vendor/dashboard' },
    { label: 'Clients', icon: Users, path: '/vendor/bookings' },
    { label: 'Account', icon: User, path: '/vendor/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans flex flex-col pb-28 sm:pb-0">
      <div className="flex-1 overflow-y-auto w-full max-w-lg mx-auto bg-white dark:bg-gray-900 shadow-[0_0_100px_rgba(0,0,0,0.03)] dark:shadow-none min-h-screen relative border-x border-slate-100 dark:border-gray-800/50">
        <Outlet />
      </div>

      {/* 🚀 PREMIUM FLOATING BOTTOM NAVIGATION */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[100] animate-in slide-in-from-bottom duration-700">
        <div className="bg-slate-900/90 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/10 p-2 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] flex items-center justify-between">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="relative flex-1 flex flex-col items-center justify-center py-3 outline-none group"
              >
                {isActive && (
                   <motion.div 
                     layoutId="navPill"
                     className="absolute inset-0 bg-primary rounded-3xl z-0 mx-1"
                     transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                   />
                )}
                
                <item.icon 
                  size={20} 
                  className={`relative z-10 transition-all duration-300 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                  }`} 
                />
                
                <span className={`relative z-10 text-[8px] font-black tracking-widest mt-1 transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default VendorLayout;
