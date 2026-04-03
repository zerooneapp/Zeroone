import React, { useState, useEffect, useCallback } from 'react';
import {
   Search, Filter, RefreshCw, MoreVertical,
   ChevronRight, User, Phone, Calendar,
   Shield, CheckCircle, XCircle, Ban,
   LayoutDashboard, History, Eye, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const UserManagement = () => {
   const navigate = useNavigate();
   const [users, setUsers] = useState([]);
   const [loading, setLoading] = useState(true);

   // Filters & Pagination State
   const [filters, setFilters] = useState({
      search: '',
      status: ''
   });
   const [page, setPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
   const [actionLoadingId, setActionLoadingId] = useState(null);

   const fetchUsers = useCallback(async () => {
      try {
         setLoading(true);
         const params = {
            ...filters,
            page,
            limit: 10
         };
         // Clean empty filters
         Object.keys(params).forEach(key => !params[key] && delete params[key]);

         const res = await api.get('/admin/users', { params });
         setUsers(res.data.users);
         setTotalPages(res.data.totalPages);
      } catch (err) {
         toast.error('Failed to fetch users');
      } finally {
         setLoading(false);
      }
   }, [filters, page]);

   useEffect(() => {
      const timer = setTimeout(fetchUsers, 300);
      return () => clearTimeout(timer);
   }, [fetchUsers]);

   const handleToggleBlock = async (userId) => {
      if (actionLoadingId === userId) return;

      const previousUsers = [...users];
      setActionLoadingId(userId);

      // Optimistic UI Update
      setUsers(users.map(u =>
         u._id === userId ? { ...u, isBlocked: !u.isBlocked } : u
      ));

      try {
         const res = await api.patch(`/admin/users/${userId}/block`);
         toast.success(res.data.message);
      } catch (err) {
         setUsers(previousUsers);
         toast.error('Failed to toggle block status');
      } finally {
         setActionLoadingId(null);
      }
   };

   const getStatusBadge = (isBlocked) => (
      <span className={cn(
         "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-tighter",
         isBlocked ? "bg-red-50 text-red-500 border-red-100/50" : "bg-emerald-50 text-emerald-500 border-emerald-100/50"
      )}>
         {isBlocked ? 'Blocked' : 'Active'}
      </span>
   );

   return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-500">

         {/* 🔍 TOP CONTROL BAR */}
         <div className="p-4 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-[20px] font-black text-slate-900 dark:text-white tracking-tight uppercase">User Base</h1>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 opacity-60">Manage your global user network</p>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={fetchUsers} className="p-2.5 bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-400 border border-slate-100 dark:border-gray-700 active:scale-90 transition-all shadow-sm">
                     <RefreshCw size={16} strokeWidth={3} className={loading ? "animate-spin" : ""} />
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
               <div className="relative lg:col-span-2">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} strokeWidth={3} />
                  <input
                     type="text"
                     placeholder="Search by name or phone..."
                     className="w-full pl-10 pr-4 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[12px] font-black uppercase tracking-tight focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white placeholder:text-slate-300"
                     value={filters.search}
                     onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
               </div>
               {['status'].map((f) => (
                  <select
                     key={f}
                     className="px-3.5 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 focus:ring-2 ring-primary/20 outline-none appearance-none cursor-pointer"
                     value={filters[f]}
                     onChange={(e) => setFilters({ ...filters, [f]: e.target.value })}
                  >
                     <option value="">{f.toUpperCase()} : ALL</option>
                     <option value="active">ACTIVE</option>
                     <option value="blocked">BLOCKED</option>
                  </select>
               ))}
            </div>
         </div>

         {/* 📋 TABLE VIEW */}
         <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-slate-50/50 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800">
                     <th className="px-6 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">User Identity</th>
                     <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Contact</th>
                     <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60 text-center">Bookings</th>
                     <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Joined Date</th>
                     <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60">Status</th>
                     <th className="px-6 py-4 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                  <AnimatePresence mode='popLayout'>
                     {users.map((user) => (
                        <motion.tr
                           key={user._id}
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           className="group hover:bg-slate-50/80 dark:hover:bg-gray-800/80 transition-all cursor-pointer"
                        >
                           <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3.5">
                                 <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[14px] italic shadow-lg border border-white/10 shrink-0">
                                    {user.name?.charAt(0) || 'U'}
                                 </div>
                                 <div className="leading-tight">
                                    <h4 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors">{user.name}</h4>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">Customer</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-4 py-3.5 text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight opacity-80">
                              {user.phone}
                           </td>
                           <td className="px-4 py-3.5 text-center">
                              <span className="px-2.5 py-1 bg-slate-50 dark:bg-gray-800 rounded-lg text-[10px] font-black text-slate-900 dark:text-white border border-slate-100 dark:border-gray-700 shadow-sm">
                                 {user.bookingCount || 0}
                              </span>
                           </td>
                           <td className="px-4 py-3.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter opacity-80">
                              {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                           </td>
                           <td className="px-4 py-3.5 leading-none">
                              <span className={cn(
                                 "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-tighter",
                                 user.isBlocked ? "bg-red-50 text-red-500 border-red-100/50" : "bg-emerald-50 text-emerald-500 border-emerald-100/50"
                              )}>
                                 {user.isBlocked ? 'Blocked' : 'Active'}
                              </span>
                           </td>
                           <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                 <button
                                    onClick={() => navigate(`/admin/users/${user._id}`)}
                                    className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-gray-800 rounded-xl text-slate-300 hover:text-primary transition-all active:scale-90 border border-slate-100 dark:border-gray-700"
                                    title="View Details"
                                 >
                                    <Eye size={16} strokeWidth={3} />
                                 </button>
                                 <button
                                    onClick={() => handleToggleBlock(user._id)}
                                    disabled={actionLoadingId === user._id}
                                    className={cn(
                                       "w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 border shadow-sm",
                                       actionLoadingId === user._id && "opacity-50 animate-pulse",
                                       user.isBlocked
                                          ? "bg-emerald-50 text-emerald-500 border-emerald-100/50"
                                          : "bg-red-50 text-red-500 border-red-100/50"
                                    )}
                                    title={user.isBlocked ? "Unblock User" : "Block User"}
                                 >
                                    <Ban size={16} strokeWidth={3} />
                                 </button>
                              </div>
                           </td>
                        </motion.tr>
                     ))}
                  </AnimatePresence>
               </tbody>
            </table>

            {!loading && users.length === 0 && (
               <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-slate-200 dark:text-slate-700 border border-slate-100 dark:border-gray-700">
                     <User size={32} strokeWidth={3} />
                  </div>
                  <p className="font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest text-[9px] italic">No users found</p>
               </div>
            )}
         </div>

      </div>
   );
};

export default UserManagement;
