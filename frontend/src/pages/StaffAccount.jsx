import React, { useState, useEffect } from 'react';
import {
  User, ShieldCheck, Calendar, Phone,
  LogOut, Briefcase, Award,
  CheckCircle, TrendingUp, IndianRupee
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import Navbar from '../layouts/Navbar';

const StaffAccount = () => {
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    skills: 0,
    upcoming: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [historyPeriod, setHistoryPeriod] = useState('week');
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyView, setHistoryView] = useState('bookings');
  const [history, setHistory] = useState({
    summary: { totalBookings: 0, completedBookings: 0, totalEarnings: 0 },
    bookings: [],
    earnings: []
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, bookingsRes] = await Promise.all([
        api.get('/staff/profile'),
        api.get('/bookings/my')
      ]);

      const bookingList = bookingsRes.data || [];
      setProfile(profileRes.data);
      setStats({
        skills: profileRes.data?.services?.length || 0,
        upcoming: bookingList.filter((booking) => booking.status === 'confirmed' || booking.status === 'assigned').length,
        completed: bookingList.filter((booking) => booking.status === 'completed').length
      });
    } catch (err) {
      toast.error('Failed to load professional profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/staff/history', {
        params: {
          period: historyPeriod,
          ...(historyPeriod === 'date' ? { date: historyDate } : {})
        }
      });
      setHistory(res.data || {
        summary: { totalBookings: 0, completedBookings: 0, totalEarnings: 0 },
        bookings: [],
        earnings: []
      });
    } catch (err) {
      toast.error('Failed to load history');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [historyPeriod, historyDate]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <div className="relative px-6 pt-6 pb-8 bg-white dark:bg-gray-950 border-b border-slate-100 dark:border-gray-800 rounded-b-[3.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex flex-col items-center text-center space-y-4 pt-0">
          <div className="relative">
            <div className="w-24 h-24 bg-slate-50 dark:bg-gray-900 rounded-[2.5rem] border-4 border-white dark:border-gray-950 shadow-2xl overflow-hidden">
              {profile?.image ? <img src={profile.image} className="w-full h-full object-cover" alt={profile?.name || 'Staff'} /> : <User size={40} className="text-slate-300 m-7" />}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-white dark:border-gray-950 shadow-lg text-white">
              <CheckCircle size={14} strokeWidth={3} />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{profile?.name}</h1>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Professional Partner</span>
              <div className="w-1 h-1 bg-primary rounded-full" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{profile?.vendorId?.shopName || 'Market'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6">
          <div className="p-3 bg-slate-50/80 dark:bg-gray-900/50 rounded-2xl text-center border border-white dark:border-gray-800/50">
            <Award size={16} strokeWidth={2.5} className="text-primary mx-auto mb-1 opacity-80" />
            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{stats.skills} Skills</p>
          </div>
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl text-center border border-emerald-100/50 dark:border-emerald-900/30">
            <CheckCircle size={16} strokeWidth={2.5} className="text-emerald-500 mx-auto mb-1" />
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Verified</p>
          </div>
          <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl text-center border border-blue-100/50 dark:border-blue-900/30">
            <TrendingUp size={16} strokeWidth={2.5} className="text-blue-500 mx-auto mb-1" />
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">{stats.completed}+ Done</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Work Identity</h2>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-gray-800 ml-4 opacity-50" />
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-[2.2rem] border border-slate-100 dark:border-gray-800 space-y-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-blue-500/10 transition-all duration-500" />

            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                <Calendar size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Onboarding Date</p>
                <p className="text-xs font-black text-slate-900 dark:text-white mt-1 uppercase tracking-tight">{formatDate(profile?.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 bg-primary/5 dark:bg-primary/20 text-primary rounded-xl flex items-center justify-center shadow-sm">
                <ShieldCheck size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Service Authorization</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {profile?.services?.map((service) => (
                    <span key={service._id} className="text-[7.5px] font-black bg-slate-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg text-slate-500 dark:text-gray-400 border border-slate-100 dark:border-gray-700/50 uppercase tracking-widest leading-none">
                      {service.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employment & Support</h2>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-gray-800 ml-4 opacity-50" />
          </div>

          <div className="bg-white dark:bg-gray-900 px-5 py-4 rounded-[2rem] border border-slate-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 dark:bg-gray-800 text-primary rounded-xl flex items-center justify-center border border-slate-100 dark:border-gray-700/50">
                  <Briefcase size={20} strokeWidth={2.5} className="opacity-80" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Primary Branch</p>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{profile?.vendorId?.shopName || 'Partner Hub'}</h3>
                </div>
              </div>
              {profile?.vendorId?.ownerId?.phone && (
                <a href={`tel:${profile.vendorId.ownerId.phone}`} className="w-9 h-9 bg-slate-900 dark:bg-primary text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all outline-none">
                  <Phone size={16} strokeWidth={3} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">History</h2>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-gray-800 ml-4 opacity-50" />
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-[2.2rem] border border-slate-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'week', label: 'Week' },
                { id: 'month', label: 'Month' },
                { id: 'date', label: 'Date' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setHistoryPeriod(item.id)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                    historyPeriod === item.id
                      ? 'bg-slate-900 dark:bg-primary text-white border-slate-900 dark:border-primary'
                      : 'bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-400 border-slate-100 dark:border-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {historyPeriod === 'date' && (
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="px-3 py-2 rounded-xl text-[10px] font-black bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-100 dark:border-gray-700 focus:ring-0"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-50/80 dark:bg-gray-800/60 rounded-2xl border border-slate-100 dark:border-gray-700/50">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bookings</p>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{history.summary?.totalBookings || 0}</p>
              </div>
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/30">
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Earnings</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatMoney(history.summary?.totalEarnings || 0)}</p>
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
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    historyView === item.id
                      ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-400 dark:text-gray-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {historyView === 'bookings' ? (
                (history.bookings || []).length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-dashed border-slate-100 dark:border-gray-700 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No booking history found</p>
                  </div>
                ) : (
                  history.bookings.slice(0, 8).map((booking) => (
                    <div
                      key={booking._id}
                      className="p-3 rounded-2xl bg-slate-50/70 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight truncate">
                          {booking.services?.map((service) => service.name).join(', ') || 'Service Booking'}
                        </p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          {formatDate(booking.startTime)} • {formatTime(booking.startTime)}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${
                            booking.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/30'
                              : booking.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10 dark:text-rose-400 dark:border-rose-900/30'
                                : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-900/30'
                          }`}>
                            {booking.status}
                          </span>
                          <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">
                            {booking.serviceType === 'home' ? 'Home Service' : 'Shop Service'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400">
                          <IndianRupee size={12} strokeWidth={3} />
                          <span className="text-[12px] font-black">{Number(booking.totalPrice || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (history.earnings || []).length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-dashed border-slate-100 dark:border-gray-700 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No earning history found</p>
                </div>
              ) : (
                history.earnings.slice(0, 8).map((entry) => (
                  <div
                    key={entry._id}
                    className="p-3 rounded-2xl bg-slate-50/70 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {entry.description || 'Booking Revenue'}
                      </p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
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

        <button
          onClick={logout}
          className="w-full h-11 bg-slate-50 dark:bg-gray-800 text-rose-500 rounded-[2.2rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] border border-slate-200/50 dark:border-gray-700 active:scale-95 transition-all shadow-sm group"
        >
          <LogOut size={16} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
          Sign Out
        </button>
      </div>

      <Navbar />
    </div>
  );
};

export default StaffAccount;
