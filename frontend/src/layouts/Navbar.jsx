import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';

const Navbar = () => {
  const { role } = useAuthStore();

  const navItems = role === 'staff'
    ? [
      { icon: Home, label: 'Home', path: '/staff' },
      { icon: Calendar, label: 'Bookings', path: '/staff/bookings' },
      { icon: User, label: 'Account', path: '/staff/account' },
    ]
    : [
      { icon: Home, label: 'Home', path: '/' },
      { icon: Calendar, label: 'Bookings', path: '/bookings' },
      { icon: User, label: 'Account', path: '/account' },
    ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <nav className="w-full bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-gray-800 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] px-6">
        <div className="flex items-center justify-between max-w-lg mx-auto h-[50px]">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center gap-1.5 min-w-[90px] h-full transition-all relative',
                'opacity-100'
              )}
            >
              {({ isActive }) => (
                <>
                  {/* Top Active Line Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-line"
                      className="absolute top-0 w-8 h-[3.5px] bg-[#1C2C4E] dark:bg-white rounded-b-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}

                  <item.icon
                    size={20}
                    className={cn(
                      "transition-all duration-300",
                      isActive ? "text-[#1C2C4E] dark:text-white mt-1" : "text-[#1C2C4E] dark:text-blue-300"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider transition-all",
                    isActive ? "text-[#1C2C4E] dark:text-white" : "text-[#1C2C4E] dark:text-blue-300"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
