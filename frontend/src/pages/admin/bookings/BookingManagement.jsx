import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, RefreshCw, ChevronRight, ChevronDown,
  Calendar, Clock, CreditCard, Package,
  User, Store, AlertCircle, XCircle,
  CheckCircle, Ban, History, ShieldAlert,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const BookingManagement = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page,
        limit: 10
      };
      // Clean empty filters
      Object.keys(params).forEach(key => !params[key] && delete params[key]);

      const res = await api.get('/admin/bookings', { params });
      setBookings(res.data.bookings);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(fetchBookings, 300);
    return () => clearTimeout(timer);
  }, [fetchBookings]);

  const handleForceCancel = async (id) => {
    if (actionLoadingId === id) return;
    if (!window.confirm('Are you sure you want to FORCE CANCEL this booking? This override bypasses standard rules.')) return;

    const previousBookings = [...bookings];
    setActionLoadingId(id);

    // Optimistic UI
    setBookings(prev => prev.map(b =>
      b._id === id ? { ...b, status: 'cancelled' } : b
    ));

    try {
      await api.patch(`/admin/bookings/${id}/cancel`, { reason: 'Force cancelled by Admin' });
      toast.success('Booking Overridden: CANCELLED 🛡️');
    } catch (err) {
      setBookings(previousBookings);
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: "bg-blue-50 text-blue-500 border-blue-100/50",
      completed: "bg-emerald-50 text-emerald-500 border-emerald-100/50",
      cancelled: "bg-red-50 text-red-500 border-red-100/50"
    };
    return (
      <span className={cn("text-[10px] font-black capitalize px-2 py-0.5 rounded-md border tracking-tighter", styles[status] || "bg-slate-50 text-slate-400 border-slate-100")}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-500">

      {/* 🔍 GLOBAL FILTERS */}
      <div className="p-4 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-black text-slate-900 dark:text-white tracking-tight capitalize">Global Ledger</h1>
            <p className="text-[11px] font-black text-slate-400 capitalize tracking-[0.2em] mt-1 opacity-60">Audit real-time transaction activity</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchBookings} className="p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-400 border border-slate-100 dark:border-gray-700 active:scale-90 transition-all shadow-sm">
              <RefreshCw size={18} strokeWidth={3} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(140px,0.7fr)_minmax(0,0.8fr)_24px_minmax(0,0.8fr)_minmax(120px,auto)] gap-2.5 items-center">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={3} />
            <input
              type="text"
              placeholder="Search user, partner..."
              className="w-full pl-10 pr-4 h-11 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[14px] font-black capitalize tracking-tight focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white placeholder:text-slate-300"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="relative group min-w-[140px]">
            <select
              className="w-full px-3.5 pr-10 h-11 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[11px] font-black capitalize tracking-widest text-slate-500 focus:ring-2 ring-primary/20 outline-none appearance-none cursor-pointer group-hover:bg-slate-100 dark:group-hover:bg-gray-700 transition-all dark:text-slate-200"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">ALL STATUS</option>
              <option value="confirmed">CONFIRMED</option>
              <option value="completed">COMPLETED</option>
              <option value="cancelled">CANCELLED</option>
            </select>
            <ChevronDown size={14} strokeWidth={4} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors" />
          </div>
          <input
            type="date"
            className="px-3.5 h-11 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[11px] font-black capitalize text-slate-500 focus:ring-2 ring-primary/20 outline-none cursor-pointer"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <div className="hidden lg:flex items-center justify-center text-slate-300 dark:text-slate-600 font-black text-lg">
            &gt;
          </div>
          <input
            type="date"
            className="px-3.5 h-11 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[11px] font-black capitalize text-slate-500 focus:ring-2 ring-primary/20 outline-none cursor-pointer"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
          <div className="flex items-center gap-2 px-4 h-11 bg-primary/5 border border-primary/10 rounded-xl">
             <div className="flex flex-col leading-none">
                <span className="text-[9px] font-black text-primary/50 uppercase tracking-widest mb-0.5">Total Booking</span>
                <span className="text-[15px] font-black text-primary tracking-tight">{totalBookings}</span>
             </div>
          </div>
        </div>
      </div>

      {/* 📋 TRANSACTIONS TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800">
              <th className="px-6 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60">Transaction ID</th>
              <th className="px-4 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60">Participants</th>
              <th className="px-4 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60 text-center">Price</th>
              <th className="px-4 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60">Date & Time</th>
              <th className="px-4 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60">Status</th>
              <th className="px-6 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 opacity-60 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
            <AnimatePresence mode='popLayout'>
              {bookings.map((booking) => (
                <motion.tr
                  key={booking._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group hover:bg-slate-50/80 dark:hover:bg-gray-800/80 transition-all cursor-pointer"
                >
                  <td className="px-6 py-3.5">
                    <code className="text-[12px] font-black text-slate-400 bg-slate-50 dark:bg-gray-800 px-2.5 py-1 rounded-md border border-slate-100 dark:border-gray-700 capitalize tracking-tighter">
                      #{booking.bookingId || booking._id.slice(-6)}
                    </code>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center gap-1.5 text-[14px] font-black capitalize text-slate-900 dark:text-white tracking-tight">
                        <User size={12} strokeWidth={3} className="text-primary opacity-60" /> {booking.user?.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 capitalize tracking-widest opacity-60">
                        <Store size={12} strokeWidth={3} className="text-slate-300" /> {booking.vendor?.shopName}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-[15px] font-black text-slate-900 dark:text-white">
                      ₹{booking.totalPrice}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 space-y-1 text-[12px] font-black text-slate-400 dark:text-slate-500 capitalize tracking-tighter leading-none opacity-80">
                    <div className="flex items-center gap-1.5"><Calendar size={11} strokeWidth={3} className="text-slate-300" /> {new Date(booking.startTime || booking.createdAt).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1.5"><Clock size={11} strokeWidth={3} className="text-slate-300" /> {new Date(booking.startTime || booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3.5 leading-none">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => navigate(`/admin/bookings/${booking._id}`)}
                        className="w-9 h-9 flex items-center justify-center bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-300 hover:text-primary transition-all active:scale-90 border border-slate-100 dark:border-gray-700 shadow-sm"
                        title="View Order"
                      >
                        <Eye size={18} strokeWidth={3} />
                      </button>
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleForceCancel(booking._id)}
                          disabled={actionLoadingId === booking._id}
                          className={cn(
                            "w-9 h-9 flex items-center justify-center bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl transition-all active:scale-90 border border-red-100/50 shadow-sm",
                            actionLoadingId === booking._id && "opacity-50 animate-pulse"
                          )}
                          title="Force Cancel"
                        >
                          <XCircle size={18} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {!loading && bookings.length === 0 && (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-slate-200 dark:text-slate-700 border border-slate-100 dark:border-gray-700">
              <Package size={32} strokeWidth={3} />
            </div>
            <p className="font-black text-slate-300 dark:text-slate-600 capitalize tracking-widest text-[12px] ">
              {filters.search || filters.status || filters.startDate || filters.endDate ? "No matching records in ledger" : "No bookings recorded yet"}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default BookingManagement;
