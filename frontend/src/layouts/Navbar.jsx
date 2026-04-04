import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';

const Navbar = () => {
  const { role } = useAuthStore();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Calendar, label: 'Bookings', path: '/bookings' },
    { icon: User, label: 'Account', path: '/account' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <nav className="w-full max-w-lg bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-slate-100 dark:border-gray-800 shadow-[0_-10px_35px_rgba(0,0,0,0.05)] pt-2.5 pb-4 px-6 rounded-t-[32px]">
        <div className="flex items-center justify-between">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center gap-1.5 min-w-[70px] transition-all duration-300 active:scale-90',
                isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon
                      size={24}
                      className={cn(
                        "transition-all duration-300",
                        isActive ? "text-[#0B1222] dark:text-white" : "text-slate-500 dark:text-gray-500"
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {isActive && (
                      <motion.div 
                        layoutId="active-dot"
                        className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold tracking-tight transition-all",
                    isActive ? "text-[#0B1222] dark:text-white" : "text-slate-500 dark:text-gray-500"
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
