import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, RefreshCw, ChevronRight,
  Calendar, Clock, CreditCard, Package,
  User, Store, AlertCircle, XCircle,
  CheckCircle, Ban, History, ShieldAlert
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
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    date: ''
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
      <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-tighter", styles[status] || "bg-slate-50 text-slate-400 border-slate-100")}>
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
            <h1 className="text-[20px] font-black text-slate-900 dark:text-white tracking-tight uppercase">Global Ledger</h1>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 opacity-60">Audit real-time transaction activity</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchBookings} className="p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-400 border border-slate-100 dark:border-gray-700 active:scale-90 transition-all shadow-sm">
              <RefreshCw size={16} strokeWidth={3} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} strokeWidth={3} />
            <input
              type="text"
              placeholder="Search user, vendor..."
              className="w-full pl-10 pr-4 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[12px] font-black uppercase tracking-tight focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white placeholder:text-slate-300"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="px-3.5 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 focus:ring-2 ring-primary/20 outline-none appearance-none cursor-pointer"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">ALL STATUS</option>
            <option value="confirmed">CONFIRMED</option>
            <option value="completed">COMPLETED</option>
            <option value="cancelled">CANCELLED</option>
          </select>
          <input
            type="date"
            className="px-3.5 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[9px] font-black uppercase text-slate-500 focus:ring-2 ring-primary/20 outline-none cursor-pointer"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
        </div>
      </div>

      {/* 📋 TRANSACTIONS TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800">
              <th className="px-6 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Transaction ID</th>
              <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Participants</th>
              <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60 text-center">Price</th>
              <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Date & Time</th>
              <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Status</th>
              <th className="px-6 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60 text-right">Actions</th>
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
                    <code className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-gray-800 px-2.5 py-1 rounded-md border border-slate-100 dark:border-gray-700 uppercase tracking-tighter italic">
                      #{booking.bookingId || booking._id.slice(-6)}
                    </code>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="space-y-1 leading-none">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-tight">
                        <User size={10} strokeWidth={3} className="text-primary opacity-60" /> {booking.user?.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60 italic">
                        <Store size={10} strokeWidth={3} className="text-slate-300" /> {booking.vendor?.shopName}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-[12px] font-black text-slate-900 dark:text-white italic">
                      ₹{booking.totalPrice}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 space-y-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter leading-none opacity-80">
                    <div className="flex items-center gap-1.5"><Calendar size={9} strokeWidth={3} className="text-slate-300" /> {new Date(booking.createdAt).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1.5"><Clock size={9} strokeWidth={3} className="text-slate-300" /> {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3.5 leading-none">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => navigate(`/admin/bookings/${booking._id}`)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-300 hover:text-primary transition-all active:scale-90 border border-slate-100 dark:border-gray-700 shadow-sm"
                        title="View Order"
                      >
                        <Eye size={16} strokeWidth={3} />
                      </button>
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleForceCancel(booking._id)}
                          disabled={actionLoadingId === booking._id}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl transition-all active:scale-90 border border-red-100/50 shadow-sm",
                            actionLoadingId === booking._id && "opacity-50 animate-pulse"
                          )}
                          title="Force Cancel"
                        >
                          <XCircle size={16} strokeWidth={3} />
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
            <p className="font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest text-[9px] italic">
              {filters.search || filters.status || filters.date ? "No matching records in ledger" : "No bookings recorded yet"}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

// Internal sub-components for reuse logic
const Eye = ({ size, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);

export default BookingManagement;
