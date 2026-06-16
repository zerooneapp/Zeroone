import React, { useState, useEffect } from 'react';
import {
   ClipboardList, CheckCircle, Clock,
   ShieldCheck, User, CheckCircle2,
   RefreshCw, Phone, Sun, Moon, Bell,
   Lock, Play, LogOut, MapPin, CalendarPlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import useNotificationStore from '../store/notificationStore';
import useSocket from '../hooks/useSocket';
import Navbar from '../layouts/Navbar';
import NotificationDrawer from '../components/NotificationDrawer';
import GlassConfirmationModal from '../components/GlassConfirmationModal';
import StaffCreateBookingModal from '../components/StaffCreateBookingModal';

const StaffDashboard = () => {
   const navigate = useNavigate();
   const { user, logout, myBookings, fetchMyBookings, fetchStaffProfile } = useAuthStore();
   const { unreadCount, fetchNotifications } = useNotificationStore();
   useSocket(user?._id);

   const bookings = [...(myBookings || [])].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
   const [loading, setLoading] = useState(myBookings.length === 0 && !user);
   const [showNotifications, setShowNotifications] = useState(false);
   const [confirmModal, setConfirmModal] = useState({ isOpen: false, bookingId: null });
   const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
   const activeBookings = bookings.filter(
      (booking) => booking.status === 'confirmed' || booking.status === 'assigned' || booking.status === 'pending'
   );
   const upcomingBookings = activeBookings.slice(1, 4);

   const handleStatusUpdate = async (bookingId, action) => {
      if (action === 'complete') {
         setConfirmModal({ isOpen: true, bookingId });
         return;
      }
      await executeStatusUpdate(bookingId, action);
   };

   const executeStatusUpdate = async (bookingId, action) => {
      try {
         await api.patch(`/bookings/${bookingId}/status`, { action });
         toast.success(`Booking updated successfully!`, {
            icon: action === 'complete' ? '✅' : '🚀',
            style: {
               borderRadius: '12px',
               background: '#00246b',
               color: '#fff',
               fontSize: '10px',
               fontWeight: '900',
               textTransform: 'uppercase',
               letterSpacing: '0.1em'
            }
         });
         fetchBookings();
      } catch (err) {
         toast.error('Failed to update status');
      }
   };

   const fetchBookings = async (showLoading = true) => {
      try {
         if (showLoading && myBookings.length === 0) setLoading(true);
         await fetchMyBookings();
         fetchNotifications(); // Sync global unread count
      } catch (err) {
         console.error('Core sync failed');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchBookings();
      fetchStaffProfile();

      const handleGlobalEvent = (e) => {
         const type = e.detail?.type;
         const refreshTypes = [
            'STAFF_ASSIGNED',
            'BOOKING_CANCELLED',
            'BOOKING_COMPLETED',
            'BOOKING_RESCHEDULED',
            'ASSIGNMENT_RECEIVED',
            'NEW_BOOKING',
            'NEW_REVIEW',
            'REVIEW_APPROVED'
         ];

         if (refreshTypes.includes(type)) {
            fetchBookings(false);
            fetchStaffProfile();
         }
      };

      window.addEventListener('new-socket-notification', handleGlobalEvent);
      return () => window.removeEventListener('new-socket-notification', handleGlobalEvent);
   }, []);

   // 🎯 CORE LOGIC: Find the single most immediate CONFIRMED task
   const currentTask = activeBookings[0];
   const canNavigateToCustomer = currentTask?.type === 'home' && Boolean(currentTask?.serviceAddress);

   const todayStr = dayjs().format('YYYY-MM-DD');
   const todayCompleted = bookings.filter(b =>
      b.status === 'completed' &&
      dayjs(b.startTime).format('YYYY-MM-DD') === todayStr
   ).length;

   const formatTime = (isoString) => {
      return new Date(isoString).toLocaleTimeString('en-IN', {
         hour: '2-digit', minute: '2-digit', hour12: true
      });
   };

   return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-32">
         {/* 🏙️ CLEAN MINIMAL HEADER (NO ITALIC) */}
         <div className="px-4 pt-[48px] pb-3 bg-white/80 dark:bg-gray-900/80 fixed top-0 left-0 right-0 z-40 backdrop-blur-3xl border-b border-slate-200/60 dark:border-gray-800">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-1">
                  <h1 className="text-2xl font-black tracking-tighter leading-none flex items-center">
                     <span className="text-primary dark:text-white">Zero</span>
                     <span className="text-primary/30 dark:text-white">One</span>
                  </h1>

               </div>

               <div className="flex items-center gap-1.5">

                  <button onClick={() => setShowNotifications(true)} className="relative p-2 text-slate-700 dark:text-gray-400 transition-all active:scale-90">
                     <Bell size={17} strokeWidth={3} />
                     {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-950 shadow-sm animate-pulse" />}
                  </button>
               </div>
            </div>
         </div>

         <main className="p-4 space-y-3.5 pt-[100px]">
            {/* 📊 COMPACT STATS GRID */}
            <div className="grid grid-cols-2 gap-2.5">
               <div 
                  onClick={() => navigate('/staff/bookings', { state: { tab: 'completed' } })}
                  className="bg-white dark:bg-gray-900 p-3.5 px-4 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
               >
                  <p className="text-[16px] font-black text-slate-900 dark:text-white leading-none">{todayCompleted}</p>
                  <div className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5 opacity-60">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Today Done
                  </div>
               </div>
               <div 
                  onClick={() => navigate('/staff/bookings', { state: { tab: 'upcoming' } })}
                  className="bg-white dark:bg-gray-900 p-3.5 px-4 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
               >
                  <p className="text-[16px] font-black text-slate-900 dark:text-white leading-none">
                     {activeBookings.length}
                  </p>
                  <div className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5 opacity-60">
                     <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Reminder
                  </div>
               </div>
            </div>

            {/* ➕ NEW BOOKING TILE */}
            <button
               onClick={() => setIsNewBookingOpen(true)}
               className="w-full flex items-center gap-3 bg-[#00246b] dark:bg-[#00246b] rounded-2xl px-4 py-3.5 shadow-lg shadow-[#00246b]/25 active:scale-[0.98] transition-all group"
            >
               <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center shrink-0 group-active:scale-90 transition-transform">
                  <CalendarPlus size={18} strokeWidth={2.5} className="text-white" />
               </div>
               <div className="flex-1 text-left">
                  <p className="text-[11px] font-black text-white uppercase tracking-tight leading-none">New Booking</p>
                  <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Schedule an appointment</p>
               </div>
               <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-white text-base leading-none">+</span>
               </div>
            </button>

            {/* 📟 THE SINGLE ACTIVE ASSIGNMENT QUEUE */}
            <div className="space-y-3.5">
               <AnimatePresence mode="wait">
                  {loading ? (
                     <div className="h-40 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl animate-pulse" />
                  ) : currentTask ? (
                     <>
                        <motion.div
                           initial={{ opacity: 0, scale: 0.98 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className="bg-white dark:bg-gray-900 p-3 px-4 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden active:scale-[0.99] transition-all"
                        >
                           <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-2.5">
                                 <div className="w-9 h-9 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-gray-300 overflow-hidden border border-slate-100 dark:border-gray-700/60">
                                    {currentTask.userId?.image ? (
                                       <img src={currentTask.userId.image} className="w-full h-full object-cover" alt="Client" />
                                    ) : (
                                       <User size={16} strokeWidth={3} />
                                    )}
                                 </div>
                                 <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                       <h3 className="text-[13px] font-black text-slate-900 dark:text-white leading-none">
                                          {currentTask.walkInCustomerName || currentTask.userId?.name || 'Walk-in Client'}
                                       </h3>
                                       <span className="text-[7.5px] font-black bg-primary/5 dark:bg-white/10 text-primary dark:text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                          Active
                                       </span>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-tight leading-none flex items-center gap-2">
                                       <span className="flex items-center gap-0.5 text-primary/75 dark:text-white/60">
                                          <Clock size={11} strokeWidth={3} /> {formatTime(currentTask.startTime)}
                                       </span>
                                       <span className="w-1 h-1 bg-slate-200 dark:bg-gray-700 rounded-full" />
                                       <span>
                                          Estimate: {currentTask.totalDuration} Mins
                                       </span>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="flex flex-wrap gap-x-3 mb-2.5 px-0.5">
                              {currentTask.services?.map((s, idx) => (
                                 <div key={idx} className="text-[9px] font-bold text-slate-500 dark:text-gray-400 flex items-center gap-1.5 tracking-tight">
                                    <div className="w-1 h-1 bg-primary/40 dark:bg-white/30 rounded-full" />
                                    {s.name || s.serviceId?.name || 'Service Task'}
                                 </div>
                              ))}
                           </div>

                           <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-gray-800/60 mt-2 px-0.5">
                              <div className="flex items-center gap-1.5">
                                 <MapPin size={11} className="text-gray-400 shrink-0" />
                                 <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 truncate max-w-[120px]">
                                    {canNavigateToCustomer ? currentTask.serviceAddress : 'Shop Service'}
                                 </p>
                                 {canNavigateToCustomer && (
                                    <a
                                       href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentTask.serviceAddress)}`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="text-[8px] font-black text-primary uppercase tracking-widest underline decoration-dotted ml-1"
                                    >
                                       Nav
                                    </a>
                                 )}
                              </div>
                              <p className="text-[13px] font-black text-slate-900 dark:text-white tracking-tighter leading-none flex items-center gap-1">
                                 {currentTask.originalTotalPrice > 0 && currentTask.originalTotalPrice !== currentTask.totalPrice ? (
                                    <>
                                       <span className="line-through text-[10px] font-bold text-slate-400 dark:text-gray-500 mr-0.5">₹{currentTask.originalTotalPrice}</span>
                                       <span>₹{currentTask.totalPrice}</span>
                                    </>
                                 ) : (
                                    `₹${currentTask.totalPrice}`
                                 )}
                              </p>
                           </div>
                        </motion.div>

                        {/* 🔘 FIXED ACTION BAR */}
                        <div className="fixed bottom-20 left-4 right-4 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-2xl flex gap-2 z-50">
                           {currentTask.canContact && !currentTask.isWalkIn && !currentTask.walkInCustomerName && (
                              <a href={`tel:${currentTask.userId?.phone}`} className="h-12 w-12 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-white rounded-xl flex items-center justify-center shadow-sm">
                                 <Phone size={20} strokeWidth={3} />
                              </a>
                           )}
                           {canNavigateToCustomer && (
                              <a 
                                 href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentTask.serviceAddress)}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="h-12 w-12 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg"
                              >
                                 <MapPin size={20} strokeWidth={3} />
                              </a>
                           )}
                           <button
                              onClick={() => handleStatusUpdate(currentTask._id, 'complete')}
                              className="flex-1 h-12 bg-[#00246b] text-white rounded-xl flex items-center justify-center gap-2.5 font-black text-[10px] uppercase tracking-widest shadow-xl"
                           >
                              <CheckCircle size={18} strokeWidth={3} />
                              Complete Job
                           </button>
                        </div>
                     </>
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

               {/* 📋 UPCOMING CLIENTS — Separate Section */}
               {upcomingBookings.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden">
                     <div className="px-4 pt-4 pb-2">
                        <h3 className="text-[10px] font-black text-slate-800 dark:text-white tracking-tight opacity-80 uppercase">
                           Upcoming Clients
                        </h3>
                     </div>
                     <div className="px-3 pb-3 space-y-2">
                        {upcomingBookings.map((booking) => (
                           <div
                              key={booking._id}
                              className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-2.5 py-2 dark:border-gray-800 dark:bg-gray-800/60"
                           >
                              <div className="min-w-0">
                                 <p className="truncate text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {booking.userId?.name || booking.walkInCustomerName || 'Client'}
                                 </p>
                                 <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">
                                    {formatTime(booking.startTime)} • {booking.type === 'home' ? 'Home' : 'Shop'}
                                 </p>
                              </div>
                              <p className="ml-3 max-w-[110px] truncate text-right text-[8px] font-black uppercase tracking-tight text-primary dark:text-white">
                                 {booking.services?.map((service) => service.name || service.serviceId?.name).filter(Boolean).join(', ') || 'Service'}
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

            </div>
         </main>

         <Navbar />
         <NotificationDrawer isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

         <GlassConfirmationModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal({ isOpen: false, bookingId: null })}
            onConfirm={() => executeStatusUpdate(confirmModal.bookingId, 'complete')}
            title="Job Completed"
            message="Are you sure the service is fully completed? This will release the revenue."
            confirmText="Yes, Done"
            cancelText="Not Yet"
         />

         {isNewBookingOpen && (
            <StaffCreateBookingModal
               isOpen={isNewBookingOpen}
               onClose={() => setIsNewBookingOpen(false)}
               onRefresh={() => fetchBookings(false)}
            />
         )}
      </div>
   );
};

export default StaffDashboard;
