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

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/dashboard?range=${chartRange}`);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
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
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem]" />)}
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
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* 👑 HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black dark:text-white tracking-tight">System Status</h1>
           <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">ZerOne Platform Command Center</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={fetchDashboard} className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm active:scale-95 transition-all text-gray-500">
              <Filter size={18} />
           </button>
           <button className="px-6 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              Live Feed
           </button>
        </div>
      </div>

      {/* 🛑 ALERTS BANNERS */}
      {(data.alerts.lowBalanceVendors > 0) && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] flex items-center justify-between"
        >
           <div className="flex items-center gap-4 text-red-500">
              <AlertTriangle className="animate-bounce" />
              <div>
                 <p className="text-sm font-black uppercase tracking-tight">Critical Alert: Low Wallet Balance</p>
                 <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{data.alerts.lowBalanceVendors} vendors are currently inactive due to low balance.</p>
              </div>
           </div>
           <button className="text-[10px] font-black uppercase text-red-500 underline underline-offset-4">Notify All</button>
        </motion.div>
      )}

      {/* 📊 KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm relative overflow-hidden group"
          >
             <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", kpi.bg, kpi.color)}>
                <kpi.icon size={24} />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{kpi.label}</p>
                <p className="text-2xl font-black dark:text-white mt-1">{kpi.value}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">{kpi.sub}</p>
             </div>
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <kpi.icon size={80} />
             </div>
          </motion.div>
        ))}
      </div>

      {/* 📈 REVENUE CHART & BOOKING STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-50 dark:border-gray-800 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-black dark:text-white tracking-tight">Platform Revenue</h2>
              <div className="flex gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400">
                 {['7d', '15d', '30d'].map(r => (
                   <button 
                     key={r}
                     onClick={() => setChartRange(r)}
                     className={cn("px-3 py-1.5 rounded-lg transition-all", chartRange === r ? "bg-white dark:bg-gray-700 text-primary shadow-sm" : "")}
                   >
                      {r}
                   </button>
                 ))}
              </div>
           </div>
           
           <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueGraph}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 800}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 800}} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: '#fff' }}
                    itemStyle={{ fontWeight: 900, color: '#3B82F6' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3B82F6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="p-8 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-50 dark:border-gray-800 shadow-sm space-y-6">
           <h2 className="text-xl font-black dark:text-white tracking-tight">Live Status</h2>
           <div className="space-y-4">
              {[
                { label: 'Active Bookings', value: data.bookingStats.active, color: 'amber' },
                { label: 'Completed', value: data.bookingStats.completed, color: 'emerald' },
                { label: 'Cancelled', value: data.bookingStats.cancelled, color: 'red' }
              ].map((stat, i) => {
                const colorMap = {
                  amber: "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-500",
                  emerald: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-500",
                  red: "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-500"
                };
                
                return (
                  <div key={i} className={cn("p-4 rounded-2xl border", colorMap[stat.color])}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase">{stat.label}</span>
                        <span className="text-xl font-black">{stat.value}</span>
                    </div>
                  </div>
                );
              })}
           </div>
           
           <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">System Healthy 🌏</p>
           </div>
        </div>
      </div>

      {/* 🚀 QUICK LISTS (VENDORS & USERS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         
         {/* RECENT VENDORS (APPROVAL) */}
         <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-xl font-black dark:text-white tracking-tight italic">New Requests 🏪</h2>
               <button className="text-[10px] font-black text-primary uppercase tracking-widest">See All</button>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-50 dark:border-gray-800 shadow-sm overflow-hidden">
               {data.recentVendors.map((vendor) => (
                 <div key={vendor._id} className="p-5 border-b border-gray-50 dark:border-gray-800 last:border-0 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black">
                          {vendor.shopName.charAt(0)}
                       </div>
                       <div>
                          <h4 className="text-sm font-black dark:text-white">{vendor.shopName}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{vendor.ownerId?.name} • {vendor.serviceLevel}</p>
                       </div>
                    </div>
                    
                    {vendor.status === 'pending' ? (
                       <div className="flex gap-2">
                          <button 
                            onClick={() => handleVendorAction(vendor._id, 'approve')}
                            className="p-2 bg-emerald-50 text-emerald-500 rounded-xl active:scale-90 transition-all font-bold text-xs flex items-center gap-1"
                          >
                             <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleVendorAction(vendor._id, 'reject')}
                            className="p-2 bg-red-50 text-red-500 rounded-xl active:scale-90 transition-all font-bold text-xs flex items-center gap-1"
                          >
                             <XCircle size={18} />
                          </button>
                       </div>
                    ) : (
                       <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${vendor.status === 'active' || vendor.status === 'approved' ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-400'}`}>
                          {vendor.status}
                       </span>
                    )}
                 </div>
               ))}
               {data.recentVendors.length === 0 && <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest">No pending requests</div>}
            </div>
         </div>

         {/* RECENT USERS */}
         <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-xl font-black dark:text-white tracking-tight italic">Platform Users 👥</h2>
               <button className="text-[10px] font-black text-primary uppercase tracking-widest">Manage All</button>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-50 dark:border-gray-800 shadow-sm overflow-hidden text-sm">
               {data.recentUsers.map((user) => (
                 <div key={user._id} className="p-5 border-b border-gray-50 dark:border-gray-800 last:border-0 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-black dark:text-white">
                       <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                          <Users size={20} />
                       </div>
                       <div>
                          <p>{user.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{user.phone}</p>
                       </div>
                    </div>
                    <button className="p-2 text-gray-300 hover:text-primary transition-colors">
                       <ChevronRight size={18} />
                    </button>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* ⭐ REVIEWS MODERATION */}
      <section className="space-y-4">
         <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black dark:text-white tracking-tight italic">Quality Control 🛡️</h2>
            <button className="text-[10px] font-black text-primary uppercase tracking-widest">Full Audit</button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.recentReviews.map((review) => (
              <div key={review._id} className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-50 dark:border-gray-800 shadow-sm space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex gap-0.5 text-amber-500">
                       {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />)}
                    </div>
                    <span className="text-[8px] font-black text-gray-400 uppercase font-bold tracking-widest">{review.vendorId?.shopName}</span>
                 </div>
                 <p className="text-xs font-medium text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed italic">"{review.comment}"</p>
                 <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                    <span className="text-[10px] font-black dark:text-white uppercase">{review.userId?.name}</span>
                    <button className="text-[8px] font-black text-red-500 uppercase hover:underline">Block User</button>
                 </div>
              </div>
            ))}
            {data.recentReviews.length === 0 && <div className="lg:col-span-3 py-16 text-center text-gray-400 font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">Clean sheet! No reviews yet.</div>}
         </div>
      </section>

    </div>
  );
};

// Utility function for conditional classes
const cn = (...classes) => classes.filter(Boolean).join(' ');

export default AdminDashboard;
