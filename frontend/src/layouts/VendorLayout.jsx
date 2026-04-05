import React from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { RiHomeHeartFill, RiTeamFill } from 'react-icons/ri';
import { IoPersonCircleSharp } from 'react-icons/io5';
import { motion } from 'framer-motion';

const VendorLayout = () => {
  const { role } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (role !== 'vendor') {
    return <Navigate to="/" replace />;
  }

  const menuItems = [
    { label: 'Home', icon: RiHomeHeartFill, path: '/vendor/dashboard' },
    { label: 'Clients', icon: RiTeamFill, path: '/vendor/bookings' },
    { label: 'Account', icon: IoPersonCircleSharp, path: '/vendor/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 font-sans flex flex-col pb-[58px] sm:pb-0">
      <div className="flex-1 overflow-y-auto w-full max-w-lg mx-auto bg-white dark:bg-gray-900 shadow-[0_0_100px_rgba(0,0,0,0.03)] dark:shadow-none min-h-screen relative border-x border-slate-100 dark:border-gray-800/50">
        <Outlet />
      </div>

      {/* 🚀 PREMIUM BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <nav className="w-full bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-gray-800 shadow-[0_-5px_15px_rgba(0,0,0,0.01)] px-6">
          <div className="flex items-center justify-between max-w-lg mx-auto h-[50px]">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center gap-1 min-w-[90px] h-full transition-all relative"
                >
                  {/* Top Active Line Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-line-vendor"
                      className="absolute top-0 w-8 h-[3px] bg-[#1C2C4E] dark:bg-white rounded-b-full"
                    />
                  )}

                  <item.icon
                    size={22}
                    className="text-[#1C2C4E] dark:text-white"
                  />

                  <span className="text-[10px] font-black uppercase tracking-tight text-[#1C2C4E] dark:text-white">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default VendorLayout;
