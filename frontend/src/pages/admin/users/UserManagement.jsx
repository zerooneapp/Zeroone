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
      "text-[10px] font-black uppercase px-2 py-1 rounded-lg",
      isBlocked ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
    )}>
      {isBlocked ? 'Blocked' : 'Active'}
    </span>
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* 🔍 TOP CONTROL BAR */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-black dark:text-white tracking-tight italic text-primary">User Base 👤</h1>
            <div className="flex items-center gap-2">
               <button onClick={fetchUsers} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-primary transition-colors">
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-2">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
               <input 
                 type="text"
                 placeholder="Search by name or phone..."
                 className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-medium focus:ring-2 ring-primary/20 outline-none transition-all dark:text-white"
                 value={filters.search}
                 onChange={(e) => setFilters({...filters, search: e.target.value})}
               />
            </div>
            {['status'].map((f) => (
               <select 
                 key={f}
                 className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 focus:ring-2 ring-primary/20 outline-none appearance-none"
                 value={filters[f]}
                 onChange={(e) => setFilters({...filters, [f]: e.target.value})}
               >
                  <option value="">{f.toUpperCase()} : ALL</option>
                  <option value="active">ACTIVE</option>
                  <option value="blocked">BLOCKED</option>
               </select>
            ))}
         </div>
      </div>

      {/* 📋 TABLE VIEW */}
      <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto">
         <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
               <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">User Identity</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Contact</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Bookings</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Joined Date</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
               </tr>
            </thead>
            <tbody>
               <AnimatePresence mode='popLayout'>
                  {users.map((user) => (
                    <motion.tr 
                      key={user._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-colors"
                    >
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-lg">
                                {user.name?.charAt(0) || 'U'}
                             </div>
                             <div>
                                <h4 className="font-black dark:text-white uppercase tracking-tight">{user.name}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-6 text-xs font-black dark:text-white uppercase">
                          {user.phone}
                       </td>
                       <td className="px-6 py-6 text-center">
                          <span className="px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-black dark:text-white border border-gray-100 dark:border-gray-700">
                             {user.bookingCount || 0}
                          </span>
                       </td>
                       <td className="px-6 py-6 text-xs font-bold text-gray-400 uppercase">
                          {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                       </td>
                       <td className="px-6 py-6">
                          {getStatusBadge(user.isBlocked)}
                       </td>
                       <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => navigate(`/admin/users/${user._id}`)}
                               className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-primary transition-colors"
                               title="View Details"
                             >
                                <Eye size={18} />
                             </button>
                             <button 
                               onClick={() => handleToggleBlock(user._id)}
                               disabled={actionLoadingId === user._id}
                               className={cn(
                                 "p-3 rounded-2xl transition-all",
                                 actionLoadingId === user._id && "opacity-50 animate-pulse",
                                 user.isBlocked 
                                   ? "bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white" 
                                   : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
                               )}
                               title={user.isBlocked ? "Unblock User" : "Block User"}
                             >
                                <Ban size={18} />
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
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                 <User size={40} />
              </div>
              <p className="font-black text-gray-400 uppercase tracking-widest text-sm">No users found</p>
           </div>
         )}
      </div>

    </div>
  );
};

export default UserManagement;
