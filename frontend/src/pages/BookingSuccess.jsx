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
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center px-6 py-12 animate-in fade-in duration-700">
         {/* Animated Success Icon */}
         <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-18 h-18 bg-green-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-green-500/40 mb-2"
         >
            <CheckCircle2 size={48} strokeWidth={3} />
         </motion.div>

         <div className="text-center space-y-1.5 mb-8">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Booking Confirmed!</h1>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">Your appointment is scheduled successfully.</p>
         </div>

         {/* Booking Ticket Card */}
         <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden mb-8"
         >
            <div className="p-3 px-6 bg-primary text-white space-y-0.5">
               <h2 className="text-base font-bold truncate uppercase tracking-tight">{vendor.shopName}</h2>
               <p className="text-[8px] opacity-60 font-black uppercase tracking-wider">Booking ID: #{booking._id.slice(-6).toUpperCase()}</p>
            </div>

            <div className="p-4 px-6 space-y-3.5">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                     <p className="text-[9px] font-black uppercase text-gray-400">Date</p>
                     <div className="flex items-center gap-1.5 text-[13px] font-bold dark:text-gray-200">
                        <Calendar size={13} className="text-primary" />
                        {selectedDate}
                     </div>
                  </div>
                  <div className="space-y-0.5">
                     <p className="text-[9px] font-black uppercase text-gray-400">Time</p>
                     <div className="flex items-center gap-1.5 text-[13px] font-bold dark:text-gray-200">
                        <Clock size={13} className="text-primary" />
                        {selectedSlot}
                     </div>
                  </div>
               </div>

               <div className="space-y-1.5 pt-3 border-t border-gray-50 dark:border-gray-800">
                  <p className="text-[9px] font-black uppercase text-gray-400">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                     {items.map(item => (
                        <span key={item._id} className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-bold dark:text-gray-300">
                           {item.name}
                        </span>
                     ))}
                  </div>
               </div>

               <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-200 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-500">Total Paid</span>
                  <span className="text-lg font-black text-primary dark:text-white">₹{booking.totalPrice}</span>
               </div>
            </div>
         </motion.div>

         {/* Action Buttons */}
         <div className="w-full max-w-sm space-y-2.5">
            <Button
               className="w-full h-12 rounded-2xl gap-2 font-black uppercase text-[11px] tracking-widest"
               onClick={() => navigate('/bookings')}
            >
               <ShoppingBag size={18} />
               View My Bookings
            </Button>
            <button
               onClick={() => navigate('/')}
               className="w-full h-12 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest text-gray-500 hover:text-primary transition-colors"
            >
               <Home size={18} />
               Back to Home
            </button>
         </div>
      </div>
   );
};

export default BookingSuccess;
