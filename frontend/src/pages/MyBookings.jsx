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
        {[1, 2, 3].map(i => <div key={i} className="h-10 w-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
      </div>
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-gray-950 pb-32">
      <header className="px-4 pt-4 pb-2 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-40 border-b border-slate-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1 px-2 -ml-2 text-slate-900 dark:text-blue-400 active:scale-90 transition-all"
          >
            <ChevronRight className="rotate-180" size={18} strokeWidth={3} />
          </button>
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
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
                 className={`flex-1 py-2 rounded-xl text-[9px] font-black tracking-widest border ${isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-black/10'
                    : 'bg-white dark:bg-gray-900 border-[#1C2C4E]/10 dark:border-gray-800 text-slate-400 shadow-sm'
                  } transition-all active:scale-95`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-4 mt-5">
        {filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100 dark:border-gray-700">
              <ShoppingBag size={32} />
            </div>
            <p className="text-slate-400 text-xs font-black tracking-widest">No {activeTab} bookings</p>
            <button
              className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
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
                className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)] transition-all active:scale-[0.98]"
                onClick={() => navigate(`/booking-status/${booking._id}`)}
              >
                <div className="flex justify-between items-start mb-1.5 leading-none">
                  <div>
                    <h3 className="font-extrabold text-[13px] text-gray-900 dark:text-white truncate max-w-[200px] tracking-tight">{booking.vendorId.shopName}</h3>
                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 tracking-widest mt-1">
                      <MapPin size={10} strokeWidth={3} className="text-slate-300" />
                      <span className="line-clamp-1">{booking.vendorId?.address || 'Vendor location'}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest border leading-none shadow-sm ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2.5 border-y border-dashed border-slate-100 dark:border-gray-800/50 my-2.5">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 tracking-widest leading-none">Schedule</p>
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-900 dark:text-white leading-none mt-1">
                      <Calendar size={12} strokeWidth={3} className="text-primary" />
                      {dayjs(booking.startTime).format('DD MMM, YYYY')}
                    </div>
                  </div>
                  <div className="space-y-1 text-right flex flex-col items-end">
                    <p className="text-[8px] font-black text-slate-400 tracking-widest leading-none">Time</p>
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-primary leading-none mt-1">
                      <Clock size={12} strokeWidth={3} />
                      {dayjs(booking.startTime).format('hh:mm A')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between leading-none mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                      <User size={14} className="text-slate-300" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 tracking-widest">{booking.staffId?.name || 'Auto assigned'}</span>
                  </div>
                  <div className="flex items-center gap-1 font-black text-primary active:scale-90 transition-all">
                    <span className="text-[10px] tracking-widest">Manage</span>
                    <ChevronRight size={14} strokeWidth={3} />
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
