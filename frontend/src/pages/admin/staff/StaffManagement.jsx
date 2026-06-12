import React, { useState, useEffect, useCallback } from 'react';
import {
   Search, Filter, RefreshCw, MoreVertical,
   ChevronRight, ChevronDown, User, Phone, Calendar,
   Shield, CheckCircle, XCircle,
   LayoutDashboard, History, Eye, ArrowLeft, BadgeCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const StaffManagement = () => {
   const navigate = useNavigate();
   const [staffList, setStaffList] = useState([]);
   const [loading, setLoading] = useState(true);

   // Filters & Pagination State
   const [filters, setFilters] = useState({
      search: ''
   });
   const [page, setPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);

   const fetchStaff = useCallback(async () => {
      try {
         // Zero-Latency: Only show loading if we have no data yet
         if (staffList.length === 0) setLoading(true);

         const params = {
            ...filters,
            page,
            limit: 10
         };
         // Clean empty filters
         Object.keys(params).forEach(key => !params[key] && delete params[key]);

         const res = await api.get('/admin/staff', { params });
         setStaffList(res.data.staff);
         setTotalPages(res.data.totalPages);
      } catch (err) {
         toast.error('Failed to fetch staff');
      } finally {
         setLoading(false);
      }
   }, [filters, page, staffList.length]);

   useEffect(() => {
      const timer = setTimeout(fetchStaff, filters.search ? 300 : 0);
      return () => clearTimeout(timer);
   }, [fetchStaff, filters.search]);



   return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-500">

         {/* 🔍 TOP CONTROL BAR */}
         <div className="p-4 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-[24px] font-black text-slate-900 dark:text-white tracking-tight capitalize">Staff Network</h1>
                  <p className="text-[11px] font-black text-slate-500 capitalize tracking-[0.2em] mt-1 opacity-90">Manage partner staff globally</p>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={fetchStaff} className="p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-500 border border-slate-100 dark:border-gray-700 active:scale-90 transition-all shadow-sm">
                     <RefreshCw size={18} strokeWidth={3} className={loading ? "animate-spin" : ""} />
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
               <div className="relative lg:col-span-2">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} strokeWidth={3} />
                  <input
                     type="text"
                     placeholder="Search by staff name..."
                     className="w-full pl-10 pr-4 h-11 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[14px] font-black capitalize tracking-tight focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white placeholder:text-slate-400"
                     value={filters.search}
                     onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
                  />
               </div>

            </div>
         </div>

         {/* 📋 TABLE VIEW */}
         {loading && staffList.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm p-20 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
               <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
               <p className="font-black text-slate-500 capitalize tracking-widest text-[12px]">Loading Staff...</p>
            </div>
         ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
               <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                     <tr className="bg-slate-900 dark:bg-gray-800 border-b border-slate-900 dark:border-gray-700">
                        <th className="px-6 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 dark:text-slate-500">Staff Identity</th>
                        <th className="px-4 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 dark:text-slate-500">Partner Shop</th>
                        <th className="px-4 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 dark:text-slate-500 text-center">Bookings Done</th>
                        <th className="px-4 py-4 text-[10px] font-black capitalize tracking-[0.2em] text-slate-400 dark:text-slate-500">Joined Date</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-gray-800 relative">
                     <AnimatePresence mode='popLayout' initial={false}>
                        {staffList.map((staff) => (
                           <motion.tr
                              key={staff._id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{
                                 duration: 0.2,
                                 layout: { type: "spring", damping: 25, stiffness: 300 }
                              }}
                              className="group hover:bg-slate-50/80 dark:hover:bg-gray-800/80 transition-all"
                           >
                              <td className="px-6 py-3.5">
                                 <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-[15px] shadow-lg border border-primary/10 shrink-0 overflow-hidden">
                                       {staff.image ? (
                                          <img src={staff.image} className="w-full h-full object-cover" alt="" />
                                       ) : (
                                          <BadgeCheck size={20} className="text-white/80" />
                                       )}
                                    </div>
                                    <div className="leading-tight">
                                       <h4 className="text-[14px] font-black text-slate-900 dark:text-white capitalize tracking-tight group-hover:text-primary dark:group-hover:text-white transition-colors">
                                          {staff.name}
                                       </h4>
                                       <p className="text-[11px] font-black text-slate-500 dark:text-slate-500 capitalize tracking-widest mt-0.5">
                                          {staff.phone || staff.user?.phone || 'No phone'}
                                       </p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-4 py-3.5 text-[13px] font-black text-slate-900 dark:text-white capitalize tracking-tight opacity-80">
                                 {staff.vendor?.shopName || 'Unknown Shop'}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                 <span className="px-2.5 py-1 bg-slate-50 dark:bg-gray-800 rounded-lg text-[12px] font-black text-slate-900 dark:text-white border border-slate-100 dark:border-gray-700 shadow-sm">
                                    {staff.bookingCount || 0}
                                 </span>
                              </td>
                              <td className="px-4 py-3.5 text-[12px] font-black text-slate-500 dark:text-slate-500 capitalize tracking-tighter">
                                 {new Date(staff.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                           </motion.tr>
                        ))}
                     </AnimatePresence>
                  </tbody>
               </table>

               {!loading && staffList.length === 0 && (
                  <div className="p-20 text-center space-y-4">
                     <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-gray-700">
                        <BadgeCheck size={32} strokeWidth={3} />
                     </div>
                     <p className="font-black text-slate-400 dark:text-slate-600 capitalize tracking-widest text-[12px]">No staff found</p>
                  </div>
               )}

               {/* ⚡ PAGINATION */}
               {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-gray-900/50">
                     <p className="text-[11px] font-black text-slate-500 capitalize tracking-widest opacity-90">Page {page} of {totalPages}</p>
                     <div className="flex items-center gap-2">
                        <button
                           onClick={() => setPage(p => Math.max(1, p - 1))}
                           disabled={page === 1}
                           className="px-4 h-9 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-[11px] font-black text-slate-500 capitalize tracking-widest active:scale-95 disabled:opacity-80 disabled:pointer-events-none hover:text-primary transition-all shadow-sm"
                        >
                           Previous
                        </button>
                        <button
                           onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                           disabled={page === totalPages}
                           className="px-4 h-9 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-[11px] font-black text-slate-500 capitalize tracking-widest active:scale-95 disabled:opacity-80 disabled:pointer-events-none hover:text-primary transition-all shadow-sm"
                        >
                           Next
                        </button>
                     </div>
                  </div>
               )}
            </div>
         )}

      </div>
   );
};

export default StaffManagement;
