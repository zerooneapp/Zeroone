import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, Calendar as CalendarIcon, ChevronRight, AlertTriangle, Clock3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import BookingCard from '../components/BookingCard';
import StatusTabs from '../components/StatusTabs';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import EmergencyClosureModal from '../components/EmergencyClosureModal';

const VendorBookings = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('confirmed');
  const [fromDate, setFromDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [closures, setClosures] = useState([]);
  const [closuresLoading, setClosuresLoading] = useState(true);
  const [closureActionId, setClosureActionId] = useState(null);
  const [endingClosureId, setEndingClosureId] = useState(null);
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);

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

  const fetchClosures = async () => {
    try {
      setClosuresLoading(true);
      const res = await api.get('/vendor/closures');
      setClosures(res.data || []);
    } catch (err) {
      toast.error('Failed to load emergency closures');
    } finally {
      setClosuresLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [status, fromDate, toDate]);

  useEffect(() => {
    fetchClosures();
  }, []);

  const handleAction = async (id, action) => {
    if (actionLoadingId === id) return;
    let reason = '';

    if (action === 'cancel') {
      const input = window.prompt('Please enter the cancellation reason for the customer:');
      if (input === null) {
        return;
      }

      reason = input.trim();
      if (!reason) {
        toast.error('Cancellation reason is required');
        return;
      }
    }

    const originalBookings = [...bookings];
    setBookings(prev => prev.map(b =>
      b._id === id
        ? { ...b, status: action === 'complete' ? 'completed' : 'cancelled' }
        : b
    ));

    try {
      setActionLoadingId(id);
      await api.patch(`/bookings/${id}/status`, { action, reason });
      toast.success(`Booking ${action === 'complete' ? 'completed' : 'cancelled'}`);
    } catch (err) {
      setBookings(originalBookings);
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchBookings(), fetchClosures()]);
  };

  const handleEmergencyCancel = async (bookingId, reason, closureId) => {
    try {
      setClosureActionId(bookingId);
      await api.patch(`/vendor/bookings/${bookingId}/emergency-cancel`, { reason, closureId });
      toast.success('Booking cancelled for closure');
      await refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Emergency cancel failed');
    } finally {
      setClosureActionId(null);
    }
  };

  const handleEndClosure = async (closureId) => {
    try {
      setEndingClosureId(closureId);
      await api.patch(`/vendor/closures/${closureId}/end`);
      toast.success('Emergency closure ended');
      await refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end closure');
    } finally {
      setEndingClosureId(null);
    }
  };

  const handleEmergencyReschedule = (booking, vendor) => {
    navigate('/cart', {
      state: {
        rescheduleBookingId: booking._id,
        vendor,
        rescheduleItems: booking.services.map(service => ({
          _id: service.serviceId,
          name: service.name,
          price: service.price,
          duration: service.duration
        })),
        rescheduleTotalDuration: booking.totalDuration
      }
    });
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
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-80">Bookings Roster</p>
            </div>
          </div>
          <button
            onClick={refreshAll}
            className={`p-2.5 bg-slate-50 dark:bg-gray-800/80 rounded-xl text-slate-400 border border-slate-100 dark:border-gray-800 active:rotate-180 transition-all duration-500 shadow-sm ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={16} />
          </button>
        </div>

        <button
          onClick={() => setIsClosureModalOpen(true)}
          className="w-full mb-3 h-11 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.22em] shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
        >
          Emergency Close Window
        </button>

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
        {!closuresLoading && closures.length > 0 && (
          <section className="space-y-3">
            {closures.map(({ closure, impactedBookings, vendor }) => (
              <div
                key={closure._id}
                className="p-4 rounded-[1.8rem] bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200/70 dark:border-amber-900/30 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-600 dark:text-amber-400">Active Closure</p>
                      <h2 className="text-[14px] font-black text-slate-900 dark:text-white mt-1">
                        {dayjs(closure.startTime).format('DD MMM, hh:mm A')} to {dayjs(closure.endTime).format('DD MMM, hh:mm A')}
                      </h2>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 mt-1">
                        {closure.reason || 'Temporary emergency closure'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Impacted</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">{impactedBookings.length}</p>
                    <button
                      onClick={() => handleEndClosure(closure._id)}
                      disabled={endingClosureId === closure._id}
                      className="mt-3 h-9 px-3 bg-white dark:bg-gray-950 text-slate-900 dark:text-white rounded-xl border border-amber-200 dark:border-gray-800 text-[8px] font-black uppercase tracking-[0.16em] active:scale-95 transition-all disabled:opacity-40"
                    >
                      {endingClosureId === closure._id ? 'Ending...' : 'End Closure'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {impactedBookings.length === 0 ? (
                    <div className="p-3 rounded-xl bg-white/70 dark:bg-gray-950/40 border border-dashed border-amber-200 dark:border-amber-900/30">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-gray-400 text-center">
                        All affected bookings are already resolved
                      </p>
                    </div>
                  ) : (
                    impactedBookings.map((booking) => (
                      <div
                        key={booking._id}
                        className="p-3 rounded-xl bg-white dark:bg-gray-950 border border-amber-100 dark:border-gray-800 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[12px] font-black text-slate-900 dark:text-white">
                              {booking.userId?.name || booking.walkInCustomerName || 'Customer'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mt-1">
                              <Clock3 size={10} />
                              <span>{dayjs(booking.startTime).format('DD MMM, hh:mm A')}</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 mt-2">
                              {booking.services.map(service => service.name).join(' • ')}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleEmergencyReschedule(booking, vendor)}
                              disabled={closureActionId === booking._id}
                              className="h-10 px-3 bg-slate-900 dark:bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-[0.16em] active:scale-95 transition-all disabled:opacity-40"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleEmergencyCancel(booking._id, closure.reason, closure._id)}
                              disabled={closureActionId === booking._id}
                              className="h-10 px-3 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900/30 text-[9px] font-black uppercase tracking-[0.16em] active:scale-95 transition-all disabled:opacity-40"
                            >
                              {closureActionId === booking._id ? 'Working...' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

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

      <EmergencyClosureModal
        isOpen={isClosureModalOpen}
        onClose={() => setIsClosureModalOpen(false)}
        onCreated={refreshAll}
      />
    </div>
  );
};

export default VendorBookings;
