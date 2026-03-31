import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock, Calendar, ChevronRight, CheckCircle2, XCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const BookingCard = ({ booking, onComplete, onCancel, loadingId }) => {
  const navigate = useNavigate();
  const isActionLoading = loadingId === booking._id;

  const getStatusStyles = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-900/30';
      case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'cancelled': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10 dark:text-rose-400 dark:border-rose-900/30';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const isToday = dayjs(booking.startTime).isSame(dayjs(), 'day');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={() => navigate(`/vendor/booking-status/${booking._id}`)}
      className="bg-white dark:bg-gray-900 p-6 rounded-[3rem] border border-slate-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group cursor-pointer relative overflow-hidden"
    >
      {/* 🔮 STATUS GLOWL (Subtle Accent) */}
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 rounded-full -mr-16 -mt-16 blur-3xl ${
          booking.status === 'completed' ? 'bg-emerald-500' : booking.status === 'confirmed' ? 'bg-blue-500' : 'bg-rose-500'
      }`} />

      <div className="flex justify-between items-start relative z-10">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-50 dark:bg-gray-800/50 rounded-[1.8rem] flex items-center justify-center border border-slate-100/50 dark:border-gray-700/30 relative">
               <User size={26} className="text-slate-400 dark:text-gray-500" />
               {booking.isWalkIn && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                     <ShoppingBag size={10} />
                  </div>
               )}
            </div>
            <div>
               <div className="flex items-center gap-2">
                  <h3 className="font-black text-gray-900 dark:text-white text-base tracking-tight">{booking.walkInCustomerName || booking.userId?.name || 'Customer'}</h3>
                  {isToday && booking.status === 'confirmed' && (
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                  )}
               </div>
               <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em] mt-0.5 line-clamp-1">
                  {booking.services.map(s => s.name).join(' • ')}
               </p>
            </div>
         </div>
         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border tracking-widest ${getStatusStyles(booking.status)}`}>
            {booking.status}
         </span>
      </div>

      <div className="grid grid-cols-2 gap-6 py-6 border-y border-dashed border-slate-100 dark:border-gray-800/50 my-5 relative z-10">
         <div className="space-y-1.5">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
               <Calendar size={10} strokeWidth={3} /> Schedule
            </p>
            <p className="text-xs font-black dark:text-white uppercase tracking-tight">
               {dayjs(booking.startTime).format('DD MMM, YYYY')}
            </p>
         </div>
         <div className="space-y-1.5 text-right flex flex-col items-end">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
               <Clock size={10} strokeWidth={3} className="text-primary" /> Arrival
            </p>
            <p className="text-xs font-black text-primary uppercase tracking-tight">
               {dayjs(booking.startTime).format('hh:mm A')}
            </p>
         </div>
      </div>

      <div className="flex items-center justify-between relative z-10">
         <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Value</span>
            <span className="text-xl font-black text-gray-900 dark:text-white italic">₹{booking.totalPrice}</span>
         </div>
         
         {booking.status === 'confirmed' && (
            <div className="flex gap-3">
               <button 
                 disabled={isActionLoading}
                 onClick={(e) => { e.stopPropagation(); onComplete(booking._id); }}
                 className="h-12 px-6 bg-slate-900 dark:bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/20 dark:shadow-primary/20 disabled:opacity-50"
               >
                 {isActionLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={14} />} 
                 Complete
               </button>
               <button 
                 disabled={!booking.canCancel || isActionLoading}
                 onClick={(e) => { e.stopPropagation(); onCancel(booking._id); }}
                 className="h-12 w-12 bg-slate-50 dark:bg-gray-800 text-rose-500 rounded-2xl flex items-center justify-center active:scale-95 transition-all border border-slate-100 dark:border-gray-700/50 shadow-sm disabled:opacity-30"
               >
                 <XCircle size={20} />
               </button>
            </div>
         )}
         
         {(booking.status === 'completed' || booking.status === 'cancelled') && (
            <button className="h-11 px-5 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-100 dark:border-gray-700/30">
               Audit Receipt <ChevronRight size={14} />
            </button>
         )}
      </div>
    </motion.div>
  );
};

export default BookingCard;
