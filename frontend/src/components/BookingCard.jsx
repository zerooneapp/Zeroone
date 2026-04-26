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
         case 'confirmed': return 'bg-[#1C2C4E]/10 text-[#1C2C4E] border-[#1C2C4E]/20 dark:bg-gray-800/80 dark:text-blue-400 dark:border-blue-900/30';
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
         transition={{ type: "spring", stiffness: 300, damping: 25 }}
         className="bg-white/40 dark:bg-white/5 backdrop-blur-xl p-3.5 rounded-2xl border border-white/50 dark:border-white/10 shadow-xl transition-all group relative overflow-hidden"
      >
         <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-11 h-11 bg-slate-50 dark:bg-gray-800/80 rounded-xl flex items-center justify-center border border-slate-100 dark:border-gray-700/50 shadow-sm relative overflow-hidden">
                  {(booking.userId?.image || booking.customerImage) ? (
                     <img 
                        src={booking.userId?.image || booking.customerImage} 
                        className="w-full h-full object-cover" 
                        alt={booking.walkInCustomerName || booking.userId?.name || 'Customer'}
                     />
                  ) : (
                     <User size={20} className="text-slate-400 dark:text-gray-500" />
                  )}
                  {booking.isWalkIn && (
                     <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#1C2C4E] text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm">
                        <ShoppingBag size={8} />
                     </div>
                  )}
               </div>
               <div>
                  <div className="flex items-center gap-1.5 leading-none">
                     <h3 className="font-black text-gray-900 dark:text-white text-sm tracking-tight">{booking.walkInCustomerName || booking.userId?.name || 'Customer'}</h3>
                     {isToday && booking.status === 'confirmed' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                     )}
                  </div>
                  <div className="mt-2.5 space-y-1">
                     {booking.services.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[8.5px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-none">
                           <div className="w-1 h-1 bg-[#1C2C4E]/40 rounded-full shrink-0" />
                           <span className="truncate max-w-[200px]">{s.name}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border tracking-widest leading-none ${getStatusStyles(booking.status)} shadow-sm`}>
               {booking.status}
            </span>
         </div>

         <div className="grid grid-cols-2 gap-4 py-3 border-y border-dashed border-slate-100 dark:border-gray-800/50 my-3 relative z-10">
            <div className="space-y-2">
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none">
                     <Calendar size={10} strokeWidth={3} /> Schedule
                  </p>
                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">
                     {dayjs(booking.startTime).format('DD MMM, YYYY')}
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none">
                     <User size={10} strokeWidth={3} className="text-emerald-500" /> Assigned Staff
                  </p>
                  <p className="text-[10px] font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight leading-none">
                     {booking.staffId?.isOwner ? <span className="text-emerald-600 dark:text-emerald-400">You (Owner)</span> : (booking.staffId?.name || 'Self')}
                  </p>
               </div>
            </div>
            <div className="space-y-2 text-right flex flex-col items-end">
               <div className="space-y-1 text-right flex flex-col items-end">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none">
                     <Clock size={10} strokeWidth={3} className="text-[#1C2C4E]" /> Arrival
                  </p>
                  <p className="text-[11px] font-black text-[#1C2C4E] uppercase tracking-tighter leading-none">
                     {dayjs(booking.startTime).format('hh:mm A')}
                  </p>
               </div>
               <div className="space-y-1 text-right flex flex-col items-end">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none">
                     <Clock size={10} strokeWidth={3} className="text-slate-400" /> Duration
                  </p>
                  <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-tight leading-none">
                     {booking.totalDuration} Mins
                  </p>
               </div>
            </div>
         </div>

         <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col leading-none">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</span>
               <span className="text-lg font-black text-gray-900 dark:text-white tracking-tighter leading-none">₹{booking.totalPrice}</span>
            </div>

            {booking.status === 'confirmed' && (
               <div className="flex gap-2">
                  <button
                     disabled={isActionLoading}
                     onClick={(e) => { e.stopPropagation(); onComplete(booking._id); }}
                     className="h-9 px-4 bg-slate-900 dark:bg-[#1C2C4E] text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-black/10 dark:shadow-[#1C2C4E]/20 disabled:opacity-50 border border-white/10"
                  >
                     {isActionLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={14} />}
                     Complete
                  </button>
                  <button
                     disabled={!booking.canCancel || isActionLoading}
                     onClick={(e) => { e.stopPropagation(); onCancel(booking._id); }}
                     className="h-9 w-9 bg-slate-50 dark:bg-gray-800 text-rose-500 rounded-xl flex items-center justify-center active:scale-95 transition-all border border-slate-100 dark:border-gray-700/50 shadow-sm disabled:opacity-30"
                  >
                     <XCircle size={18} />
                  </button>
               </div>
            )}

          </div>
       </motion.div>
   );
};

export default BookingCard;
