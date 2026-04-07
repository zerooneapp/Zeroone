import React, { useState, useEffect } from 'react';
import {
   TrendingUp, Users, Store, Calendar,
   Zap, AlertTriangle, CheckCircle, XCircle,
   ChevronRight, Filter, MoreVertical, Star
} from 'lucide-react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid,
   Tooltip, ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
   const [data, setData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [chartRange, setChartRange] = useState('7d');

   const fetchDashboard = async (showLoading = true) => {
      try {
         if (showLoading) setLoading(true);
         const res = await api.get(`/admin/dashboard?range=${chartRange}`);
         setData(res.data);
      } catch (err) {
         toast.error('Failed to load dashboard data');
      } finally {
         if (showLoading) setLoading(false);
      }
   };

   useEffect(() => {
      fetchDashboard(true);

      // 🛰️ AUTO-PULSE: Listen for system-wide events to refresh stats live
      const handleAdminSocketEvent = (e) => {
         const notification = e.detail;
         // Refresh for critical platform events
         const criticalTypes = ['NEW_BOOKING', 'BOOKING_COMPLETED', 'VENDOR_SIGNUP', 'LOW_BALANCE', 'NEW_REVIEW'];
         if (criticalTypes.includes(notification?.type)) {
            fetchDashboard(false); // Silent refresh (No pulse loader)
         }
      };

      window.addEventListener('new-socket-notification', handleAdminSocketEvent);
      return () => window.removeEventListener('new-socket-notification', handleAdminSocketEvent);
   }, [chartRange]);

   const handleVendorAction = async (id, action) => {
      try {
         await api.patch(`/admin/vendors/${id}/${action}`, action === 'reject' ? { rejectionReason: 'Admin rejected' } : {});
         toast.success(`Vendor ${action === 'approve' ? 'Approved' : 'Rejected'}!`);
         fetchDashboard();
      } catch (err) {
         toast.error('Action failed');
      }
   };

   if (loading) return (
      <div className="p-8 space-y-8 animate-pulse">
         <div className="h-10 w-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem]" />)}
         </div>
         <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-[3rem]" />
      </div>
   );

   const kpis = [
      { label: 'Today Revenue', value: `₹${data.todayRevenue}`, sub: `vs ₹${data.yesterdayRevenue} yesterday`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { label: 'New Vendors', value: data.newVendors, sub: 'Registered today', icon: Store, color: 'text-primary', bg: 'bg-primary/10' },
      { label: 'Active Bookings', value: data.activeBookings, sub: 'Currently live', icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'Total Users', value: data.totalUsers, sub: 'Exclusive of vendors', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' }
   ];

   return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-500">

         {/* 👑 HEADER */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="leading-none">
               <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">System Status</h1>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Platform Command Center</p>
            </div>
            <div className="flex items-center gap-2.5">
               <button onClick={fetchDashboard} className="p-2.5 bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl shadow-sm active:scale-95 transition-all text-slate-400">
                  <Filter size={16} strokeWidth={3} />
               </button>
               <button className="px-5 py-2.5 bg-slate-900 dark:bg-primary text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-xl active:scale-95 transition-all border-b-2 border-white/10 italic">
                  Live Feed
               </button>
            </div>
         </div>

         {/* 🛑 ALERTS BANNERS */}
         {(data.alerts.lowBalanceVendors > 0) && (
            <motion.div
               initial={{ y: -15, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="p-3.5 px-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between"
            >
               <div className="flex items-center gap-3.5 text-red-500 leading-none">
                  <AlertTriangle size={18} strokeWidth={3} className="animate-pulse" />
                  <div>
                     <p className="text-[11px] font-black uppercase tracking-tight italic">Critical Alert: Low Wallet Balance</p>
                     <p className="text-[9px] font-black opacity-60 uppercase tracking-widest mt-1">{data.alerts.lowBalanceVendors} Vendors Inactive</p>
                  </div>
               </div>
               <button className="text-[8px] font-black uppercase text-red-500 border-b border-red-500/30">Notify All</button>
            </motion.div>
         )}

         {/* 📊 KPI GRID */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => (
               <motion.div
                  key={i}
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all"
               >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 transition-transform group-hover:scale-110", kpi.bg, kpi.color)}>
                     <kpi.icon size={18} strokeWidth={3} />
                  </div>
                  <div className="leading-none pt-1">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{kpi.label}</p>
                     <p className="text-[18px] font-black text-slate-900 dark:text-white mt-2 italic tracking-tighter">{kpi.value}</p>
                     <p className="text-[8.5px] font-black text-slate-400 mt-2 uppercase tracking-tight opacity-60">{kpi.sub}</p>
                  </div>
                  <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none">
                     <kpi.icon size={60} />
                  </div>
               </motion.div>
            ))}
         </div>

         {/* 📈 REVENUE CHART & BOOKING STATS */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-6">
               <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight uppercase">Platform Revenue</h2>
                  <div className="flex gap-1.5 bg-slate-50 dark:bg-gray-800 p-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400">
                     {['7d', '15d', '30d'].map(r => (
                        <button
                           key={r}
                           onClick={() => setChartRange(r)}
                           className={cn("px-3 py-1 rounded-md transition-all active:scale-95", chartRange === r ? "bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-gray-600" : "")}
                        >
                           {r}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={data.revenueGraph}>
                        <defs>
                           <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#000" stopOpacity={0.05} />
                              <stop offset="95%" stopColor="#000" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis
                           dataKey="date"
                           axisLine={false}
                           tickLine={false}
                           tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }}
                           dy={10}
                        />
                        <YAxis
                           axisLine={false}
                           tickLine={false}
                           tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }}
                        />
                        <Tooltip
                           contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#fff' }}
                           itemStyle={{ fontWeight: 900, fontSize: '10px', color: '#0f172a' }}
                        />
                        <Area
                           type="monotone"
                           dataKey="amount"
                           stroke="#0f172a"
                           strokeWidth={3}
                           fillOpacity={1}
                           fill="url(#colorRevenue)"
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4">
               <h2 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight uppercase">Live Status</h2>
               <div className="space-y-2.5">
                  {[
                     { label: 'Active Bookings', value: data.bookingStats.active, color: 'amber' },
                     { label: 'Completed', value: data.bookingStats.completed, color: 'emerald' },
                     { label: 'Cancelled', value: data.bookingStats.cancelled, color: 'red' }
                  ].map((stat, i) => {
                     const colorMap = {
                        amber: "bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10 text-amber-500",
                        emerald: "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10 text-emerald-500",
                        red: "bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10 text-red-500"
                     };

                     return (
                        <div key={i} className={cn("p-3 px-4 rounded-xl border transition-all active:scale-[0.98]", colorMap[stat.color])}>
                           <div className="flex items-center justify-between leading-none">
                              <span className="text-[9px] font-black uppercase tracking-widest italic">{stat.label}</span>
                              <span className="text-[15px] font-black">{stat.value}</span>
                           </div>
                        </div>
                     );
                  })}
               </div>

               <div className="pt-4 border-t border-slate-50 dark:border-gray-800/60">
                  <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest text-center">System Healthy</p>
               </div>
            </div>
         </div>

         {/* 🚀 QUICK LISTS */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* RECENT VENDORS */}
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <h2 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-tight">New Requests</h2>
                  <button className="text-[8px] font-black text-primary uppercase tracking-widest border-b border-primary/30">See All</button>
               </div>
               <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden">
                  {data.recentVendors.map((vendor) => (
                     <div key={vendor._id} className="p-3.5 px-4.5 border-b border-slate-50 dark:border-gray-800 last:border-0 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-all group">
                        <div className="flex items-center gap-3.5 leading-none">
                           <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[13px] font-black italic">
                              {vendor.shopName.charAt(0)}
                           </div>
                           <div>
                              <h4 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{vendor.shopName}</h4>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">{vendor.ownerId?.name} • {vendor.serviceLevel}</p>
                           </div>
                        </div>

                        {vendor.status === 'pending' ? (
                           <div className="flex gap-1.5">
                              <button
                                 onClick={() => handleVendorAction(vendor._id, 'approve')}
                                 className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg active:scale-90 transition-all border border-emerald-100"
                              >
                                 <CheckCircle size={14} strokeWidth={3} />
                              </button>
                              <button
                                 onClick={() => handleVendorAction(vendor._id, 'reject')}
                                 className="p-1.5 bg-red-50 text-red-500 rounded-lg active:scale-90 transition-all border border-red-100"
                              >
                                 <XCircle size={14} strokeWidth={3} />
                              </button>
                           </div>
                        ) : (
                           <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md ${vendor.status === 'active' || vendor.status === 'approved' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                              {vendor.status}
                           </span>
                        )}
                     </div>
                  ))}
                  {data.recentVendors.length === 0 && <div className="p-10 text-center text-slate-300 font-black uppercase tracking-[0.2em] text-[8px]">No pending requests</div>}
               </div>
            </div>

            {/* RECENT USERS */}
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <h2 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Platform Users</h2>
                  <button className="text-[8px] font-black text-primary uppercase tracking-widest border-b border-primary/30">Manage All</button>
               </div>
               <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden">
                  {data.recentUsers.map((user) => (
                     <div key={user._id} className="p-3.5 px-4.5 border-b border-slate-50 dark:border-gray-800 last:border-0 flex items-center justify-between group active:bg-slate-50 transition-all">
                        <div className="flex items-center gap-3.5 leading-none">
                           <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all shadow-inner border border-slate-100 dark:border-gray-700">
                              <Users size={16} strokeWidth={3} />
                           </div>
                           <div>
                              <p className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.name}</p>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">{user.phone}</p>
                           </div>
                        </div>
                        <button className="p-1.5 text-slate-200 group-hover:text-primary transition-all active:scale-95">
                           <ChevronRight size={14} strokeWidth={3} />
                        </button>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* ⭐ REVIEWS MODERATION */}
         <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
               <h2 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Quality Control</h2>
               <button className="text-[8px] font-black text-primary uppercase tracking-widest border-b border-primary/30">Full Audit</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {data.recentReviews.map((review) => (
                  <div key={review._id} className="p-4 px-5 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-3 active:scale-[0.98] transition-all">
                     <div className="flex items-center justify-between leading-none">
                        <div className="flex gap-0.5 text-amber-500">
                           {[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} strokeWidth={3} />)}
                        </div>
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px]">{review.vendorId?.shopName}</span>
                     </div>
                     <p className="text-[11px] font-black text-slate-600 dark:text-gray-400 line-clamp-2 leading-snug italic opacity-80">"{review.comment}"</p>
                     <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-gray-800">
                        <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{review.userId?.name}</span>
                        <button className="text-[7.5px] font-black text-red-500 uppercase italic opacity-60 hover:opacity-100 transition-opacity">Block User</button>
                     </div>
                  </div>
               ))}
               {data.recentReviews.length === 0 && <div className="lg:col-span-3 py-16 text-center text-slate-300 font-black uppercase tracking-[0.2em] text-[8px] border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-2xl">Clean sheet! No reviews yet.</div>}
            </div>
         </section>

      </div>
   );
};

// Utility function for conditional classes
const cn = (...classes) => classes.filter(Boolean).join(' ');

export default AdminDashboard;
