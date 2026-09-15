import React, { useState, useEffect } from 'react';
import {
   ClipboardList, CheckCircle, Clock,
   ShieldCheck, User, CheckCircle2,
   RefreshCw, Phone, Sun, Moon, Bell,
   Lock, Play, LogOut, MapPin, CalendarPlus, Calendar, Package
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
import CompleteBookingPaymentModal from '../components/CompleteBookingPaymentModal';
import RevenueBreakdownModal from '../components/RevenueBreakdownModal';
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
   const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
   const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
   const activeBookings = bookings.filter(
      (booking) => booking.status === 'confirmed' || booking.status === 'assigned' || booking.status === 'pending' || booking.status === 'pending_completion'
   );
   const upcomingBookings = activeBookings.slice(1, 4);

   const handleStatusUpdate = async (bookingId, action) => {
      if (action === 'complete') {
         setConfirmModal({ isOpen: true, bookingId });
         return;
      }
      await executeStatusUpdate(bookingId, action);
   };

   const executeStatusUpdate = async (bookingId, action, paymentType = null) => {
      try {
         await api.patch(`/bookings/${bookingId}/status`, { action, paymentType });
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
   const todayBookings = bookings.filter(b => dayjs(b.startTime).format('YYYY-MM-DD') === todayStr);
   const todayCompletedBookings = todayBookings.filter(b => b.status === 'completed');
   
   const todayRevenue = todayCompletedBookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
   const todayOnlineRevenue = todayCompletedBookings.filter(b => b.paymentType === 'online').reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
   const todayOfflineRevenue = todayCompletedBookings.filter(b => b.paymentType !== 'online').reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
   const todayClients = todayBookings.length;
   const servicesDone = todayCompletedBookings.length;
   const upcomingCount = activeBookings.length;

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
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-1.5">
               <div 
                  onClick={() => setIsRevenueModalOpen(true)}
                  className="bg-white dark:bg-gray-900 py-3 px-1 rounded-lg border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
               >
                  <p className="text-[8px] font-black text-[#00246b] dark:text-white tracking-tighter leading-none mb-2 truncate">Today revenue</p>
                  <p className="text-[13px] font-black text-[#00246b] dark:text-white leading-none">₹{todayRevenue}</p>
               </div>
               <div 
                  className="bg-white dark:bg-gray-900 py-3 px-1 rounded-lg border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center overflow-hidden"
               >
                  <p className="text-[8px] font-black text-[#00246b] dark:text-white tracking-tighter leading-none mb-2 truncate">Today clients</p>
                  <p className="text-[13px] font-black text-[#00246b] dark:text-white leading-none">{todayClients}</p>
               </div>
               <div 
                  className="bg-white dark:bg-gray-900 py-3 px-1 rounded-lg border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center overflow-hidden"
               >
                  <p className="text-[8px] font-black text-[#00246b] dark:text-white tracking-tighter leading-none mb-2 truncate">Services done</p>
                  <p className="text-[13px] font-black text-[#00246b] dark:text-white leading-none">{servicesDone}</p>
               </div>
               <div 
                  className="bg-white dark:bg-gray-900 py-3 px-1 rounded-lg border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center overflow-hidden"
               >
                  <p className="text-[8px] font-black text-[#00246b] dark:text-white tracking-tighter leading-none mb-2 truncate">Upcoming</p>
                  <p className="text-[13px] font-black text-[#00246b] dark:text-white leading-none">{upcomingCount}</p>
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
                  <p className="text-[11px] font-black text-white uppercase tracking-tight leading-none">New Entry</p>
                  <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Schedule an appointment</p>
               </div>
               <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-white text-base leading-none">+</span>
               </div>
            </button>



        <div className="px-0.5">
          <h2 className="text-[10px] font-black text-[#00246b] dark:text-white tracking-tight opacity-80 uppercase">
            Today's clients
          </h2>
        </div>

        <div className="space-y-1">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white dark:bg-gray-900 mx-0.5 rounded-lg animate-pulse border border-slate-100 dark:border-gray-800" />
            ))
          ) : activeBookings.length === 0 ? (
            <div className="py-12 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-slate-200 dark:border-gray-800 flex flex-col items-center justify-center gap-2 group shadow-sm mx-0.5">
              <div className="w-10 h-10 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-slate-300 group-hover:text-[#00246b] transition-colors">
                <Calendar size={18} />
              </div>
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">No appointments found</p>
            </div>
          ) : (
            activeBookings.map((item, idx) => {
              const phoneNum = item.userId?.phone || item.walkInCustomerPhone || item.customerPhone || item.phone || '';
              const customerName = item.walkInCustomerName || item.userId?.name || 'Client';
              const customerId = item.userId?._id || item._id;
              const serviceNames = item.services?.map(s => s.name || s.serviceId?.name).filter(Boolean).join(', ') || 'Service';
              const totalDuration = item.totalDuration || item.services?.reduce((acc, s) => acc + (s.duration || s.serviceId?.duration || 0), 0) || 30;

              let isTimeOver = false;
              if (item.endTime) {
                isTimeOver = new Date(item.endTime).getTime() < Date.now();
              } else if (item.startTime) {
                isTimeOver = new Date(item.startTime).getTime() + (item.totalDuration || 30) * 60000 < Date.now();
              }

              return (
                <motion.div
                  key={item._id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    navigate(`/staff/customers?phone=${phoneNum}&customerId=${customerId}&name=${encodeURIComponent(customerName)}`);
                  }}
                  className="relative bg-white dark:bg-gray-900 p-2 mx-0.5 rounded-lg shadow-sm border border-[#00246b]/10 dark:border-gray-800 flex items-center group cursor-pointer hover:border-slate-300 dark:hover:border-gray-700/80 transition-colors"
                >
                  {/* Vertically Centered: Call + Done buttons */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1.5 z-10">
                    {phoneNum && (
                      <a
                        href={`tel:${phoneNum}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-gray-700 shadow-sm active:scale-95 transition-all text-[#00246b] dark:text-blue-400"
                        title="Call Customer"
                      >
                        <Phone size={12} strokeWidth={2.5} />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(item._id, 'complete');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest active:scale-90 transition-all ${
                        isTimeOver
                          ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500'
                          : 'text-white bg-[#00246b] shadow-[#00246b]/10 shadow-lg'
                      }`}
                    >
                      Done
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 pr-20">
                    <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-gray-800 group-hover:shadow-md transition-all shrink-0">
                      <img
                        src={item.userId?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=00246b&color=ffffff&bold=true`}
                        alt={customerName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-0 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[12px] font-black text-[#00246b] dark:text-white leading-tight tracking-tight truncate">
                          {customerName}
                        </h4>
                      </div>
                      <div className="flex flex-col gap-1 text-[8px] font-bold text-slate-400 tracking-tight mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#00246b] dark:text-white uppercase">{formatTime(item.startTime)}</span>
                          <span className="opacity-20">&bull;</span>
                          <span className="truncate max-w-[150px]">{serviceNames}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase">{item.type === 'home' ? 'Home' : (item.staffType === 'owner' ? 'Owner' : 'Staff')}</span>
                          <span className="opacity-20">&bull;</span>
                          <span className="truncate max-w-[80px]">{item.staffName || user?.name || 'Staff'}</span>
                          {totalDuration && (
                            <>
                              <span className="opacity-20">&bull;</span>
                              <Clock size={8} className="text-slate-400 shrink-0" />
                              <span>{totalDuration} min</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
         </main>

         <Navbar />
         <NotificationDrawer isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

         <CompleteBookingPaymentModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal({ isOpen: false, bookingId: null })}
            onConfirm={(paymentType) => executeStatusUpdate(confirmModal.bookingId, 'complete', paymentType)}
            title="Complete Booking"
            message="Are you sure this booking is fully completed? Please select the payment method:"
         />

         {isRevenueModalOpen && (
            <RevenueBreakdownModal
               isOpen={isRevenueModalOpen}
               onClose={() => setIsRevenueModalOpen(false)}
               onlineAmount={todayOnlineRevenue}
               offlineAmount={todayOfflineRevenue}
               totalAmount={todayRevenue}
            />
         )}

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
