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
    { 
      icon: Calendar, 
      label: 'Bookings', 
      path: '/bookings'
    },
    { icon: User, label: 'Account', path: '/account' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl border-t border-[#1C2C4E]/20 dark:border-[#1C2C4E]/40 px-4 h-16 flex items-center shadow-[0_-8px_30px_rgb(0,0,0,0.02)]">
      <div className="w-full max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-1 transition-all duration-300 min-w-0 flex-1 relative py-1',
              isActive 
                ? 'text-[#1C2C4E] dark:text-white' 
                : 'text-gray-400 dark:text-gray-600'
            )}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon size={20} className="transition-transform duration-300" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#1C2C4E] dark:bg-blue-400 rounded-full shadow-sm"
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest leading-none transition-all",
                  isActive ? "text-[#1C2C4E] translate-y-0 opacity-100" : "opacity-70"
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
