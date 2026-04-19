import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';

const Navbar = () => {
  const { role } = useAuthStore();
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    let maxHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (currentHeight > maxHeight) maxHeight = currentHeight;
      
      // If current height is less than 90% of max height, assume keyboard is open
      setIsVisible(currentHeight > maxHeight * 0.9);
    };

    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setIsVisible(false);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const isInputFieldFocused = document.activeElement.tagName === 'INPUT' || 
                                   document.activeElement.tagName === 'TEXTAREA';
        if (!isInputFieldFocused) {
          setIsVisible(true);
        }
      }, 300);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    window.addEventListener('resize', handleResize);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  if (!isVisible) return null;

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
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent pointer-events-none">
      <nav className="w-full bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-gray-800 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] px-6 pointer-events-auto transition-all duration-300 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between max-w-lg mx-auto h-[44px]">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[90px] h-full transition-all relative',
                'opacity-100'
              )}
            >
              {({ isActive }) => (
                <>
                  {/* Top Active Line Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-line"
                      className="absolute top-0 w-8 h-[3px] bg-[#1C2C4E] dark:bg-white rounded-b-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}

                  <item.icon
                    size={19}
                    className={cn(
                      "transition-all duration-300",
                      isActive ? "text-[#1C2C4E] dark:text-white mt-0.5" : "text-[#1C2C4E] dark:text-gray-400"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  <span className={cn(
                    "text-[9px] font-black capitalize tracking-wider transition-all",
                    isActive ? "text-[#1C2C4E] dark:text-white" : "text-[#1C2C4E] dark:text-gray-400"
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
