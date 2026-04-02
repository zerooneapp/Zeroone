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
       <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-black uppercase text-xs mx-auto">
          <ArrowLeft size={16} /> Portfolio Back
       </button>
       <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Transaction Expired or Not Found</h1>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-in slide-in-from-right duration-500">
      
      {/* 🔙 HEADER */}
      <div className="flex items-center justify-between">
         <button 
           onClick={() => navigate(-1)}
           className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-500 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
         >
            <ArrowLeft size={16} /> Transaction Audit
         </button>
         
         {booking.status === 'confirmed' && (
           <button 
             onClick={handleForceCancel}
             disabled={actionLoading}
             className="px-8 py-3 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-red-100 hover:bg-red-500 hover:text-white shadow-lg shadow-red-500/10"
           >
              {actionLoading ? "Processing Override..." : "Force Cancel Platform-wide"}
           </button>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* LEFT: PARTICIPANTS */}
         <div className="lg:col-span-1 space-y-8">
            <Section title="Customer Intelligence" icon={User}>
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/5 text-primary rounded-xl flex items-center justify-center font-black text-xl border border-primary/10">
                     {booking.userId?.name?.charAt(0)}
                  </div>
                  <div>
                     <h4 className="font-black dark:text-white uppercase tracking-tight">{booking.userId?.name}</h4>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{booking.userId?.phone}</p>
                  </div>
               </div>
               <InfoItem label="Email" value={booking.userId?.email} />
            </Section>

            <Section title="Vendor Compliance" icon={Store}>
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-amber-500/5 text-amber-500 rounded-xl flex items-center justify-center font-black text-xl border border-amber-500/10">
                     {booking.vendorId?.shopName?.charAt(0)}
                  </div>
                  <div>
                     <h4 className="font-black dark:text-white uppercase tracking-tight">{booking.vendorId?.shopName}</h4>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{booking.vendorId?.location?.address?.split(',')[0]}</p>
                  </div>
               </div>
               <InfoItem label="Owner" value={booking.vendorId?.ownerId?.name} />
               <InfoItem label="Staff Assigned" value={booking.staffId?.name || 'QUEUED (AUTO)'} />
            </Section>

            <Section title="Audit Metadata" icon={ShieldAlert}>
               <InfoItem label="Internal ID" value={booking._id} />
               <InfoItem label="Reference Code" value={booking.bookingId || 'NONE'} />
               <InfoItem label="Creation Timestamp" value={new Date(booking.createdAt).toLocaleString()} />
               <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Administrative Note</p>
                  <p className="text-[10px] font-bold text-gray-500">This transaction is subject to platform-wide governance. Overrides are logged.</p>
               </div>
            </Section>
         </div>

         {/* RIGHT: TRANSACTION DETAILS */}
         <div className="lg:col-span-2 space-y-8">
            
            {/* STATUS CAROUSEL-STYLE HEADER */}
            <div className="p-8 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Live Status</p>
                  <div className="flex items-center gap-3">
                     <BookingStatusLarge status={booking.status} />
                     <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Global State</span>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Settlement</p>
                  <h3 className="text-3xl font-black text-primary">₹{booking.totalPrice}</h3>
               </div>
            </div>

            {/* SERVICE SNAPSHOT */}
            <Section title="Service Snapshot" icon={Package}>
               <div className="space-y-4">
                  {booking.services?.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-transparent">
                       <div className="flex items-center gap-3">
                          <Bookmark size={16} className="text-primary" />
                          <span className="text-xs font-black uppercase dark:text-white tracking-widest">{s.name}</span>
                       </div>
                       <span className="text-xs font-black text-primary font-serif">₹{s.price}</span>
                    </div>
                  ))}
               </div>
               <div className="pt-4 mt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center px-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Price Breakdown</span>
                  <span className="text-xl font-black dark:text-white tracking-tighter">₹{booking.totalPrice}</span>
               </div>
            </Section>

            {/* STATUS TIMELINE */}
            <Section title="Transaction Lifecycle" icon={History}>
               <div className="space-y-8 pl-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800">
                  <TimelineItem 
                    title="Transaction Initiated" 
                    time={new Date(booking.createdAt).toLocaleString()} 
                    active 
                  />
                  {booking.status === 'cancelled' && (
                    <TimelineItem 
                      title={`Transaction Cancelled (${booking.cancelledBy || 'system'})`} 
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
                      title="Vendor Confirmed" 
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
  <div className="space-y-4">
     <div className="flex items-center gap-2 px-2">
        <Icon size={16} className="text-primary" />
        <h3 className="text-xs font-black dark:text-white uppercase tracking-widest">{title}</h3>
     </div>
     <div className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 space-y-4 shadow-sm">
        {children}
     </div>
  </div>
);

const InfoItem = ({ label, value, highlight }) => (
  <div className="px-2">
     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
     <p className={cn("text-[11px] font-black uppercase dark:text-white tracking-wide truncate", highlight && "text-red-500")}>
        {value || '---'}
     </p>
  </div>
);

const BookingStatusLarge = ({ status }) => {
  const styles = {
    completed: "bg-emerald-50 text-emerald-500 border-emerald-200",
    cancelled: "bg-red-50 text-red-500 border-red-200",
    confirmed: "bg-blue-50 text-blue-500 border-blue-200",
    pending: "bg-amber-50 text-amber-500 border-amber-200",
    ongoing: "bg-indigo-50 text-indigo-500 border-indigo-200"
  };
  return (
    <span className={cn("text-lg font-black uppercase px-6 py-2 rounded-2xl border-2 tracking-tighter shadow-sm", styles[status] || styles.pending)}>
      {status}
    </span>
  );
};

const TimelineItem = ({ title, time, active, color = "primary" }) => {
  const dots = {
    primary: "bg-primary shadow-primary/20",
    emerald: "bg-emerald-500 shadow-emerald-500/20",
    red: "bg-red-500 shadow-red-500/20",
    blue: "bg-blue-500 shadow-blue-500/20"
  };
  return (
    <div className="relative pl-10">
       <div className={cn(
         "absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 shadow-lg z-10 transition-all",
         active ? dots[color] : "bg-gray-200"
       )} />
       <div>
          <h5 className={cn("text-[11px] font-black uppercase tracking-widest", active ? "dark:text-white" : "text-gray-400")}>{title}</h5>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-wider">{time}</p>
       </div>
    </div>
  );
};

export default AdminBookingDetail;
