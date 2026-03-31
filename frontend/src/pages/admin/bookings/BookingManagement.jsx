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
      confirmed: "bg-blue-50 text-blue-500 border-blue-100",
      completed: "bg-emerald-50 text-emerald-500 border-emerald-100",
      cancelled: "bg-red-50 text-red-500 border-red-100"
    };
    return (
      <span className={cn("text-[10px] font-black uppercase px-2 py-1 rounded-lg border", styles[status] || styles.pending)}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* 🔍 GLOBAL FILTERS */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-black dark:text-white tracking-tight italic text-primary">Global Ledger 📋</h1>
            <div className="flex items-center gap-2">
               <button onClick={fetchBookings} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-primary transition-colors">
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-1">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
               <input 
                 type="text"
                 placeholder="Search user, vendor..."
                 className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white"
                 value={filters.search}
                 onChange={(e) => setFilters({...filters, search: e.target.value})}
               />
            </div>
            <select 
              className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 focus:ring-2 ring-primary/20 outline-none appearance-none"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
               <option value="">ALL STATUS</option>
               <option value="confirmed">CONFIRMED</option>
               <option value="completed">COMPLETED</option>
               <option value="cancelled">CANCELLED</option>
            </select>
            <input 
              type="date"
              className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xs font-black uppercase text-gray-500 focus:ring-2 ring-primary/20 outline-none"
              value={filters.date}
              onChange={(e) => setFilters({...filters, date: e.target.value})}
            />
         </div>
      </div>

      {/* 📋 TRANSACTIONS TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto">
         <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
               <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Transaction ID</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Participants</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Price</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Date & Time</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
               </tr>
            </thead>
            <tbody>
               <AnimatePresence mode='popLayout'>
                  {bookings.map((booking) => (
                    <motion.tr 
                      key={booking._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-colors"
                    >
                       <td className="px-8 py-6">
                          <code className="text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-lg uppercase tracking-wider">
                             #{booking.bookingId || booking._id.slice(-6)}
                          </code>
                       </td>
                       <td className="px-6 py-6">
                          <div className="space-y-1">
                             <div className="flex items-center gap-1 text-[10px] font-black uppercase dark:text-white">
                                <User size={10} className="text-gray-400" /> {booking.user?.name}
                             </div>
                             <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <Store size={10} /> {booking.vendor?.shopName}
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-6 text-center">
                          <span className="text-sm font-black dark:text-white">
                             ₹{booking.totalPrice}
                          </span>
                       </td>
                       <td className="px-6 py-6 space-y-1 text-[10px] font-bold text-gray-400 uppercase">
                          <div className="flex items-center gap-1"><Calendar size={10}/> {new Date(booking.createdAt).toLocaleDateString()}</div>
                          <div className="flex items-center gap-1"><Clock size={10}/> {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                       </td>
                       <td className="px-6 py-6">
                          {getStatusBadge(booking.status)}
                       </td>
                       <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => navigate(`/admin/bookings/${booking._id}`)}
                               className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-primary transition-colors"
                             >
                                <Eye size={18} />
                             </button>
                             {booking.status === 'confirmed' && (
                               <button 
                                 onClick={() => handleForceCancel(booking._id)}
                                 disabled={actionLoadingId === booking._id}
                                 className={cn(
                                   "p-3 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all",
                                   actionLoadingId === booking._id && "opacity-50 animate-pulse"
                                 )}
                               >
                                  <XCircle size={18} />
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
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                 <Package size={40} />
              </div>
              <p className="font-black text-gray-400 uppercase tracking-widest text-sm italic">
                 {filters.search || filters.status || filters.date ? "No bookings found for selected filters" : "No bookings found"}
              </p>
           </div>
         )}
      </div>

    </div>
  );
};

// Icon injection for re-use
const Eye = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);

export default BookingManagement;
