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
    <div className="space-y-8 pb-20 animate-in slide-in-from-right duration-500">
      
      {/* 🔙 HEADER */}
      <div className="flex items-center justify-between">
         <button 
           onClick={() => navigate(-1)}
           className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-500 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
         >
            <ArrowLeft size={16} /> Profile Audit
         </button>
         
         <button 
           onClick={handleToggleBlock}
           className={cn(
             "px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border shadow-lg shadow-primary/10",
             user.isBlocked 
               ? "bg-emerald-500 text-white border-emerald-600" 
               : "bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white"
           )}
         >
            {user.isBlocked ? "Unblock User" : "Block User Account"}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* LEFT: USER DETAILS */}
         <div className="lg:col-span-1 space-y-8">
            <div className="p-8 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm text-center">
               <div className="w-24 h-24 bg-primary/5 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-4xl font-black">
                  {user.name?.charAt(0)}
               </div>
               <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-1">{user.name}</h2>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Customer Since {new Date(user.createdAt).getFullYear()}</p>
               
               <div className="space-y-4 text-left">
                  <InfoItem icon={Phone} label="Contact" value={user.phone} />
                  <InfoItem icon={Calendar} label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
                  <InfoItem icon={Shield} label="Account Status" value={user.isBlocked ? 'BLOCKED' : 'ACTIVE'} highlight={user.isBlocked} />
               </div>
            </div>

            <div className="p-8 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
               <h3 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" /> Booking Insights
               </h3>
               <div className="grid grid-cols-1 gap-4">
                  <InsightCard label="Total Requests" value={bookingStats.total} color="primary" />
                  <InsightCard label="Success Rate" value={`${bookingStats.total ? Math.round((bookingStats.completed / bookingStats.total) * 100) : 0}%`} color="emerald" />
                  <InsightCard label="Cancellations" value={bookingStats.cancelled} color="red" />
               </div>
            </div>
         </div>

         {/* RIGHT: BOOKING HISTORY */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-4">
               <h3 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <History size={16} className="text-primary" /> Transaction History
               </h3>
               <span className="text-[10px] font-black text-gray-400 uppercase">{bookings.length} Bookings Total</span>
            </div>

            <div className="space-y-4">
               {bookings.map((booking, i) => (
                 <motion.div 
                   key={booking._id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:translate-x-2 transition-all"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <Package size={24} />
                       </div>
                       <div>
                          <h4 className="font-black dark:text-white uppercase tracking-tight">{booking.vendorId?.shopName || 'Unknown Vendor'}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                             <Clock size={10} /> {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                       </div>
                    </div>

                    <div className="flex items-center gap-8 px-4 md:border-x border-gray-100 dark:border-gray-800">
                       <div className="text-center">
                          <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Price</p>
                          <p className="text-sm font-black dark:text-white">₹{booking.totalPrice}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Status</p>
                          <BookingStatusBadge status={booking.status} />
                       </div>
                    </div>

                    <div className="shrink-0">
                       <button 
                         onClick={() => navigate(`/booking-status/${booking._id}`)}
                         className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-primary transition-colors"
                       >
                          <ChevronRight size={20} />
                       </button>
                    </div>
                 </motion.div>
               ))}

               {bookings.length === 0 && (
                 <div className="p-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem] space-y-4">
                    <History size={40} className="mx-auto text-gray-200" />
                    <p className="font-black text-gray-300 uppercase tracking-widest text-xs">User has not made any bookings yet</p>
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
     <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-primary mt-0.5">
        <Icon size={14} />
     </div>
     <div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={cn("text-xs font-black uppercase dark:text-white", highlight && "text-red-500")}>
           {value || '---'}
        </p>
     </div>
  </div>
);

const InsightCard = ({ label, value, color }) => {
  const colors = {
    primary: "bg-primary/5 text-primary border-primary/10",
    emerald: "bg-emerald-50 text-emerald-500 border-emerald-100",
    red: "bg-red-50 text-red-500 border-red-100"
  };
  return (
    <div className={cn("p-4 rounded-2xl border flex items-center justify-between", colors[color])}>
       <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
       <span className="text-xl font-black">{value}</span>
    </div>
  );
};

const BookingStatusBadge = ({ status }) => {
  const styles = {
    completed: "bg-emerald-50 text-emerald-500",
    cancelled: "bg-red-50 text-red-500",
    confirmed: "bg-blue-50 text-blue-500",
    pending: "bg-amber-50 text-amber-500",
    ongoing: "bg-indigo-50 text-indigo-500"
  };
  return (
    <span className={cn("text-[10px] font-black uppercase px-3 py-1 rounded-full", styles[status] || styles.pending)}>
      {status}
    </span>
  );
};

export default UserDetail;
