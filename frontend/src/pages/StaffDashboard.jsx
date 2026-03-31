import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, CheckCircle, Clock, 
  ShieldCheck, User, CheckCircle2,
  RefreshCw, Phone, Sun, Moon, Bell,
  Lock, Play, LogOut, MapPin
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../layouts/Navbar';
import NotificationDrawer from '../components/NotificationDrawer';

const StaffDashboard = () => {
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchBookings = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get('/bookings/my');
      // 🚀 QUEUE LOGIC: Keep it sorted by time for "Immediate Next" delivery
      const sorted = (res.data || []).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setBookings(sorted);
      
      const notifRes = await api.get('/notifications/unread-count');
      setUnreadCount(notifRes.data.count);
    } catch (err) {
      console.error('Core sync failed');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(true);
    const interval = setInterval(() => fetchBookings(false), 60000); 
    return () => clearInterval(interval);
  }, []);

  const handleComplete = async (bookingId) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { action: 'complete' });
      toast.success('Job completed!');
      // 🔄 REAL-TIME QUEUE: Background sync for zero-flicker transition
      fetchBookings(false);
    } catch (err) {
      toast.error('Failed to complete job');
    }
  };

  const isContactVisible = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diffInMinutes = (start - now) / (1000 * 60);
    return diffInMinutes <= 30;
  };

  // 🎯 CORE LOGIC: Find the single most immediate CONFIRMED task
  const currentTask = bookings.find(b => b.status === 'confirmed' || b.status === 'assigned');
  
  const todayCompleted = bookings.filter(b => 
    b.status === 'completed' && 
    new Date(b.startTime).toDateString() === new Date().toDateString()
  ).length;

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      {/* 🏙️ CLEAN MINIMAL HEADER (NO ITALIC) */}
      <div className="px-6 pt-8 pb-4 bg-white/95 dark:bg-gray-900/95 sticky top-0 z-40 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <h1 className="text-2xl font-black text-[#1F2C4E] dark:text-white tracking-tighter uppercase">ZeroOne</h1>
             <div className="w-1.5 h-1.5 bg-primary rounded-full" />
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2.5 text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl transition-colors active:scale-90">
               {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setShowNotifications(true)} className="relative p-2.5 text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl transition-colors active:scale-90">
               <Bell size={18} />
               {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-950" />}
            </button>
            <button onClick={logout} className="p-2.5 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-xl active:scale-90 transition-transform">
               <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <main className="p-5 space-y-5">
        {/* 📊 COMPACT STATS GRID (Reduced Size per mobile reach) */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
              <p className="text-xl font-black text-gray-900 dark:text-white leading-none">{todayCompleted}</p>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Today Done
              </p>
           </div>
           <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
              <p className="text-xl font-black text-gray-900 dark:text-white leading-none">
                 {bookings.filter(b => b.status === 'confirmed' || b.status === 'assigned').length}
              </p>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Remainder
              </p>
           </div>
        </div>

        {/* 📟 THE SINGLE ACTIVE ASSIGNMENT QUEUE */}
        <div className="space-y-4">
           <AnimatePresence mode="wait">
              {loading ? (
                <div className="h-64 bg-gray-50 dark:bg-gray-900/50 rounded-[2.5rem] animate-pulse" />
              ) : currentTask ? (
                <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-white dark:bg-gray-900 p-6 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-black/5 relative overflow-hidden"
                >
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-300 overflow-hidden">
                            {currentTask.customerId?.image ? <img src={currentTask.customerId.image} className="w-full h-full object-cover" /> : <User size={24} />}
                         </div>
                         <div>
                            <h4 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none">{currentTask.customerId?.name || 'Client'}</h4>
                            <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-2">{formatTime(currentTask.startTime)} Deployment</p>
                         </div>
                      </div>
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                         <Play size={14} fill="currentColor" />
                      </div>
                   </div>

                   <div className="space-y-1.5 mb-8 px-1">
                      {currentTask.services?.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-[11px] font-bold text-gray-400">
                           <div className="w-1 h-1 bg-primary rounded-full shadow-lg" />
                           {s.serviceId?.name || 'Task'}
                        </div>
                      ))}
                   </div>

                   {/* 📍 NEW: LOCATION AWARENESS */}
                   <div className="flex items-center gap-2.5 px-1 mb-8">
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400">
                         <MapPin size={14} />
                      </div>
                      <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 leading-tight">
                         {currentTask.serviceAddress || 'Shop Location / Client Address'}
                      </p>
                   </div>

                   <div className="grid grid-cols-3 gap-3">
                      {isContactVisible(currentTask.startTime) ? (
                        <a href={`tel:${currentTask.customerId?.phone}`} className="h-14 bg-primary text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-primary/20 transition-all">
                           <Phone size={20} />
                        </a>
                      ) : (
                        <div className="h-14 bg-gray-50 dark:bg-gray-800 text-gray-300 rounded-[1.25rem] flex items-center justify-center border border-gray-100 dark:border-gray-800/50">
                           <Lock size={18} />
                        </div>
                      )}

                      <button 
                        onClick={() => handleComplete(currentTask._id)}
                        className="col-span-2 h-14 bg-gray-900 dark:bg-white text-white dark:text-black rounded-[1.25rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
                      >
                         <CheckCircle size={20} />
                         Complete Job
                      </button>
                   </div>
                </motion.div>
              ) : (
                <div className="py-20 text-center space-y-6 bg-gray-50 dark:bg-gray-950/20 rounded-[3rem] border border-gray-100 dark:border-gray-900/50 shadow-inner">
                   <div className="w-16 h-16 bg-white dark:bg-gray-900 shadow-sm rounded-3xl flex items-center justify-center mx-auto text-gray-200">
                      <ClipboardList size={32} />
                   </div>
                   <div className="space-y-2">
                      <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Queue Clear</h2>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                         Standing by for the next assignment. All tasks synced.
                      </p>
                   </div>
                </div>
              )}
           </AnimatePresence>
        </div>
      </main>

      <Navbar />
      <NotificationDrawer isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
};

export default StaffDashboard;
