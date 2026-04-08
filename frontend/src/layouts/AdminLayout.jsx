import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Store, Users, CalendarRange, 
  Tag, CreditCard, Wallet, Star, Bell, 
  Menu, X, Sun, Moon, LogOut, ChevronRight, Settings
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAdminStore } from '../store/useAdminStore';
import useNotificationStore from '../store/notificationStore';
import useSocket from '../hooks/useSocket';
import { cn } from '../utils/cn';
import logo from '../assests/logo.jpeg';

const adminRoutes = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Vendors", path: "/admin/vendors", icon: Store },
  { name: "Users", path: "/admin/users", icon: Users },
  { name: "Bookings", path: "/admin/bookings", icon: CalendarRange },
  { name: "Categories", path: "/admin/categories", icon: Tag },
  { name: "Plans", path: "/admin/plans", icon: CreditCard },
  { name: "Settings", path: "/admin/settings", icon: Settings },
  { name: "Transactions", path: "/admin/transactions", icon: Wallet },
  { name: "Reviews", path: "/admin/reviews", icon: Star },
  { name: "Notifications", path: "/admin/notifications", icon: Bell },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { admin, isSidebarOpen, toggleSidebar, closeSidebar } = useAdminStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  useSocket(admin?._id);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (admin) {
      fetchNotifications();
    }
  }, [admin, fetchNotifications]);

  return (
    <div className="h-screen bg-background-light dark:bg-background-dark flex overflow-hidden">
      
      {/* 🖥️ DESKTOP SIDEBAR */}
      <aside className={cn(
        "hidden md:flex flex-col h-full w-72 bg-background-light dark:bg-background-dark border-r border-gray-100 dark:border-gray-800 transition-all duration-300 z-50",
        !isSidebarOpen && "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center overflow-hidden shrink-0">
            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
          </div>
          {isSidebarOpen && (
            <span className="text-xl font-black tracking-tighter leading-none flex flex-col">
              <div className="flex items-center">
                <span className="text-[#344474] dark:text-white">Zero</span>
                <span className="text-[#9ea6b8] dark:text-slate-400">One</span>
              </div>
              <span className="text-[#344474]/40 dark:text-slate-500 text-[13px] lowercase not-italic block mt-0.5 tracking-[0.2em] font-black">admin panel</span>
            </span>
          )}
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto no-scrollbar">
          {adminRoutes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) => cn(
                "group flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-sm capitalize tracking-wide transition-all duration-300 relative overflow-hidden",
                isActive 
                  ? "bg-primary/10 text-primary dark:text-white border-l-4 border-primary shadow-sm" 
                  : "text-gray-400 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-600 dark:hover:text-white"
              )}
            >
              <route.icon size={22} className={cn("transition-colors", "group-hover:text-primary")} />
              {isSidebarOpen && <span>{route.name}</span>}
              
              {/* Premium Glow effect on active */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-[.active]:opacity-100 transition-opacity pointer-events-none" />
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
           <button 
             onClick={() => navigate('/')}
             className="w-full flex items-center gap-4 px-4 py-3.5 text-red-500 font-black text-sm capitalize tracking-wide hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
           >
              <LogOut size={22} />
              {isSidebarOpen && <span>Logout</span>}
           </button>
        </div>
      </aside>

      {/* 📱 MOBILE DRAWER OVERLAY */}
      {isMobileMenuOpen && (
         <div 
           className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
           onClick={() => setIsMobileMenuOpen(false)}
         />
      )}

      {/* 📱 MOBILE SIDEBAR */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 z-[70] md:hidden transform transition-transform duration-300 shadow-2xl overflow-y-auto",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-transparent rounded-xl flex items-center justify-center overflow-hidden">
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-black tracking-tighter leading-none flex flex-col">
                <div className="flex items-center">
                  <span className="text-[#344474] dark:text-white">Zero</span>
                  <span className="text-[#9ea6b8] dark:text-gray-500">One</span>
                </div>
                <span className="text-[#344474]/40 dark:text-gray-500 text-[11px] lowercase block tracking-widest font-black">admin panel</span>
              </span>
           </div>
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400"><X size={20} /></button>
        </div>
        <nav className="p-4 space-y-2">
          {adminRoutes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-5 py-3.5 rounded-2xl font-black text-sm capitalize tracking-wide transition-all",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <route.icon size={22} />
              <span>{route.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 🛡️ MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* 👑 PREMIUM HEADER */}
        <header className="h-20 bg-background-light dark:bg-background-dark backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 z-40 sticky top-0">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsMobileMenuOpen(true)}
               className="md:hidden p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400"
             >
                <Menu size={22} />
             </button>
             <button 
               onClick={toggleSidebar}
               className="hidden md:flex p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 active:scale-90 transition-all hover:bg-gray-100"
             >
                <Menu size={22} />
             </button>
             <div className="hidden sm:block">
                <h1 className="text-base font-black dark:text-white capitalize tracking-widest flex items-center gap-2">
                   Overview <ChevronRight size={16} className="text-gray-300 dark:text-slate-600" /> <span className="text-primary dark:text-white">Dashboard</span>
                </h1>
             </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Admin Identity */}
             <div className="hidden lg:flex items-center gap-3 pr-4 border-r border-gray-100 dark:border-gray-800">
                <div className="text-right">
                   <p className="text-sm font-black dark:text-white capitalize">{admin.name}</p>
                   <span className="text-[11px] font-black text-primary dark:text-white capitalize bg-primary/10 dark:bg-primary/25 px-2 py-0.5 rounded-full border border-primary/20 shadow-sm">
                      Super Admin
                   </span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-primary flex items-center justify-center text-primary dark:text-white font-black border border-primary/10 text-base shadow-sm">
                   {admin.name.charAt(0)}
                </div>
             </div>

             <div className="flex items-center gap-2">
                <button 
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary transition-colors"
                >
                   {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
                </button>
                 <button 
                   onClick={() => navigate('/admin/notifications')}
                   className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary transition-colors relative"
                 >
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
                    )}
                 </button>
             </div>
          </div>
        </header>

        {/* ⚡ CONTENT SCROLL AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
           <Outlet />
        </main>
      </div>
    </div>
  );
};

// Simple Zap icon component since I used it above
const Zap = ({ size, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

export default AdminLayout;
