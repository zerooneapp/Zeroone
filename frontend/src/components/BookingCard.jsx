import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock, Calendar, ChevronRight, CheckCircle2, XCircle, AlertCircle, ShoppingBag, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const BookingCard = ({ booking, onComplete, onCancel, loadingId, hasInStockProducts }) => {
   const navigate = useNavigate();
   const isActionLoading = loadingId === booking._id;

   const getStatusStyles = (status) => {
      switch (status) {
         case 'confirmed': return 'bg-[#00246b]/10 text-[#00246b] border-[#00246b]/20 dark:bg-gray-800/80 dark:text-blue-400 dark:border-blue-900/30';
         case 'pending_completion': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/30';
         case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/30';
         case 'cancelled': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10 dark:text-rose-400 dark:border-rose-900/30';
         default: return 'bg-gray-100 text-gray-500';
      }
   };

   const isToday = dayjs(booking.startTime).isSame(dayjs(), 'day');
   const phoneNum = booking.userId?.phone || booking.walkInCustomerPhone || '';

   return (
      <motion.div
         initial={{ opacity: 0, scale: 0.98 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ type: "spring", stiffness: 300, damping: 25 }}
         onClick={() => phoneNum && navigate(`/vendor/customers?phone=${phoneNum}`)}
         className="bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm transition-all group relative overflow-hidden cursor-pointer hover:border-slate-300 dark:hover:border-gray-700/80"
      >
         {/* Top Header Section */}
         <div className="flex justify-between items-start relative z-10 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
               <div className="w-10 h-10 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-gray-700/50 shadow-sm relative overflow-hidden shrink-0">
                  {(booking.userId?.image || booking.customerImage) ? (
                     <img 
                        src={booking.userId?.image || booking.customerImage} 
                        className="w-full h-full object-cover" 
                        alt={booking.walkInCustomerName || booking.userId?.name || 'Customer'}
                     />
                  ) : (
                     <User size={18} className="text-slate-400 dark:text-gray-500" />
                  )}

                  {booking.isWalkIn && (
                     <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00246b] text-white rounded-full flex items-center justify-center border border-white dark:border-gray-900 shadow-sm">
                        <ShoppingBag size={7} />
                      </div>
                  )}
               </div>
               <div className="min-w-0">
                  <div className="flex items-center gap-1.5 leading-none">
                     <h3 className="font-black text-gray-900 dark:text-white text-[13px] tracking-tight truncate">{booking.walkInCustomerName || booking.userId?.name || 'Customer'}</h3>
                     {booking.membershipId && (
                        <Crown size={10} className="text-amber-500 shrink-0" />
                     )}
                     {isToday && booking.status === 'confirmed' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                     )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                     {booking.services.slice(0, 2).map((s, idx) => (
                        <span key={idx} className="text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-[0.05em] leading-none">
                           {s.name}{idx < booking.services.length - 1 && booking.services.length <= 2 ? ' • ' : ''}
                        </span>
                     ))}
                     {booking.services.length > 2 && (
                        <span className="text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase leading-none">
                           +{booking.services.length - 2} More
                        </span>
                     )}
                  </div>
               </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
               <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase border tracking-[0.15em] leading-none ${getStatusStyles(booking.status)}`}>
                  {booking.status === 'pending_completion' ? 'attention' : booking.status}
                </span>
            </div>
         </div>

         {/* Info Grid - More Compact */}
         <div className="grid grid-cols-2 gap-x-2 gap-y-2 py-2 mt-2 border-t border-slate-50 dark:border-gray-800/50 relative z-10">
            <div className="flex flex-col">
               <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                  <Calendar size={8} strokeWidth={3} /> Schedule
               </p>
                <div className="text-[9px] font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-1 whitespace-nowrap">
                   <span>{dayjs(booking.startTime).format('DD MMM')}</span>
                   <span className="text-[#00246b] dark:text-blue-400">&bull;</span>
                   <span>{dayjs(booking.startTime).format('hh:mm A')}</span>
                   <span className="text-[#00246b] dark:text-blue-400">&bull;</span>
                   <Clock size={9} strokeWidth={3} className="text-[#00246b] dark:text-blue-400 shrink-0" />
                   <span>{booking.totalDuration ? `${booking.totalDuration} MIN` : '30 MIN'}</span>
                </div>
            </div>
            <div className="flex flex-col text-right items-end">
               <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                  <User size={8} strokeWidth={3} /> Staff
               </p>
               <p className="text-[10px] font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight truncate max-w-full">
                  {booking.staffId?.isOwner ? 'Owner' : (booking.staffId?.name || 'Self')}
               </p>
            </div>
         </div>

         {/* Footer - Final Cleanup */}
         <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-gray-800/50 relative z-10">
            <div className="flex items-baseline gap-1">
               <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                <span className="text-[15px] font-black text-gray-900 dark:text-white tracking-tighter leading-none flex items-center gap-1">
                   {booking.originalTotalPrice > 0 && booking.originalTotalPrice !== booking.totalPrice ? (
                      <>
                         <span className="line-through text-[11px] font-bold text-slate-400 dark:text-gray-500 mr-0.5">₹{booking.originalTotalPrice}</span>
                         <span>₹{booking.totalPrice}</span>
                      </>
                   ) : (
                      `₹${booking.totalPrice}`
                   )}
                </span>
            </div>

            {(booking.status === 'confirmed' || booking.status === 'pending_completion') && (
               <div className="flex gap-1.5">
                  <button
                     disabled={(booking.status === 'confirmed' ? !booking.canCancel : false) || isActionLoading}
                     onClick={(e) => { e.stopPropagation(); onCancel(booking._id); }}
                     className="h-8 w-8 bg-slate-50 dark:bg-gray-800 text-rose-500 rounded-lg flex items-center justify-center active:scale-95 transition-all border border-slate-100 dark:border-gray-700/50 disabled:opacity-30"
                  >
                     <XCircle size={14} />
                  </button>
                  <button
                     disabled={isActionLoading}
                     onClick={(e) => { e.stopPropagation(); onComplete(booking._id); }}
                     className="h-8 px-3 bg-[#00246b] dark:bg-[#00246b] text-white rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                     {isActionLoading ? <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={12} />}
                     Complete
                  </button>
               </div>
            )}

            {(booking.status === 'completed' || booking.status === 'cancelled') && hasInStockProducts && (
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     const name = booking.walkInCustomerName || booking.userId?.name || 'Customer';
                     const contact = booking.walkInCustomerPhone || booking.userId?.phone || '';
                     navigate('/vendor/inventory', {
                        state: {
                           prefillCustomer: {
                              customerName: name,
                              customerContact: contact
                           }
                        }
                     });
                  }}
                  className="h-7 px-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1"
               >
                  + Product
               </button>
            )}
         </div>
      </motion.div>
   );
};

export default BookingCard;
