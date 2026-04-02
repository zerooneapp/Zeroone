import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';

const Navbar = () => {
  const { role } = useAuthStore();

  const navItems = [
    { icon: Home, label: 'Home', path: role === 'staff' ? '/staff' : '/' },
    {
      icon: Calendar,
      label: 'Bookings',
      path: role === 'vendor'
        ? '/vendor/bookings'
        : (role === 'admin'
          ? '/bookings'
          : (role === 'staff' ? '/staff/bookings' : '/bookings'))
    },
    { icon: User, label: 'Account', path: '/account' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl border-t border-[#1C2C4E]/20 dark:border-[#1C2C4E]/40  h-16 flex items-center shadow-[0_-8px_30px_rgb(0,0,0,0.02)]">
      <div className="w-full flex items-center justify-between">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-1 transition-all duration-300 min-w-0 flex-1 relative py-1 text-[#1C2C4E] dark:text-white'
            )}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon size={20} className="transition-transform duration-300" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute -top-2 -right-1.5 w-7 h-[3px] bg-[#1C2C4E] dark:bg-blue-400 rounded-full shadow-sm"
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest leading-none transition-all text-[#1C2C4E]"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
