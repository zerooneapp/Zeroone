import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, RefreshCcw, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import BookingCard from '../components/BookingCard';
import StatusTabs from '../components/StatusTabs';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const VendorBookings = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('confirmed');
  const [fromDate, setFromDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchBookings = async () => {
    if (dayjs(fromDate).isAfter(toDate)) {
      toast.error("Invalid date range");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/vendor/bookings', {
        params: { status, from: fromDate, to: toDate }
      });
      setBookings(res.data);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [status, fromDate, toDate]);

  const handleAction = async (id, action) => {
    if (actionLoadingId === id) return;
    const originalBookings = [...bookings];
    setBookings(prev => prev.map(b => 
      b._id === id 
        ? { ...b, status: action === 'complete' ? 'completed' : 'cancelled' } 
        : b
    ));
    
    try {
      setActionLoadingId(id);
      await api.patch(`/bookings/${id}/status`, { action });
      toast.success(`Booking ${action === 'complete' ? 'completed' : 'cancelled'}`);
    } catch (err) {
      setBookings(originalBookings);
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredBookings = bookings.filter(b => b.status === status);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-32">
      <header className="px-6 pt-8 pb-6 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800/50 shadow-sm">
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/vendor/dashboard')}
                className="w-11 h-11 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700/50 flex items-center justify-center active:scale-90 transition-all"
              >
                 <ArrowLeft size={18} className="text-slate-600 dark:text-gray-300" />
              </button>
              <div>
                 <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Management</h1>
                 <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Bookings Roster</p>
              </div>
           </div>
           <button 
             onClick={fetchBookings} 
             className={`p-3 bg-slate-50 dark:bg-gray-800/50 rounded-2xl text-slate-400 hover:text-primary transition-all active:rotate-180 duration-500 ${loading ? 'animate-spin' : ''}`}
           >
              <RefreshCcw size={18} />
           </button>
        </div>

        <StatusTabs activeTab={status} onTabChange={setStatus} />
        
        {/* 📅 PREMIUM COMPACT DATE FILTER */}
        <div className="mt-4 flex items-center gap-2 bg-slate-100/50 dark:bg-gray-800/30 p-1.5 rounded-[2.5rem] border border-slate-200 dark:border-gray-800">
           <div className="flex-1 flex flex-col px-4 py-2 bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm relative border border-slate-100 dark:border-gray-800/50">
              <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Start Date</span>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent border-none p-0 text-[10px] font-black uppercase dark:text-white focus:ring-0 w-full"
              />
           </div>
           <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center">
              <ChevronRight size={10} className="text-slate-400" />
           </div>
           <div className="flex-1 flex flex-col px-4 py-2 bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm relative border border-slate-100 dark:border-gray-800/50">
              <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-0.5">End Date</span>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent border-none p-0 text-[10px] font-black uppercase dark:text-white focus:ring-0 w-full"
              />
           </div>
        </div>
      </header>

      <main className="px-6 mt-6 max-w-2xl mx-auto space-y-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
               key="loading"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="space-y-4"
            >
               {[1,2,3].map(i => (
                 <div key={i} className="h-44 bg-white dark:bg-gray-900/50 rounded-[3rem] border border-slate-100 dark:border-gray-800 p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center animate-pulse">
                       <div className="flex gap-3 items-center">
                          <div className="w-12 h-12 bg-slate-100 dark:bg-gray-800 rounded-2xl" />
                          <div className="space-y-2">
                             <div className="w-24 h-3 bg-slate-100 dark:bg-gray-800 rounded" />
                             <div className="w-16 h-2 bg-slate-100 dark:bg-gray-800 rounded" />
                          </div>
                       </div>
                       <div className="w-20 h-6 bg-slate-100 dark:bg-gray-800 rounded-full" />
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-gray-800/30 rounded-3xl animate-pulse" />
                 </div>
               ))}
            </motion.div>
          ) : filteredBookings.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="py-24 text-center space-y-6"
            >
               <div className="relative w-28 h-28 mx-auto">
                  <div className="absolute inset-0 bg-primary/5 rounded-[3.5rem] animate-pulse" />
                  <div className="relative w-full h-full bg-white dark:bg-gray-900 rounded-[3.5rem] border border-slate-100 dark:border-gray-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-center text-slate-300 dark:text-gray-700">
                     <CalendarIcon size={40} strokeWidth={1.5} />
                  </div>
               </div>
               <div className="space-y-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">No Appointments</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">
                     Your schedule for this range is completely clear. Time to relax! 😌
                  </p>
               </div>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {filteredBookings.map((booking) => (
                <BookingCard 
                  key={booking._id}
                  booking={booking}
                  loadingId={actionLoadingId}
                  onComplete={(id) => handleAction(id, 'complete')}
                  onCancel={(id) => handleAction(id, 'cancel')}
                />
              ))}
              
              {/* Load More Shadow Effect */}
              <div className="pt-8 text-center">
                 <p className="text-[8px] font-black uppercase text-slate-300 dark:text-gray-700 tracking-[0.3em]">End of Roster</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default VendorBookings;
