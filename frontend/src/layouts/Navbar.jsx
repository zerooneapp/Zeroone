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
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 max-w-sm mx-auto">
      <nav className="bg-[#1C2C4E] dark:bg-gray-900 shadow-2xl rounded-full h-16 flex items-center px-2 border border-white/5 backdrop-blur-xl">
        <div className="w-full flex items-center justify-between gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                'relative flex-1 flex flex-col items-center justify-center gap-1 h-12 rounded-full transition-all duration-500 min-w-0 overflow-hidden',
                isActive ? 'bg-white/10' : 'hover:bg-white/5 active:scale-95'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className="relative z-10">
                    <item.icon
                      size={20}
                      className={cn(
                        "transition-all duration-300",
                        isActive ? "text-white scale-110" : "text-gray-400 opacity-60"
                      )}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest leading-none transition-all relative z-10",
                    isActive ? "text-white mt-1" : "text-gray-500 opacity-60"
                  )}>
                    {item.label}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    />
                  )}
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
