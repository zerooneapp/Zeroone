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
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-32 animate-in fade-in duration-500">
         {/* 🏙️ CLEAN MINIMAL HEADER (NO ITALIC) */}
         <div className="px-5 pt-6 pb-2 bg-white/80 dark:bg-gray-900/80 sticky top-0 z-40 backdrop-blur-3xl border-b border-slate-200/60 dark:border-gray-800">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase">ZeroOne</h1>
                  <div className="w-1 h-1 bg-primary rounded-full mt-0.5" />
               </div>

               <div className="flex items-center gap-1.5">
                  <button onClick={toggleTheme} className="p-2 text-slate-400 bg-slate-100 dark:bg-gray-800 rounded-lg transition-all active:scale-90 border border-slate-200/50 dark:border-gray-700">
                     {isDarkMode ? <Sun size={16} strokeWidth={3} /> : <Moon size={16} strokeWidth={3} />}
                  </button>
                  <button onClick={() => setShowNotifications(true)} className="relative p-2 text-slate-400 bg-slate-100 dark:bg-gray-800 rounded-lg transition-all active:scale-90 border border-slate-200/50 dark:border-gray-700">
                     <Bell size={16} strokeWidth={3} />
                     {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-gray-950" />}
                  </button>
                  <button onClick={logout} className="p-2 bg-red-500/10 text-red-500 rounded-lg active:scale-90 transition-all border border-red-500/20">
                     <LogOut size={16} strokeWidth={3} />
                  </button>
               </div>
            </div>
         </div>

         <main className="p-4 space-y-3.5">
            {/* 📊 COMPACT STATS GRID */}
            <div className="grid grid-cols-2 gap-2.5">
               <div className="bg-white dark:bg-gray-900 p-3.5 px-4 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden">
                  <p className="text-[16px] font-black text-slate-900 dark:text-white leading-none">{todayCompleted}</p>
                  <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5 opacity-60">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Today Done
                  </p>
               </div>
               <div className="bg-white dark:bg-gray-900 p-3.5 px-4 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden">
                  <p className="text-[16px] font-black text-slate-900 dark:text-white leading-none">
                     {bookings.filter(b => b.status === 'confirmed' || b.status === 'assigned').length}
                  </p>
                  <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5 opacity-60">
                     <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Remainder
                  </p>
               </div>
            </div>

            {/* 📟 THE SINGLE ACTIVE ASSIGNMENT QUEUE */}
            <div className="space-y-3.5">
               <AnimatePresence mode="wait">
                  {loading ? (
                     <div className="h-56 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl animate-pulse" />
                  ) : currentTask ? (
                     <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-900 p-4 px-5 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden active:scale-[0.99] transition-all"
                     >
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-3.5">
                              <div className="w-11 h-11 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-300 overflow-hidden border border-slate-100 dark:border-gray-700">
                                 {currentTask.customerId?.image ? <img src={currentTask.customerId.image} className="w-full h-full object-cover" /> : <User size={20} strokeWidth={3} />}
                              </div>
                              <div className="leading-none">
                                 <h4 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight uppercase truncate max-w-[140px]">{currentTask.customerId?.name || 'Client'}</h4>
                                 <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mt-2 italic shadow-sm">{formatTime(currentTask.startTime)} DEPLOYMENT</p>
                              </div>
                           </div>
                           <div className="w-9 h-9 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-gray-700 active:scale-95 transition-all">
                              <Play size={14} fill="currentColor" />
                           </div>
                        </div>

                        <div className="space-y-2 mb-4">
                           {currentTask.services?.map((s, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 opacity-80">
                                 <div className="w-1.5 h-1.5 bg-primary rounded-full opacity-60" />
                                 {s.serviceId?.name || 'Task Node'}
                              </div>
                           ))}
                        </div>

                        {/* 📍 LOCATION AWARENESS */}
                        <div className="flex items-start gap-2.5 mb-5 bg-slate-50/50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-slate-50 dark:border-gray-800/50">
                           <div className="p-1 px-1.5 bg-white dark:bg-gray-800 rounded-lg text-slate-400 shadow-sm border border-slate-100 dark:border-gray-700 mt-0.5">
                              <MapPin size={12} strokeWidth={3} />
                           </div>
                           <p className="text-[9px] font-black text-slate-500 dark:text-gray-400 leading-normal uppercase tracking-tight line-clamp-2">
                              {currentTask.serviceAddress || 'Elite Venue Address'}
                           </p>
                        </div>

                        <div className="grid grid-cols-4 gap-2.5">
                           {isContactVisible(currentTask.startTime) ? (
                              <a href={`tel:${currentTask.customerId?.phone}`} className="h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all border-b-2 border-white/10">
                                 <Phone size={18} strokeWidth={3} />
                              </a>
                           ) : (
                              <div className="h-11 bg-slate-100 dark:bg-gray-800 text-slate-300 dark:text-gray-600 rounded-xl flex items-center justify-center border border-slate-200/50 dark:border-gray-700 opacity-60">
                                 <Lock size={16} strokeWidth={3} />
                              </div>
                           )}

                           <button
                              onClick={() => handleComplete(currentTask._id)}
                              className="col-span-3 h-11 bg-slate-950 dark:bg-primary text-white rounded-xl flex items-center justify-center gap-2.5 font-black text-[8.5px] uppercase tracking-widest active:scale-95 transition-all shadow-xl border-b-2 border-white/10"
                           >
                              <CheckCircle size={16} strokeWidth={3} />
                              Complete Job
                           </button>
                        </div>
                     </motion.div>
                  ) : (
                     <div className="py-20 text-center space-y-6 bg-white dark:bg-gray-900/50 rounded-2xl border border-dashed border-slate-200/60 dark:border-gray-800 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-gray-800 rounded-2xl shadow-inner flex items-center justify-center mx-auto border border-slate-100 dark:border-gray-700">
                           <ClipboardList size={32} className="text-slate-200 dark:text-gray-700" />
                        </div>
                        <div className="space-y-1.5 opacity-60">
                           <h2 className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Queue Clear</h2>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] max-w-[180px] mx-auto leading-relaxed italic">
                              Standing by for the next <br /> elite assignment.
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
