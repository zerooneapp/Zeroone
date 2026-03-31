import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Clock, MapPin, ChevronRight, AlertCircle, ShoppingBag, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import SectionTitle from '../components/SectionTitle';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';
import dayjs from 'dayjs';

const MyBookings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, completed, cancelled
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings/my');
      setBookings(res.data);
    } catch (err) {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'upcoming') return b.status === 'confirmed';
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500/10 text-blue-500 border-blue-200 dark:border-blue-900/30';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-200 dark:border-green-900/30';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-200 dark:border-red-900/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-200 dark:border-gray-900/30';
    }
  };

  if (loading) return (
    <div className="p-5 space-y-6">
       <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
       <div className="flex gap-2">
         {[1,2,3].map(i => <div key={i} className="h-10 w-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
       </div>
       {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32 animate-in fade-in duration-500 bg-white dark:bg-gray-950">
      <header className="px-4 pt-6 pb-2 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl z-40 border-b border-gray-50 dark:border-gray-900/50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-[#1C2C4E] dark:text-blue-400 active:scale-90 transition-all"
          >
            <ChevronRight className="rotate-180" size={24} strokeWidth={3} />
          </button>
          <h1 className="text-[20px] font-black text-[#1C2C4E] dark:text-white tracking-tighter uppercase leading-none">
            My Bookings
          </h1>
        </div>
        
        {/* Tab Filter HUD (Home Category Style) */}
        <div className="flex gap-1.5 mt-5 pb-2">
          {['upcoming', 'completed', 'cancelled'].map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                  isActive 
                  ? 'bg-[#1C2C4E] border-[#1C2C4E] text-white shadow-xl shadow-[#1C2C4E]/20 scale-105' 
                  : 'bg-white dark:bg-gray-900 border-gray-200/50 dark:border-gray-800 text-gray-400'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-5 mt-4">
        <AnimatePresence mode="wait">
          {filteredBookings.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
               <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center text-gray-300 mb-4">
                  <ShoppingBag size={40} />
               </div>
               <p className="text-gray-500 font-bold">No {activeTab} bookings found</p>
               <Button className="mt-6" onClick={() => navigate('/')}>Book a Service</Button>
            </motion.div>
          ) : (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {filteredBookings.map((booking) => (
                <motion.div 
                  key={booking._id} 
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-gray-900 p-5 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group"
                  onClick={() => navigate(`/booking-status/${booking._id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                       <h3 className="font-black text-lg text-gray-900 dark:text-white truncate max-w-[200px]">{booking.vendorId.shopName}</h3>
                       <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <MapPin size={10} />
                          {booking.vendorId?.address?.slice(0, 30) || 'Address not provided'}...
                       </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(booking.status)}`}>
                       {booking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-dashed border-gray-100 dark:border-gray-800 mb-4">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Schedule</p>
                        <div className="flex items-center gap-2 text-xs font-bold dark:text-gray-300">
                           <Calendar size={14} className="text-primary" />
                           {dayjs(booking.startTime).format('DD MMM, YYYY')}
                        </div>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Time</p>
                        <div className="flex items-center gap-2 text-xs font-bold dark:text-gray-300">
                           <Clock size={14} className="text-primary" />
                           {dayjs(booking.startTime).format('hh:mm A')}
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                           <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 overflow-hidden flex items-center justify-center">
                              <User size={14} className="text-gray-400" />
                           </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-500">{booking.staffId?.name || 'Auto Assigned'}</span>
                     </div>
                     <div className="flex items-center gap-1 font-black text-primary group-hover:gap-2 transition-all">
                        <span className="text-sm">Manage</span>
                        <ChevronRight size={18} />
                     </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default MyBookings;
