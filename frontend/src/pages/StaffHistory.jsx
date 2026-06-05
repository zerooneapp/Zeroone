import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, Calendar, TrendingUp, IndianRupee, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import Navbar from '../layouts/Navbar';
import dayjs from 'dayjs';

const StaffHistory = () => {
  const navigate = useNavigate();
  const [historyPeriod, setHistoryPeriod] = useState('week');
  const [historyStartDate, setHistoryStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [historyEndDate, setHistoryEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [historyView, setHistoryView] = useState('bookings');
  const [history, setHistory] = useState({
    summary: { totalBookings: 0, completedBookings: 0, totalEarnings: 0 },
    bookings: [],
    earnings: []
  });
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff/history', {
        params: {
          period: historyPeriod,
          ...(historyPeriod === 'custom' ? { startDate: historyStartDate, endDate: historyEndDate } : {})
        }
      });
      setHistory(res.data || {
        summary: { totalBookings: 0, completedBookings: 0, totalEarnings: 0 },
        bookings: [],
        earnings: []
      });
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    const handleGlobalEvent = (e) => {
      const type = e.detail?.type;
      const refreshTypes = [
         'STAFF_ASSIGNED',
         'BOOKING_CANCELLED',
         'BOOKING_COMPLETED',
         'BOOKING_RESCHEDULED',
         'ASSIGNMENT_RECEIVED',
         'NEW_BOOKING'
      ];
      if (refreshTypes.includes(type)) {
         fetchHistory();
      }
    };

    window.addEventListener('new-socket-notification', handleGlobalEvent);
    return () => window.removeEventListener('new-socket-notification', handleGlobalEvent);
  }, [historyPeriod, historyStartDate, historyEndDate]);

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const formatTime = (isoString) => new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const formatMoney = (amount) => `Rs. ${Number(amount || 0).toFixed(0)}`;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      {/* 📱 MOBILE HEADER */}
      <div className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 pt-[48px] px-5 pb-3 transform-gpu">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/staff/account')}
            className="p-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-[15px] font-black text-gray-900 dark:text-white tracking-tight uppercase">History</h1>
          <div className="w-8"></div>
        </div>
      </div>

      <div className="px-3 pt-[108px] py-4 space-y-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'custom', label: 'Custom' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setHistoryPeriod(item.id)}
                className={`px-3 py-2 rounded-xl text-[9px] font-black capitalize tracking-widest border transition-all ${
                  historyPeriod === item.id
                    ? 'bg-[#00246b] text-white border-[#00246b]'
                    : 'bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-400 border-slate-100 dark:border-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {historyPeriod === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-800/50 p-2 rounded-2xl border border-slate-100 dark:border-gray-800/50 mt-2">
              <div className="flex-1 space-y-1 text-left">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest pl-1">Start Date</p>
                <div className="relative group">
                  <input
                    type="date"
                    value={historyStartDate}
                    max={dayjs().format('YYYY-MM-DD')}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="w-full h-8 bg-white dark:bg-gray-900 border-none rounded-lg px-2 text-[9px] font-black text-gray-900 dark:text-white focus:ring-1 ring-primary/20 [color-scheme:dark] cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 text-gray-300">
                <ChevronLeft className="rotate-180 opacity-20" size={14} strokeWidth={3} />
              </div>

              <div className="flex-1 space-y-1 text-left">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest pl-1">End Date</p>
                <div className="relative group">
                  <input
                    type="date"
                    value={historyEndDate}
                    max={dayjs().format('YYYY-MM-DD')}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="w-full h-8 bg-white dark:bg-gray-900 border-none rounded-lg px-2 text-[9px] font-black text-gray-900 dark:text-white focus:ring-1 ring-primary/20 [color-scheme:dark] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-slate-50/80 dark:bg-gray-800/60 rounded-2xl border border-slate-100 dark:border-gray-700/50">
              <p className="text-[8px] font-black text-slate-400 capitalize tracking-widest">Bookings</p>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {loading ? '...' : history.summary?.totalBookings || 0}
              </p>
            </div>
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/30">
              <p className="text-[8px] font-black text-emerald-500 capitalize tracking-widest">Earnings</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {loading ? '...' : formatMoney(history.summary?.totalEarnings || 0)}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-50 dark:bg-gray-800/50 p-1 rounded-2xl border border-slate-100 dark:border-gray-700/50">
            {[
              { id: 'bookings', label: 'Bookings' },
              { id: 'earnings', label: 'Earnings' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setHistoryView(item.id)}
                className={`flex-1 py-1.5 rounded-xl text-[9px] font-black capitalize tracking-widest transition-all ${
                  historyView === item.id
                    ? 'bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-gray-600'
                    : 'text-slate-400 dark:text-gray-500'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading history...</div>
            ) : historyView === 'bookings' ? (
              (history.bookings || []).length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-dashed border-slate-100 dark:border-gray-700 text-center">
                  <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest">No booking history found</p>
                </div>
              ) : (
                history.bookings.slice(0, 15).map((booking) => (
                  <div
                    key={booking._id}
                    className="p-3 rounded-2xl bg-slate-50/70 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {booking.services?.map((service) => service.name).join(', ') || 'Service Booking'}
                      </p>
                      <p className="text-[8px] font-black text-slate-400 capitalize tracking-widest">
                        {formatDate(booking.startTime)} • {formatTime(booking.startTime)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[7px] font-black capitalize tracking-widest px-2 py-1 rounded-lg border ${
                          booking.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/30'
                            : booking.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10 dark:text-rose-400 dark:border-rose-900/30'
                              : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-900/30'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400">
                        {booking.originalTotalPrice > 0 && booking.originalTotalPrice !== booking.totalPrice ? (
                          <>
                            <span className="line-through text-[9px] font-bold text-slate-400 dark:text-gray-500 mr-0.5 flex items-center"><IndianRupee size={9} strokeWidth={2} />{booking.originalTotalPrice}</span>
                            <span className="flex items-center"><IndianRupee size={12} strokeWidth={3} />{Number(booking.totalPrice || 0)}</span>
                          </>
                        ) : (
                          <>
                            <IndianRupee size={12} strokeWidth={3} />
                            <span className="text-[12px] font-black">{Number(booking.totalPrice || 0)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (history.earnings || []).length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-dashed border-slate-100 dark:border-gray-700 text-center">
                <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest">No earning history found</p>
              </div>
            ) : (
              history.earnings.slice(0, 15).map((entry) => (
                <div
                  key={entry._id}
                  className="p-3 rounded-2xl bg-slate-50/70 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {entry.description || 'Booking Revenue'}
                    </p>
                    <p className="text-[8px] font-black text-slate-400 capitalize tracking-widest">
                      {formatDate(entry.timestamp)} • {formatTime(entry.timestamp)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400">
                      <IndianRupee size={12} strokeWidth={3} />
                      <span className="text-[12px] font-black">{Number(entry.amount || 0)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
};

export default StaffHistory;
