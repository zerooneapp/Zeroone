import React, { useState, useEffect } from 'react';
import {
  User, ShieldCheck, Calendar, Phone,
  LogOut, Briefcase, Award,
  CheckCircle, TrendingUp, IndianRupee, ArrowRight,
  ChevronLeft, ChevronRight, Star, Package
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
      <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-[var(--safe-header-top)] pb-3 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800 shadow-sm flex items-center justify-between shrink-0 max-w-md mx-auto">
        <h1 className="text-xl font-black text-[#00246b] dark:text-white tracking-tight leading-none">
          Profile
        </h1>
      </header>

      <div className="max-w-md mx-auto">
        <div className="relative px-4 pt-[var(--safe-main-top)] pb-4 bg-white dark:bg-gray-950 border-b border-slate-100 dark:border-gray-800 rounded-b-2xl shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="flex flex-col items-center text-center space-y-2.5 pt-0">
            <div className="relative">
              <div className="w-16 h-16 bg-slate-50 dark:bg-gray-900 rounded-2xl border-2 border-white dark:border-gray-950 shadow-xl overflow-hidden flex items-center justify-center">
                {profile?.image ? <img src={profile.image} className="w-full h-full object-cover" alt={profile?.name || 'Staff'} /> : <User size={28} className="text-slate-300" />}
              </div>
            </div>
            <div className="space-y-0.5 mt-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight text-center">{profile?.name}</h1>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[8px] font-black text-slate-400 capitalize tracking-[0.2em]">Professional Partner</span>
                <div className="w-1 h-1 bg-primary rounded-full" />
                <span className="text-[8px] font-black text-primary dark:text-white capitalize tracking-[0.2em]">{profile?.vendorId?.shopName || 'Market'}</span>
              </div>
            </div>
          </div>
        </div>

      <div className="px-4 mt-4 space-y-1.5 animate-in fade-in slide-in-from-bottom-5 duration-700">
        {/* Onboarding Date */}
        <div className="bg-white dark:bg-gray-900 py-2 px-3.5 rounded-xl border border-[#00246b]/10 dark:border-gray-800 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-[10px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Calendar size={18} strokeWidth={2.5} />
          </div>
          <div className="flex-1 leading-none">
            <p className="text-[10px] font-black text-[#00246b]/40 dark:text-slate-400 tracking-tight leading-none mb-1">Onboarding Date</p>
            <p className="text-[14px] font-black text-[#00246b] dark:text-white tracking-tight leading-none">{formatDate(profile?.createdAt)}</p>
          </div>
        </div>

        {/* Primary Branch */}
        <div className="bg-white dark:bg-gray-900 py-2 px-3.5 rounded-xl border border-[#00246b]/10 dark:border-gray-800 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-[10px] bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Briefcase size={18} strokeWidth={2.5} />
          </div>
          <div className="flex-1 leading-none">
            <p className="text-[10px] font-black text-[#00246b]/40 dark:text-slate-400 tracking-tight leading-none mb-1">Primary Branch</p>
            <p className="text-[14px] font-black text-[#00246b] dark:text-white tracking-tight leading-none">{profile?.vendorId?.shopName || 'Partner Hub'}</p>
          </div>
          {profile?.vendorId?.ownerId?.phone && (
            <a href={`tel:${profile.vendorId.ownerId.phone}`} className="w-9 h-9 bg-[#00246b] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all outline-none">
              <Phone size={16} strokeWidth={3} />
            </a>
          )}
        </div>

        {/* Stock Management */}
        <div
          onClick={() => navigate('/staff/inventory')}
          className="group bg-white dark:bg-gray-900 py-2 px-3.5 rounded-xl border border-[#00246b]/10 dark:border-gray-800 flex items-center gap-3.5 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
        >
          <div className="w-10 h-10 rounded-[10px] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Package size={18} strokeWidth={2.5} />
          </div>
          <div className="flex-1 leading-none">
            <p className="text-[14px] font-black text-[#00246b] dark:text-white tracking-tight leading-none">STOCK MANAGEMENT</p>
            <p className="text-[10px] font-black text-[#00246b]/40 dark:text-slate-400 tracking-tight mt-1.5 truncate leading-none">Manage inventory stock</p>
          </div>
          <ChevronRight size={14} strokeWidth={3} className="text-slate-200 dark:text-gray-700 transition-colors" />
        </div>

        {/* History */}
        <div
          onClick={() => navigate('/staff/history')}
          className="group bg-white dark:bg-gray-900 py-2 px-3.5 rounded-xl border border-[#00246b]/10 dark:border-gray-800 flex items-center gap-3.5 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
        >
          <div className="w-10 h-10 rounded-[10px] bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Calendar size={18} strokeWidth={2.5} />
          </div>
          <div className="flex-1 leading-none">
            <p className="text-[14px] font-black text-[#00246b] dark:text-white tracking-tight leading-none">HISTORY</p>
            <p className="text-[10px] font-black text-[#00246b]/40 dark:text-slate-400 tracking-tight mt-1.5 truncate leading-none">View bookings & earnings history</p>
          </div>
          <ChevronRight size={14} strokeWidth={3} className="text-slate-200 dark:text-gray-700 transition-colors" />
        </div>

        {/* Reviews */}
        <div
          onClick={() => navigate('/staff/reviews')}
          className="group bg-white dark:bg-gray-900 py-2 px-3.5 rounded-xl border border-[#00246b]/10 dark:border-gray-800 flex items-center gap-3.5 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
        >
          <div className="w-10 h-10 rounded-[10px] bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Star size={18} strokeWidth={2.5} />
          </div>
          <div className="flex-1 leading-none">
            <p className="text-[14px] font-black text-[#00246b] dark:text-white tracking-tight leading-none">REVIEWS</p>
            <p className="text-[10px] font-black text-[#00246b]/40 dark:text-slate-400 tracking-tight mt-1.5 truncate leading-none">View customer feedback & ratings</p>
          </div>
          <ChevronRight size={14} strokeWidth={3} className="text-slate-200 dark:text-gray-700 transition-colors" />
        </div>

        {/* Sign Out */}
        <div className="pt-2">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-red-500/30 dark:border-red-500/30 text-red-500 dark:text-red-400 font-black tracking-widest text-[11px] active:scale-95 transition-all shadow-sm"
          >
            <LogOut size={16} strokeWidth={3} />
            SIGN OUT
          </button>
        </div>
      </div>
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
