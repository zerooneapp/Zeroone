import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Calendar, Clock, ShoppingBag, ArrowRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/Button';

const BookingSuccess = () => {
   const location = useLocation();
   const navigate = useNavigate();
   const { booking, vendor, items, selectedDate, selectedSlot } = location.state || {};

   if (!booking) {
      React.useEffect(() => {
         navigate('/bookings');
      }, [navigate]);
      return null;
   }

   return (
      <div className="min-h-screen bg-background-light dark:bg-gray-950 flex flex-col items-center px-4 py-8 animate-in fade-in duration-700">
         {/* Animated Success Icon */}
         <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-16 h-16 bg-green-500 rounded-full shadow-2xl shadow-green-500/30 flex items-center justify-center text-white mb-4 border-4 border-white dark:border-gray-900"
         >
            <CheckCircle2 size={32} strokeWidth={3} />
         </motion.div>

         <div className="text-center space-y-1 mb-6">
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Booking confirmed!</h1>
            <p className="text-[9px] text-slate-400 font-black tracking-widest leading-none mt-1">Your appointment is scheduled successfully.</p>
         </div>

         {/* Booking Ticket Card */}
         <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] overflow-hidden mb-6"
         >
            <div className="p-2.5 px-4 bg-[#1C2C4E] dark:bg-gray-800 text-white flex items-center justify-between">
               <div>
                  <h2 className="text-sm font-black truncate tracking-tight leading-none">{vendor.shopName}</h2>
                  <p className="text-[7px] opacity-60 font-black tracking-widest mt-0.5">ID: #{booking._id.slice(-6).toUpperCase()}</p>
               </div>
               <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                  <ShoppingBag size={14} className="text-white/60" />
               </div>
            </div>

            <div className="p-3.5 px-4 space-y-3">
               <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-50 dark:border-gray-800">
                  <div className="space-y-0.5">
                     <p className="text-[8px] font-black text-slate-400 tracking-widest leading-none">Date</p>
                     <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-900 dark:text-white leading-none mt-1">
                        <Calendar size={11} className="text-primary" />
                        {selectedDate}
                     </div>
                  </div>
                  <div className="space-y-0.5 text-right">
                     <p className="text-[8px] font-black text-slate-400 tracking-widest leading-none">Time</p>
                     <div className="flex items-center gap-1.5 text-[11px] font-black text-primary leading-none mt-1 justify-end">
                        <Clock size={11} className="text-primary" />
                        {selectedSlot}
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <p className="text-[8px] font-black text-slate-400 tracking-widest leading-none">Services</p>
                  <div className="flex flex-wrap gap-1">
                     {items.map(item => (
                        <span key={item._id} className="px-2 py-0.5 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-gray-300 rounded-md text-[9px] font-black border border-slate-100 dark:border-gray-700 tracking-tight">
                           {item.name}
                        </span>
                     ))}
                  </div>
               </div>

               <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-100 dark:border-gray-800">
                  <span className="text-[9px] font-black text-slate-400 tracking-widest">Total paid</span>
                  <span className="text-base font-black text-primary dark:text-white tracking-tighter">₹{booking.totalPrice}</span>
               </div>
            </div>
         </motion.div>

         {/* Action Buttons */}
         <div className="w-full max-w-sm space-y-2">
            <button
               onClick={() => navigate('/bookings')}
               className="w-full h-10 bg-slate-900 dark:bg-primary text-white rounded-xl shadow-lg shadow-black/10 flex items-center justify-center gap-2 font-black text-[10px] tracking-widest border border-white/10 active:scale-95 transition-all"
            >
               <ShoppingBag size={14} />
               View my bookings
            </button>
            <button
               onClick={() => navigate('/')}
               className="w-full h-10 bg-slate-50 dark:bg-gray-800/80 text-slate-500 rounded-xl flex items-center justify-center gap-2 font-black text-[9px] tracking-widest border border-slate-100 dark:border-gray-700 active:scale-95 transition-all shadow-sm"
            >
               <Home size={14} />
               Back to home
            </button>
         </div>
      </div>
   );
};

export default BookingSuccess;
