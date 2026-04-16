import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, Clock, MapPin, ChevronRight, AlertCircle, ShoppingBag, User } from 'lucide-react';
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

  const fetchBookings = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get('/bookings/my');
      setBookings(res.data);
    } catch (err) {
      setError('Failed to load bookings');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(true);

    // 🚀 LIVE SYNC: Listen for real-time status updates from vendor
    const handleListUpdateEvent = (e) => {
      const notification = e.detail;
      // Refresh list if status changes or a new booking related event occurs
      if (['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED', 'ASSIGNMENT_RECEIVED'].includes(notification?.type)) {
        fetchBookings(false);
      }
    };

    window.addEventListener('new-socket-notification', handleListUpdateEvent);
    return () => window.removeEventListener('new-socket-notification', handleListUpdateEvent);
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
        {[1, 2, 3].map(i => <div key={i} className="h-10 w-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
      </div>
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-gray-950 overflow-hidden">
      <header className="px-4 pt-4 pb-2 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-40 border-b border-slate-100 dark:border-gray-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1 px-2 -ml-2 text-[#1C2C4E] dark:text-blue-400 active:scale-90 transition-all"
          >
            <ChevronRight className="rotate-180" size={18} strokeWidth={3} />
          </button>
          <h1 className="text-xl font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none">
            My bookings
          </h1>
        </div>

        {/* Tab Filter HUD (Home Category Style) */}
        <div className="flex gap-1.5 mt-4 pb-1">
          {['upcoming', 'completed', 'cancelled'].map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                 className={`flex-1 py-2.5 rounded-xl text-[13px] font-black capitalize tracking-tight border ${isActive
                    ? 'bg-[#1C2C4E] border-[#1C2C4E] text-white shadow-lg shadow-[#1C2C4E]/10'
                    : 'bg-white dark:bg-gray-900 border-[#1C2C4E]/10 dark:border-gray-800 text-slate-400 shadow-sm hover:text-[#1C2C4E]'
                  } transition-all active:scale-95`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth px-4 pt-5 pb-24">
        {filteredBookings.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center -mt-10 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100 dark:border-gray-700">
              <ShoppingBag size={32} />
            </div>
            <p className="text-slate-400 text-xs font-black tracking-widest lowercase">No {activeTab} bookings</p>
            <button
              className="mt-6 px-8 py-3 bg-[#1C2C4E] text-white rounded-xl text-[12px] font-black tracking-widest shadow-lg shadow-[#1C2C4E]/20 active:scale-95 transition-all"
              onClick={() => navigate('/')}
            >
              Book a Service
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredBookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-white/40 dark:bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/50 dark:border-white/10 shadow-xl transition-all active:scale-[0.98]"
                onClick={() => navigate(`/booking-status/${booking._id}`)}
              >
                <div className="flex justify-between items-start mb-2 leading-none">
                  <div>
                    <h3 className="font-black text-[15px] text-gray-900 dark:text-white truncate max-w-[200px] tracking-tight">{booking.vendorId.shopName}</h3>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-gray-400 tracking-tight mt-1.5">
                      <MapPin size={11} strokeWidth={3} className="text-slate-300 dark:text-gray-500" />
                      <span className="line-clamp-1">{booking.vendorId?.address || 'Vendor location'}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[11px] font-black capitalize tracking-tight border leading-none shadow-sm ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3.5 border-y border-dashed border-slate-100 dark:border-gray-800/50 my-3.5">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 dark:text-gray-400 tracking-widest leading-none uppercase">Schedule</p>
                    <div className="flex items-center gap-1.5 text-[13px] font-black text-gray-900 dark:text-white leading-none mt-1">
                      <Calendar size={13} strokeWidth={3} className="text-[#1C2C4E] dark:text-gray-400" />
                      {dayjs(booking.startTime).format('DD MMM, YYYY')}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right flex flex-col items-end">
                    <p className="text-[9px] font-black text-slate-400 dark:text-white/40 tracking-widest leading-none uppercase">Time</p>
                    <div className="flex items-center gap-1.5 text-[13px] font-black text-[#1C2C4E] dark:text-white leading-none mt-1">
                      <Clock size={13} strokeWidth={3} className="dark:text-gray-400" />
                      {dayjs(booking.startTime).format('hh:mm A')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between leading-none mt-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                      <User size={16} className="text-slate-300 dark:text-gray-500" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-white/60 tracking-widest uppercase">{booking.staffId?.name || 'Auto assigned'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-black text-[#1C2C4E] dark:text-white active:scale-90 transition-all">
                    <span className="text-[12px] tracking-tight">Manage</span>
                    <ChevronRight size={16} strokeWidth={3} className="dark:text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyBookings;
