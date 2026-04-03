import React, { useState, useEffect } from 'react';
import {
   ArrowLeft, User, Phone, Calendar,
   Shield, Ban, History, CreditCard,
   MapPin, CheckCircle, XCircle, Clock,
   Package, LayoutDashboard, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const UserDetail = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const [user, setUser] = useState(null);
   const [bookings, setBookings] = useState([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchData = async () => {
         try {
            setLoading(true);
            const [bookingsRes, userRes] = await Promise.all([
               api.get(`/admin/users/${id}/bookings`),
               api.get(`/admin/users/${id}`)
            ]);
            setBookings(bookingsRes.data);
            setUser(userRes.data);
         } catch (err) {
            toast.error('Failed to load user details');
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, [id]);

   const handleToggleBlock = async () => {
      if (!user) return;
      const previousUser = { ...user };

      // Optimistic UI
      setUser({ ...user, isBlocked: !user.isBlocked });

      try {
         const res = await api.patch(`/admin/users/${user._id}/block`);
         toast.success(res.data.message);
      } catch (err) {
         setUser(previousUser);
         toast.error('Action failed');
      }
   };

   const bookingStats = {
      total: bookings.length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
   };

   if (loading) return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
         <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
   );

   if (!user) return (
      <div className="p-20 text-center space-y-6">
         <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-black uppercase text-xs mx-auto">
            <ArrowLeft size={16} /> Go Back
         </button>
         <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">User not found</h1>
      </div>
   );

   return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-500">

         {/* 🔙 HEADER */}
         <div className="flex items-center justify-between">
            <button
               onClick={() => navigate(-1)}
               className="flex items-center gap-2 px-4 h-9 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 text-slate-500 hover:text-primary transition-all font-black text-[9px] uppercase tracking-widest shadow-sm"
            >
               <ArrowLeft size={14} strokeWidth={3} /> Profile Audit
            </button>

            <button
               onClick={handleToggleBlock}
               className={cn(
                  "px-5 h-9 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border shadow-sm",
                  user.isBlocked
                     ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                     : "bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white"
               )}
            >
               {user.isBlocked ? "Unblock Account" : "Block User Account"}
            </button>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* LEFT: USER DETAILS */}
            <div className="lg:col-span-1 space-y-5">
               <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm text-center">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-xl flex items-center justify-center mx-auto mb-4 text-3xl font-black italic shadow-xl border border-white/10">
                     {user.name?.charAt(0)}
                  </div>
                  <h2 className="text-[18px] font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1 leading-none">{user.name}</h2>
                  <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 opacity-60 italic">Customer Since {new Date(user.createdAt).getFullYear()}</p>

                  <div className="space-y-3.5 text-left">
                     <InfoItem icon={Phone} label="Contact" value={user.phone} />
                     <InfoItem icon={Calendar} label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
                     <InfoItem icon={Shield} label="Account Status" value={user.isBlocked ? 'BLOCKED' : 'ACTIVE'} highlight={user.isBlocked} />
                  </div>
               </div>

               <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 px-1">
                     <TrendingUp size={14} strokeWidth={3} className="text-primary" />
                     <h3 className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest opacity-80">Booking Insights</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                     <InsightCard label="Total Requests" value={bookingStats.total} color="primary" />
                     <InsightCard label="Success Rate" value={`${bookingStats.total ? Math.round((bookingStats.completed / bookingStats.total) * 100) : 0}%`} color="emerald" />
                     <InsightCard label="Cancellations" value={bookingStats.cancelled} color="red" />
                  </div>
               </div>
            </div>

            {/* RIGHT: BOOKING HISTORY */}
            <div className="lg:col-span-2 space-y-4">
               <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                     <History size={14} strokeWidth={3} className="text-primary" /> Transaction History
                  </h3>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">{bookings.length} Bookings Total</span>
               </div>

               <div className="space-y-2.5">
                  {bookings.map((booking, i) => (
                     <motion.div
                        key={booking._id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => navigate(`/booking-status/${booking._id}`)}
                        className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4 group hover:border-primary transition-all cursor-pointer no-scrollbar"
                     >
                        <div className="flex items-center gap-3.5">
                           <div className="w-11 h-11 bg-slate-50 dark:bg-gray-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all border border-slate-100 dark:border-gray-700 shadow-inner">
                              <Package size={20} strokeWidth={3} />
                           </div>
                           <div className="leading-tight">
                              <h4 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors">{booking.vendorId?.shopName || 'Unknown Vendor'}</h4>
                              <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 mt-0.5 opacity-60">
                                 <Clock size={10} strokeWidth={3} /> {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                           </div>
                        </div>

                        <div className="hidden md:flex items-center gap-8 px-8 border-x border-slate-100 dark:border-gray-800">
                           <div className="text-center">
                              <p className="text-[7.5px] font-black text-slate-400 uppercase mb-1 tracking-widest opacity-60">Price</p>
                              <p className="text-[12px] font-black text-slate-900 dark:text-white italic">₹{booking.totalPrice}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[7.5px] font-black text-slate-400 uppercase mb-1 tracking-widest opacity-60">Status</p>
                              <BookingStatusBadge status={booking.status} />
                           </div>
                        </div>

                        <div className="shrink-0">
                           <div className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-gray-800 rounded-lg text-slate-300 group-hover:text-primary transition-all border border-slate-100 dark:border-gray-700">
                              <ChevronRight size={16} strokeWidth={3} />
                           </div>
                        </div>
                     </motion.div>
                  ))}

                  {bookings.length === 0 && (
                     <div className="p-16 text-center border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-2xl bg-slate-50/30 dark:bg-gray-900/10 space-y-4">
                        <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 dark:border-gray-700">
                           <History size={28} className="text-slate-200" strokeWidth={3} />
                        </div>
                        <p className="font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest text-[9px] opacity-80 italic">No bookings found in audit logs</p>
                     </div>
                  )}
               </div>
            </div>

         </div>

      </div>
   );
};

// --- SUB COMPONENTS ---

const InfoItem = ({ icon: Icon, label, value, highlight }) => (
   <div className="flex items-start gap-3">
      <div className="p-1.5 bg-slate-50 dark:bg-gray-800 rounded-lg text-primary mt-0.5 border border-slate-100 dark:border-gray-700 shadow-sm">
         <Icon size={12} strokeWidth={3} />
      </div>
      <div className="leading-tight pt-0.5">
         <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1 opacity-60">{label}</p>
         <p className={cn("text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-tight", highlight && "text-red-500")}>
            {value || '---'}
         </p>
      </div>
   </div>
);

const InsightCard = ({ label, value, color }) => {
   const colors = {
      primary: "bg-slate-900 dark:bg-primary text-white border-slate-800 shadow-lg",
      emerald: "bg-emerald-50 text-emerald-500 border-emerald-100/50",
      red: "bg-red-50 text-red-500 border-red-100/50"
   };
   return (
      <div className={cn("p-3.5 rounded-xl border flex items-center justify-between transition-all active:scale-95 shadow-sm", colors[color])}>
         <span className="text-[8.5px] font-black uppercase tracking-widest opacity-90">{label}</span>
         <span className="text-[16px] font-black italic">{value}</span>
      </div>
   );
};

const BookingStatusBadge = ({ status }) => {
   const styles = {
      completed: "bg-emerald-50 text-emerald-500 border-emerald-100/50",
      cancelled: "bg-red-50 text-red-500 border-red-100/50",
      confirmed: "bg-blue-50 text-blue-500 border-blue-100/50",
      pending: "bg-amber-50 text-amber-500 border-amber-100/50",
      ongoing: "bg-indigo-50 text-indigo-500 border-indigo-100/50"
   };
   return (
      <span className={cn("text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md border tracking-tighter", styles[status] || styles.pending)}>
         {status}
      </span>
   );
};

export default UserDetail;
