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
    <div className="min-h-screen bg-background-light dark:bg-gray-950 pb-32">
      <header className="px-4 pt-5 pb-3 sticky top-0 bg-background-light/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/vendor/dashboard')}
              className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 flex items-center justify-center active:scale-90 transition-all font-bold"
            >
              <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Management</h1>
              <p className="text-[9px] font-black text-primary dark:text-white/60 uppercase tracking-[0.2em] mt-1 opacity-80">Bookings Roster</p>
            </div>
          </div>
          <button
            onClick={fetchBookings}
            className={`p-2.5 bg-slate-50 dark:bg-gray-800/80 rounded-xl text-slate-400 border border-slate-100 dark:border-gray-800 active:rotate-180 transition-all duration-500 shadow-sm ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={16} />
          </button>
        </div>

        <StatusTabs activeTab={status} onTabChange={setStatus} />

        {/* 📅 PREMIUM COMPACT DATE FILTER */}
        <div className="mt-3 flex items-center gap-1.5 bg-slate-50/50 dark:bg-gray-800/20 p-1 rounded-2xl border border-slate-100 dark:border-gray-800">
          <div className="flex-1 flex flex-col px-3 py-1.5 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700/50">
            <label className="text-[7px] font-black uppercase text-gray-400 tracking-[0.2em] mb-0.5">Start Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent border-none p-0 text-[10px] font-black uppercase text-gray-900 dark:text-white focus:ring-0 w-full"
            />
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center border border-slate-200/20">
            <ChevronRight size={10} className="text-slate-400" />
          </div>
          <div className="flex-1 flex flex-col px-3 py-1.5 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700/50">
            <label className="text-[7px] font-black uppercase text-gray-400 tracking-[0.2em] mb-0.5">End Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent border-none p-0 text-[10px] font-black uppercase text-gray-900 dark:text-white focus:ring-0 w-full"
            />
          </div>
        </div>
      </header>

      <main className="px-4 mt-4 max-w-2xl mx-auto space-y-3">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-50/40 dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800/60 p-4 animate-pulse" />
              ))}
            </motion.div>
          ) : filteredBookings.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center space-y-4"
            >
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] animate-pulse" />
                <div className="relative w-full h-full bg-white dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-xl dark:shadow-none flex items-center justify-center text-slate-300 dark:text-gray-700">
                  <CalendarIcon size={28} strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">No Appointments</h2>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest max-w-[180px] mx-auto leading-tight opacity-70">
                  Your schedule for this range is completely clear.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2.5"
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

              <div className="pt-8 text-center pb-12">
                <p className="text-[8px] font-black uppercase text-gray-300 dark:text-gray-700 tracking-[0.3em]">End of Roster</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default VendorBookings;
