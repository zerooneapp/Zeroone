import React, { useRef, useEffect } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { RiTeamFill } from 'react-icons/ri';
import { BiSolidHome } from 'react-icons/bi';
import { IoPersonCircleSharp } from 'react-icons/io5';
import { motion } from 'framer-motion';

import useSocket from '../hooks/useSocket';

const VendorLayout = () => {
  const { role, user, isInitialized } = useAuthStore();
  useSocket(user?._id);
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [isNavVisible, setIsNavVisible] = React.useState(true);

  React.useEffect(() => {
    let maxHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (currentHeight > maxHeight) maxHeight = currentHeight;
      
      // If height is significantly less than max, assume keyboard is open
      setIsNavVisible(currentHeight > maxHeight * 0.9);
    };

    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setIsNavVisible(false);
      }
    };

    const handleFocusOut = () => {
      // Small delay to allow keyboard animation and focus transition
      setTimeout(() => {
        const isInputFieldFocused = document.activeElement.tagName === 'INPUT' || 
                                   document.activeElement.tagName === 'TEXTAREA';
        if (!isInputFieldFocused) {
          setIsNavVisible(true);
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  if (!isInitialized) return null;

  if (role !== 'vendor') {
    return <Navigate to="/" replace />;
  }

  const menuItems = [
    { label: 'Home', icon: BiSolidHome, path: '/vendor/dashboard' },
    { label: 'Clients', icon: RiTeamFill, path: '/vendor/bookings' },
    { label: 'Account', icon: IoPersonCircleSharp, path: '/vendor/profile' },
  ];

  return (
    <div className="bg-slate-50 dark:bg-gray-950 font-sans flex flex-col pb-[58px] sm:pb-0">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto w-full max-w-lg mx-auto bg-white dark:bg-gray-900 shadow-[0_0_100px_rgba(0,0,0,0.03)] dark:shadow-none relative border-x border-slate-100 dark:border-gray-800/50"
      >
        <Outlet />
      </div>

      {isNavVisible && (
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
      )}
    </div>
  );
};

export default VendorLayout;
