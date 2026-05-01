import React, { useState, useEffect } from 'react';
import {
   ArrowLeft, User, Phone, Calendar,
   MapPin, Clock, CreditCard, ShieldAlert,
   Store, CheckCircle, XCircle, Ban,
   Package, History, AlertCircle, Bookmark,
   HandCoins, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const AdminBookingDetail = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const [booking, setBooking] = useState(null);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);

   useEffect(() => {
      const fetchBooking = async () => {
         try {
            setLoading(true);
            const res = await api.get(`/admin/bookings/${id}`);
            setBooking(res.data);
         } catch (err) {
            toast.error('Failed to load transaction details');
         } finally {
            setLoading(false);
         }
      };
      fetchBooking();
   }, [id]);

   const handleForceCancel = async () => {
      if (!window.confirm('FORCE OVERRIDE: Are you sure you want to cancel this booking?')) return;
      try {
         setActionLoading(true);
         // Optimistic Update
         setBooking(prev => ({ ...prev, status: 'cancelled' }));

         await api.patch(`/admin/bookings/${id}/cancel`, { reason: 'Force cancelled by SuperAdmin' });
         toast.success('Platform Override Successful ✅');
         // Refresh
         const res = await api.get(`/admin/bookings/${id}`);
         setBooking(res.data);
      } catch (err) {
         toast.error('Override Failed');
      } finally {
         setActionLoading(false);
      }
   };

   if (loading) return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
         <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
   );

   if (!booking) return (
      <div className="p-20 text-center space-y-6">
         <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-black capitalize text-xs mx-auto">
            <ArrowLeft size={16} /> Portfolio Back
         </button>
         <h1 className="text-2xl font-black dark:text-white capitalize tracking-tighter">Transaction Expired or Not Found</h1>
      </div>
   );

   return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-500">

         {/* 🔙 HEADER */}
         <div className="flex items-center justify-between">
            <button
               onClick={() => navigate(-1)}
               className="flex items-center gap-2 px-4 h-9 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 text-slate-500 hover:text-primary transition-all font-black text-[9px] capitalize tracking-widest shadow-sm"
            >
               <ArrowLeft size={14} strokeWidth={3} /> Transaction Audit
            </button>

            {booking.status === 'confirmed' && (
               <button
                  onClick={handleForceCancel}
                  disabled={actionLoading}
                  className="px-4 h-9 bg-red-50 text-red-500 rounded-xl font-black text-[9px] capitalize tracking-widest transition-all border border-red-100/50 hover:bg-red-500 hover:text-white shadow-sm"
               >
                  {actionLoading ? "Processing Override..." : "Force Cancel Platform-wide"}
               </button>
            )}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* LEFT: PARTICIPANTS */}
            <div className="lg:col-span-1 space-y-5">
               <Section title="Customer Intelligence" icon={User}>
                  <div className="flex items-center gap-3.5">
                     <div className="w-11 h-11 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-lg shadow-lg border border-white/10">
                        {booking.userId?.name?.charAt(0)}
                     </div>
                     <div className="leading-tight">
                        <h4 className="text-[12px] font-black text-slate-900 dark:text-white capitalize tracking-tight">{booking.userId?.name}</h4>
                        <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest opacity-60">{booking.userId?.phone}</p>
                     </div>
                  </div>
               </Section>

               <Section title="Partner Compliance" icon={Store}>
                  <div className="flex items-center gap-3.5">
                     <div className="w-11 h-11 bg-amber-500 text-white rounded-lg flex items-center justify-center font-black text-lg shadow-lg border border-white/10">
                        {booking.vendorId?.shopName?.charAt(0)}
                     </div>
                     <div className="leading-tight">
                        <h4 className="text-[12px] font-black text-slate-900 dark:text-white capitalize tracking-tight">{booking.vendorId?.shopName}</h4>
                        <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest mt-0.5 opacity-60">{booking.vendorId?.location?.address?.split(',')[0]}</p>
                     </div>
                  </div>
                  <div className="pt-2 space-y-3.5">
                     <InfoItem label="Operational Owner" value={booking.vendorId?.ownerId?.name} />
                     <InfoItem label="Staff Assigned" value={booking.staffId?.name || 'QUEUED (AUTO)'} />
                  </div>
               </Section>

               <Section title="Audit Metadata" icon={ShieldAlert}>
                  <div className="space-y-3.5">
                     <InfoItem label="Internal ID" value={booking._id} />
                     <InfoItem label="Reference Code" value={booking.bookingId || 'NONE'} />
                     <InfoItem label="Creation Timestamp" value={new Date(booking.createdAt).toLocaleString()} />
                  </div>
                  <div className="mt-2 p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-100 dark:border-gray-800">
                     <p className="text-[7.5px] font-black text-slate-400 capitalize tracking-widest mb-1 opacity-60">Administrative Note</p>
                     <p className="text-[10px] font-black text-slate-500 dark:text-gray-400 leading-relaxed opacity-80">This transaction is subject to platform-wide governance. Overrides are logged in the secure audit path.</p>
                  </div>
               </Section>
            </div>

            {/* RIGHT: TRANSACTION DETAILS */}
            <div className="lg:col-span-2 space-y-5">

               {/* STATUS CAROUSEL-STYLE HEADER */}
               <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex items-center justify-between no-scrollbar overflow-x-auto">
                  <div>
                     <p className="text-[8px] font-black text-slate-400 capitalize tracking-[0.2em] mb-2 opacity-60">Transaction State</p>
                     <div className="flex items-center gap-3">
                        <BookingStatusLarge status={booking.status} />
                        <span className="text-[9px] font-black text-slate-300 capitalize tracking-widest">Global Node</span>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[8px] font-black text-slate-400 capitalize tracking-[0.2em] mb-1 opacity-60 font-black">Settlement</p>
                     <h3 className="text-[24px] font-black text-slate-900 dark:text-white tracking-tighter leading-none">₹{booking.totalPrice}</h3>
                  </div>
               </div>

               {/* SERVICE SNAPSHOT */}
               <Section title="Service Snapshot" icon={Package}>
                  <div className="space-y-2">
                     {booking.services?.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-transparent group hover:bg-slate-900 hover:text-white transition-all">
                           <div className="flex items-center gap-2.5">
                              <Bookmark size={14} strokeWidth={3} className="text-primary opacity-60 group-hover:text-white" />
                              <span className="text-[11px] font-black capitalize tracking-widest">{s.name}</span>
                           </div>
                           <span className="text-[12px] font-black">₹{s.price}</span>
                        </div>
                     ))}
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-gray-800 flex justify-between items-center px-2">
                     <span className="text-[8px] font-black text-slate-400 capitalize tracking-widest opacity-60">Total Aggregate Price</span>
                     <span className="text-[18px] font-black text-slate-900 dark:text-white tracking-tighter">₹{booking.totalPrice}</span>
                  </div>
               </Section>

               {/* STATUS TIMELINE */}
               <Section title="Transaction Lifecycle" icon={History}>
                  <div className="space-y-6 pl-2 relative before:absolute before:left-[19.5px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-gray-800">
                     <TimelineItem
                        title="Transaction Initiated"
                        time={new Date(booking.createdAt).toLocaleString()}
                        active
                     />
                     {booking.status === 'cancelled' && (
                        <TimelineItem
                           title={`Transaction Cancelled (${booking.cancelledBy || 'Platform Override'})`}
                           time={booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : 'N/A'}
                           color="red"
                           active
                        />
                     )}
                     {booking.status === 'completed' && (
                        <TimelineItem
                           title="Service Finalized"
                           time={new Date(booking.updatedAt).toLocaleString()}
                           color="emerald"
                           active
                        />
                     )}
                     {booking.status === 'confirmed' && (
                        <TimelineItem
                           title="Partner Confirmed"
                           time={new Date(booking.updatedAt).toLocaleString()}
                           color="blue"
                           active
                        />
                     )}
                  </div>
               </Section>

            </div>

         </div>

      </div>
   );
};

// --- SUB COMPONENTS ---

const Section = ({ title, icon: Icon, children }) => (
   <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
         <Icon size={14} strokeWidth={3} className="text-primary opacity-80" />
         <h3 className="text-[9px] font-black text-slate-900 dark:text-white capitalize tracking-widest opacity-80">{title}</h3>
      </div>
      <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 space-y-4 shadow-sm">
         {children}
      </div>
   </div>
);

const InfoItem = ({ label, value, highlight }) => (
   <div className="leading-tight">
      <p className="text-[7.5px] font-black text-slate-400 capitalize tracking-[0.2em] mb-1 leading-none opacity-60">{label}</p>
      <p className={cn("text-[11px] font-black capitalize text-slate-900 dark:text-white tracking-tighter truncate", highlight && "text-red-500")}>
         {value || '---'}
      </p>
   </div>
);

const BookingStatusLarge = ({ status }) => {
   const styles = {
      completed: "bg-emerald-50 text-emerald-500 border-emerald-100/50",
      cancelled: "bg-red-50 text-red-500 border-red-100/50",
      confirmed: "bg-blue-50 text-blue-500 border-blue-100/50",
      pending: "bg-amber-50 text-amber-500 border-amber-100/50",
      ongoing: "bg-indigo-50 text-indigo-500 border-indigo-100/50"
   };
   return (
      <span className={cn("text-[11px] font-black capitalize px-3 py-1 rounded-md border tracking-tighter shadow-sm", styles[status] || styles.pending)}>
         {status}
      </span>
   );
};

const TimelineItem = ({ title, time, active, color = "primary" }) => {
   const dots = {
      primary: "bg-slate-900 shadow-slate-900/20",
      emerald: "bg-emerald-500 shadow-emerald-500/20",
      red: "bg-red-500 shadow-red-500/20",
      blue: "bg-blue-500 shadow-blue-500/20"
   };
   return (
      <div className="relative pl-8">
         <div className={cn(
            "absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm z-10 transition-all",
            active ? dots[color] : "bg-slate-200"
         )} />
         <div className="leading-none">
            <h5 className={cn("text-[10px] font-black capitalize tracking-widest leading-none", active ? "text-slate-900 dark:text-white" : "text-slate-400")}>{title}</h5>
            <p className="text-[8.5px] font-black text-slate-400 capitalize mt-1.5 tracking-wider opacity-60 leading-none">{time}</p>
         </div>
      </div>
   );
};

export default AdminBookingDetail;
