import React, { useState, useEffect } from 'react';
import {
  User, ShieldCheck, Calendar, Phone,
  LogOut, Briefcase, Award,
  CheckCircle, TrendingUp, IndianRupee, ArrowRight,
  ChevronLeft, Star, Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import Navbar from '../layouts/Navbar';

import dayjs from 'dayjs';

const StaffAccount = () => {
   const { logout, staffProfile, myBookings, fetchMyBookings, fetchStaffProfile } = useAuthStore();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profile, setProfile] = useState(staffProfile);
  const [stats, setStats] = useState({
    skills: staffProfile?.services?.length || 0,
    upcoming: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(!staffProfile);

  useEffect(() => {
    if (staffProfile) {
      setProfile(staffProfile);
    }
  }, [staffProfile]);

  useEffect(() => {
    const bookingList = myBookings || [];
    setStats({
      skills: staffProfile?.services?.length || 0,
      upcoming: bookingList.filter((booking) => booking.status === 'confirmed' || booking.status === 'assigned').length,
      completed: bookingList.filter((booking) => booking.status === 'completed').length
    });
  }, [staffProfile, myBookings]);

  const fetchProfile = async () => {
    try {
      if (!profile) setLoading(true);
      await Promise.all([
        fetchStaffProfile(),
        fetchMyBookings()
      ]);
    } catch (err) {
      toast.error('Failed to load professional profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleGlobalEvent = (e) => {
      const type = e.detail?.type;
      const refreshTypes = [
         'STAFF_ASSIGNED',
         'BOOKING_CANCELLED',
         'BOOKING_COMPLETED',
         'BOOKING_RESCHEDULED',
         'ASSIGNMENT_RECEIVED',
         'NEW_BOOKING',
         'NEW_REVIEW',
         'REVIEW_APPROVED'
      ];
      if (refreshTypes.includes(type)) {
         fetchProfile();
      }
    };

    window.addEventListener('new-socket-notification', handleGlobalEvent);
    return () => window.removeEventListener('new-socket-notification', handleGlobalEvent);
  }, []);

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
      <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-[46px] pb-3 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800 shadow-sm flex items-center justify-between shrink-0">
        <h1 className="text-xl font-black text-[#00246b] dark:text-white tracking-tight leading-none">
          Profile
        </h1>
      </header>

      <div className="relative px-4 pt-[110px] pb-4 bg-white dark:bg-gray-950 border-b border-slate-100 dark:border-gray-800 rounded-b-2xl shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex flex-col items-center text-center space-y-2.5 pt-0">
          <div className="relative">
            <div className="w-16 h-16 bg-slate-50 dark:bg-gray-900 rounded-2xl border-2 border-white dark:border-gray-950 shadow-xl overflow-hidden flex items-center justify-center">
              {profile?.image ? <img src={profile.image} className="w-full h-full object-cover" alt={profile?.name || 'Staff'} /> : <User size={28} className="text-slate-300" />}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center border-2 border-white dark:border-gray-950 shadow-md text-white">
              <CheckCircle size={10} strokeWidth={3} />
            </div>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{profile?.name}</h1>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[8px] font-black text-slate-400 capitalize tracking-[0.2em]">Professional Partner</span>
              <div className="w-1 h-1 bg-primary rounded-full" />
              <span className="text-[8px] font-black text-primary dark:text-white capitalize tracking-[0.2em]">{profile?.vendorId?.shopName || 'Market'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="py-2 px-1 bg-[#00246b]/5 dark:bg-gray-900/40 rounded-xl text-center border border-[#00246b]/10 dark:border-gray-800/50">
            <Award size={14} strokeWidth={2.5} className="text-[#00246b] dark:text-white mx-auto mb-0.5 opacity-80" />
            <p className="text-[9px] font-black text-[#00246b] dark:text-white capitalize tracking-tight">{stats.skills} Skills</p>
          </div>
          <div className="py-2 px-1 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl text-center border border-emerald-100/50 dark:border-emerald-900/30">
            <CheckCircle size={14} strokeWidth={2.5} className="text-emerald-500 mx-auto mb-0.5" />
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 capitalize tracking-tight">Verified</p>
          </div>
          <div className="py-2 px-1 bg-[#00246b]/5 dark:bg-gray-900/40 rounded-xl text-center border border-[#00246b]/10 dark:border-gray-800/50">
            <TrendingUp size={14} strokeWidth={2.5} className="text-[#00246b] dark:text-white mx-auto mb-0.5" />
            <p className="text-[9px] font-black text-[#00246b] dark:text-white capitalize tracking-tight">{stats.completed}+ Done</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/vendor-privacy-policy')}
          className="mt-3.5 w-full flex items-center justify-between p-2.5 px-3.5 bg-slate-50/50 dark:bg-gray-900/50 rounded-xl border border-white dark:border-gray-800 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <ShieldCheck size={16} className="text-indigo-500" />
            </div>
            <div className="text-left">
              <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Privacy & Conduct</h4>
              <p className="text-[8px] font-bold text-slate-400">View Staff Guidelines</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-slate-300" />
        </button>
      </div>

      <div className="px-3 py-4 space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 capitalize tracking-[0.2em]">Work Identity</h2>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-gray-800 ml-4 opacity-50" />
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-slate-100 dark:border-gray-800 space-y-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-blue-500/10 transition-all duration-500" />

            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                <Calendar size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 capitalize tracking-widest leading-none">Onboarding Date</p>
                <p className="text-xs font-black text-slate-900 dark:text-white mt-1 capitalize tracking-tight">{formatDate(profile?.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 bg-primary/5 dark:bg-primary/20 text-primary rounded-xl flex items-center justify-center shadow-sm">
                <ShieldCheck size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="text-[8px] font-black text-slate-400 capitalize tracking-widest leading-none">Service Authorization</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {profile?.services?.map((service) => (
                    <span key={service._id} className="text-[7.5px] font-black bg-slate-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg text-slate-500 dark:text-gray-400 border border-slate-100 dark:border-gray-700/50 capitalize tracking-widest leading-none">
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
            <h2 className="text-[10px] font-black text-slate-400 capitalize tracking-[0.2em]">Employment & Support</h2>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-gray-800 ml-4 opacity-50" />
          </div>

          <div className="bg-white dark:bg-gray-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 dark:bg-gray-800 text-primary dark:text-white rounded-xl flex items-center justify-center border border-slate-100 dark:border-gray-700/50">
                  <Briefcase size={20} strokeWidth={2.5} className="opacity-80" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 capitalize tracking-widest leading-none mb-1">Primary Branch</p>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{profile?.vendorId?.shopName || 'Partner Hub'}</h3>
                </div>
              </div>
              {profile?.vendorId?.ownerId?.phone && (
                <a href={`tel:${profile.vendorId.ownerId.phone}`} className="w-9 h-9 bg-[#00246b] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all outline-none">
                  <Phone size={16} strokeWidth={3} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 capitalize tracking-[0.2em]">Work History</h2>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-gray-800 ml-4 opacity-50" />
          </div>

          <button
            onClick={() => navigate('/staff/inventory')}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 active:scale-[0.98] transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-500">
                <Package size={18} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Stock Management</h4>
                <p className="text-[10px] font-bold text-slate-400">Manage inventory stock</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-300" />
          </button>

          <button
            onClick={() => navigate('/staff/history')}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 active:scale-[0.98] transition-all shadow-sm mt-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-500">
                <Calendar size={18} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">History</h4>
                <p className="text-[10px] font-bold text-slate-400">View bookings & earnings history</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-300" />
          </button>

          <button
            onClick={() => navigate('/staff/reviews')}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 active:scale-[0.98] transition-all shadow-sm mt-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl text-yellow-500">
                <Star size={18} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Reviews</h4>
                <p className="text-[10px] font-bold text-slate-400">View customer feedback & ratings</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-300" />
          </button>
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full h-11 bg-slate-50 dark:bg-gray-900 text-rose-500 rounded-[2.2rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] border border-slate-200/50 dark:border-gray-800 active:scale-95 transition-all shadow-sm group"
        >
          <LogOut size={16} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
          Sign Out
        </button>
      </div>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[280px] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl relative z-10 p-5 text-center border border-white/20 dark:border-gray-800"
            >
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-3 border border-rose-100/50">
                <LogOut size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Confirm Logout</h3>
              <p className="text-[11px] font-bold text-slate-400 dark:text-gray-500 mt-1.5 tracking-widest leading-relaxed">
                Are you sure you want to sign out? You will need to login again.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500 rounded-xl font-black text-[11px] capitalize tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/vendor-login', { replace: true });
                    setShowLogoutConfirm(false);
                  }}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-[11px] capitalize tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Navbar />
    </div>
  );
};

export default StaffAccount;
