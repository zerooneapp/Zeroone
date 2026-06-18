import React, { useRef, useEffect, Suspense } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { RiTeamFill } from 'react-icons/ri';
import { BiSolidHome } from 'react-icons/bi';
import { IoPersonCircleSharp } from 'react-icons/io5';
import { motion } from 'framer-motion';
import VendorLoader from '../components/VendorLoader';
import { cn } from '../utils/cn';

import useSocket from '../hooks/useSocket';

const VendorLayout = () => {
  const { role, user, isInitialized } = useAuthStore();
  useSocket(user?._id);
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [isNavVisible, setIsNavVisible] = React.useState(true);

  const isIOS = React.useMemo(() => {
    return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  React.useEffect(() => {
    let maxHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (currentHeight > maxHeight) maxHeight = currentHeight;
      
      // If height is significantly less than max, assume keyboard is open
      setIsNavVisible(currentHeight > maxHeight * 0.9);
    };

    const handleFocusIn = (e) => {
      if ((e.target.tagName === 'INPUT' && e.target.type !== 'date') || e.target.tagName === 'TEXTAREA') {
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

  if (!isInitialized) {
    return <div className="min-h-screen bg-slate-50 dark:bg-gray-950" />;
  }

  if (role !== 'vendor') {
    return <Navigate to="/" replace />;
  }

  const menuItems = [
    { label: 'Home', icon: BiSolidHome, path: '/vendor/dashboard' },
    { label: 'Clients', icon: RiTeamFill, path: '/vendor/bookings' },
    { label: 'Account', icon: IoPersonCircleSharp, path: '/vendor/profile' },
  ];

  return (
    <div className={cn(
      "min-h-screen w-full bg-slate-50 dark:bg-gray-950 font-sans flex flex-col pb-[calc(58px+env(safe-area-inset-bottom))] sm:pb-0",
      isIOS && "pb-[calc(60px+env(safe-area-inset-bottom))]"
    )}>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto bg-slate-50 dark:bg-gray-950 shadow-[0_0_100px_rgba(0,0,0,0.03)] dark:shadow-none relative"
      >
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>

      {isNavVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
          <nav className={cn(
            "w-full bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-gray-800 shadow-[0_-5px_15px_rgba(0,0,0,0.01)] px-6 pb-[env(safe-area-inset-bottom)]",
            isIOS && "pb-[calc(env(safe-area-inset-bottom)+2px)]"
          )}>
            <div className="flex items-center justify-between max-w-4xl mx-auto h-[50px]">
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
                        layoutId="active-nav-line-partner"
                        className="absolute top-0 w-8 h-[3px] bg-[#00246b] dark:bg-white rounded-b-full"
                      />
                    )}

                    <item.icon
                      size={22}
                      className="text-[#00246b] dark:text-white"
                    />

                    <span className="text-[10px] font-black uppercase tracking-tight text-[#00246b] dark:text-white">
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
