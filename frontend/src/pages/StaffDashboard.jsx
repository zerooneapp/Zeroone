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
import useNotificationStore from '../store/notificationStore';
import useSocket from '../hooks/useSocket';
import Navbar from '../layouts/Navbar';
import NotificationDrawer from '../components/NotificationDrawer';

const StaffDashboard = () => {
   const { user, logout } = useAuthStore();
   const { isDarkMode, toggleTheme } = useThemeStore();
   const { unreadCount, fetchNotifications } = useNotificationStore();
   useSocket(user?._id);

   const [bookings, setBookings] = useState([]);
   const [loading, setLoading] = useState(true);
   const [showNotifications, setShowNotifications] = useState(false);

   const handleStatusUpdate = async (bookingId, action) => {
      if (action === 'complete' && !window.confirm('Mark this booking as completed?')) return;
      try {
         await api.patch(`/bookings/${bookingId}/status`, { action });
         toast.success(`Booking updated successfully!`);
         fetchBookings();
      } catch (err) {
         toast.error('Failed to update status');
      }
   };

   const fetchBookings = async (showLoading = true) => {
      try {
         if (showLoading) setLoading(true);
         const res = await api.get('/bookings/my');
         // 🚀 QUEUE LOGIC: Keep it sorted by time for "Immediate Next" delivery
         const sorted = (res.data || []).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
         setBookings(sorted);
         fetchNotifications(); // Sync global unread count
      } catch (err) {
         console.error('Core sync failed');
      } finally {
         if (showLoading) setLoading(false);
      }
   };

   useEffect(() => {
      fetchBookings(true);
      
      // Real-time Event Listener: Listen for NEW_NOTIFICATION from socket to auto-refresh queue
      const handleGlobalEvent = (e) => {
         if (e.detail?.type === 'ASSIGNMENT_RECEIVED' || e.detail?.type === 'NEW_BOOKING') {
            fetchBookings(false);
         }
      };
      
      window.addEventListener('new-socket-notification', handleGlobalEvent);
      return () => window.removeEventListener('new-socket-notification', handleGlobalEvent);
   }, []);

   // 🎯 CORE LOGIC: Find the single most immediate CONFIRMED task
   const currentTask = bookings.find(b => b.status === 'confirmed' || b.status === 'assigned');
   const canNavigateToCustomer = currentTask?.type === 'home' && Boolean(currentTask?.serviceAddress);

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
         <div className="px-5 pt-3.5 pb-2 bg-white/80 dark:bg-gray-900/80 sticky top-0 z-40 backdrop-blur-3xl border-b border-slate-200/60 dark:border-gray-800">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-1">
                  <h1 className="text-2xl font-black tracking-tighter leading-none flex items-center">
                     <span className="text-primary dark:text-white">Zero</span>
                     <span className="text-primary/30 dark:text-gray-600">One</span>
                  </h1>

               </div>

               <div className="flex items-center gap-1.5">
                  <button onClick={toggleTheme} className="p-2 text-slate-700 dark:text-gray-400 transition-all active:scale-90">
                     {isDarkMode ? <Sun size={17} strokeWidth={3} /> : <Moon size={17} strokeWidth={3} />}
                  </button>
                  <button onClick={() => setShowNotifications(true)} className="relative p-2 text-slate-700 dark:text-gray-400 transition-all active:scale-90">
                     <Bell size={17} strokeWidth={3} />
                     {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-gray-950" />}
                  </button>
               </div>
            </div>
         </div>

         <main className="p-4 space-y-3.5">
            {/* 📊 COMPACT STATS GRID */}
            <div className="grid grid-cols-2 gap-2.5">
               <div className="bg-white dark:bg-gray-900 p-3.5 px-4 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden">
                  <p className="text-[16px] font-black text-slate-900 dark:text-white leading-none">{todayCompleted}</p>
                  <div className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5 opacity-60">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Today Done
                  </div>
               </div>
               <div className="bg-white dark:bg-gray-900 p-3.5 px-4 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden">
                  <p className="text-[16px] font-black text-slate-900 dark:text-white leading-none">
                     {bookings.filter(b => b.status === 'confirmed' || b.status === 'assigned').length}
                  </p>
                  <div className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5 opacity-60">
                     <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Remainder
                  </div>
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
                                 {currentTask.userId?.image ? <img src={currentTask.userId.image} className="w-full h-full object-cover" alt={currentTask.userId?.name || 'Customer'} /> : <User size={20} strokeWidth={3} />}
                              </div>
                              <div className="leading-none">
                                 <h4 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight uppercase truncate max-w-[140px]">{currentTask.userId?.name || 'Client'}</h4>
                                 <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mt-2 shadow-sm">{formatTime(currentTask.startTime)}</p>
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
                                 {s.name || s.serviceId?.name || 'Task Node'}
                              </div>
                           ))}
                        </div>

                        {/* 📍 LOCATION AWARENESS */}
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-2">
                              <MapPin size={12} className="text-gray-400" />
                              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 truncate max-w-[170px]">
                                 {canNavigateToCustomer ? currentTask.serviceAddress : 'Shop Service'}
                              </p>
                           </div>
                           {canNavigateToCustomer && (
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentTask.serviceAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-black text-primary uppercase tracking-widest underline decoration-dotted"
                              >
                                Navigate
                              </a>
                           )}
                        </div>

                        {/* 💰 SERVICE PRICE DISPLAY */}
                        <div className="flex items-center justify-between mb-5 bg-slate-50/50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-50 dark:border-gray-800/50">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Service Price</p>
                           <p className="text-[14px] font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                              ₹{currentTask.services?.reduce((acc, s) => acc + (s.price || 0), 0) || 0}
                           </p>
                        </div>

                        <div className="grid grid-cols-5 gap-2.5">
                           {currentTask.canContact ? (
                              <a href={`tel:${currentTask.userId?.phone}`} className="h-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all border-b-2 border-white/10">
                                 <Phone size={18} strokeWidth={3} />
                              </a>
                           ) : (
                              <div className="h-11 bg-slate-100 dark:bg-gray-800 text-slate-300 dark:text-gray-600 rounded-xl flex items-center justify-center border border-slate-200/50 dark:border-gray-700 opacity-60">
                                 <Lock size={16} strokeWidth={3} />
                              </div>
                           )}

                           {canNavigateToCustomer && (
                              <a 
                                 href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentTask.serviceAddress)}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="h-11 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all border-b-2 border-white/10"
                              >
                                 <MapPin size={18} strokeWidth={3} />
                              </a>
                           )}

                           <button
                              onClick={() => {
                                 if (window.confirm('Are you sure the service is fully completed? This will release revenue to the vendor.')) {
                                    handleStatusUpdate(currentTask._id, 'complete');
                                 }
                              }}
                              className={`${canNavigateToCustomer ? 'col-span-3' : 'col-span-4'} h-11 bg-slate-950 dark:bg-primary text-white rounded-xl flex items-center justify-center gap-2.5 font-black text-[8.5px] uppercase tracking-widest active:scale-95 transition-all shadow-xl border-b-2 border-white/10`}
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
