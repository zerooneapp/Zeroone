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
        className="w-24 h-24 bg-green-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-green-500/40 mb-8"
      >
        <CheckCircle2 size={48} strokeWidth={3} />
      </motion.div>

      <div className="text-center space-y-2 mb-10">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Booking Confirmed!</h1>
        <p className="text-gray-500 font-medium">Your appointment is scheduled successfully.</p>
      </div>

      {/* Booking Ticket Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden mb-10"
      >
        <div className="p-6 bg-primary text-white space-y-1">
           <h2 className="text-xl font-bold truncate">{vendor.shopName}</h2>
           <p className="text-xs opacity-60 font-medium tracking-wide">Booking ID: #{booking._id.slice(-6).toUpperCase()}</p>
        </div>
        
        <div className="p-6 space-y-6">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-gray-400">Date</p>
                 <div className="flex items-center gap-2 text-sm font-bold dark:text-gray-200">
                    <Calendar size={14} className="text-primary" />
                    {selectedDate}
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-gray-400">Time</p>
                 <div className="flex items-center gap-2 text-sm font-bold dark:text-gray-200">
                    <Clock size={14} className="text-primary" />
                    {selectedSlot}
                 </div>
              </div>
           </div>

           <div className="space-y-2 pt-4 border-t border-gray-50 dark:border-gray-800">
              <p className="text-[10px] font-black uppercase text-gray-400">Services</p>
              <div className="flex flex-wrap gap-2">
                 {items.map(item => (
                   <span key={item._id} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold dark:text-gray-300">
                     {item.name}
                   </span>
                 ))}
              </div>
           </div>

           <div className="flex justify-between items-center pt-4 border-t border-dashed border-gray-200 dark:border-gray-800">
              <span className="font-bold text-gray-500">Total Paid</span>
              <span className="text-xl font-black text-primary dark:text-white">₹{booking.totalPrice}</span>
           </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-3">
         <Button 
            className="w-full h-14 rounded-2xl gap-2 font-black"
            onClick={() => navigate('/bookings')}
         >
            <ShoppingBag size={20} />
            View My Bookings
         </Button>
         <button 
            onClick={() => navigate('/')}
            className="w-full h-14 flex items-center justify-center gap-2 font-bold text-gray-500 hover:text-primary transition-colors"
         >
            <Home size={20} />
            Back to Home
         </button>
      </div>
    </div>
  );
};

export default BookingSuccess;
