import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   Bell, Sun, Moon, Wallet, Power, Calendar,
   TrendingUp, Users, Star, Clock, ChevronRight,
   PlusCircle, LayoutGrid, Tag, MapPin, AlertTriangle, X, TrendingDown,
   Lock, Zap, UserPlus, CalendarPlus, PackagePlus, BarChart3,
   CreditCard, Smartphone, User, BarChart, ShieldCheck,
   Briefcase, Percent, Store, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid,
   Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { useThemeStore } from '../store/themeStore';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import NotificationDrawer from '../components/NotificationDrawer';
import AddWalkInModal from '../components/AddWalkInModal';
import CreateSlotModal from '../components/CreateSlotModal';

const VendorDashboard = () => {
   const navigate = useNavigate();
   const { isDarkMode, toggleTheme } = useThemeStore();
   const [data, setData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
   const [statusLoading, setStatusLoading] = useState(false);
   const [showRetentionModal, setShowRetentionModal] = useState(false);
   const [unreadCount, setUnreadCount] = useState(0);
   const [isWalkInOpen, setIsWalkInOpen] = useState(false);
   const [isCreateSlotOpen, setIsCreateSlotOpen] = useState(false);

   const fetchDashboard = async () => {
      try {
         setLoading(true);
         const [dashRes, unreadRes] = await Promise.all([
            api.get('/vendor/dashboard'),
            api.get('/notifications/unread-count')
         ]);
         setData(dashRes.data);
         setUnreadCount(unreadRes.data.count || 0);
      } catch (err) {
         toast.error('Failed to load dashboard data');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchDashboard();
   }, []);

   useEffect(() => {
      if (data && !data.subscription?.isActive) {
         const lastShown = localStorage.getItem('lastRetentionPopup');
         const now = Date.now();
         const COOLDOWN = 24 * 60 * 60 * 1000;
         if (!lastShown || (now - parseInt(lastShown)) > COOLDOWN) {
            setShowRetentionModal(true);
            localStorage.setItem('lastRetentionPopup', now.toString());
         }
      }
   }, [data]);

   const handleToggleStatus = async () => {
      if (!data.subscription?.isActive) {
         return toast.error('Account Inactive. Recharge to resume 💰', { icon: '🚨' });
      }
      if (statusLoading) return;
      const previousStatus = data.isShopOpen;
      const newStatus = !previousStatus;
      setData(prev => ({ ...prev, isShopOpen: newStatus }));
      try {
         setStatusLoading(true);
         await api.patch('/vendor/shop-status', { isShopOpen: newStatus });
         toast.success(newStatus ? 'Shop is now OPEN' : 'Shop is now CLOSED');
      } catch (err) {
         setData(prev => ({ ...prev, isShopOpen: previousStatus }));
         toast.error('Failed to update status');
      } finally {
         setStatusLoading(false);
      }
   };

   const handleToggleClosedToday = async () => {
      if (!data.subscription?.isActive) return toast.error('Account Inactive');
      if (statusLoading) return;
      const previous = data.isClosedToday;
      const next = !previous;
      setData(prev => ({ ...prev, isClosedToday: next, isShopOpen: next ? false : prev.isShopOpen }));
      try {
         setStatusLoading(true);
         await api.patch('/vendor/shop-status', { isClosedToday: next });
         toast.success(next ? 'Marked as Closed Today' : 'Shop is back Online');
      } catch (err) {
         setData(prev => ({ ...prev, isClosedToday: previous }));
         toast.error('Failed to update status');
      } finally {
         setStatusLoading(false);
      }
   };

   const handleCompleteBooking = async (id) => {
      try {
         await api.patch(`/bookings/${id}/status`, { action: 'complete' });
         toast.success('Booking marked as completed');
         fetchDashboard();
      } catch (err) {
         toast.error('Update failed');
      }
   };

   if (loading || !data) return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-6 space-y-6 pt-24 animate-pulse">
         <div className="flex justify-between items-start h-16 bg-white dark:bg-gray-900 rounded-[2rem]" />
         <div className="h-32 bg-white dark:bg-gray-900 rounded-[2.5rem]" />
         <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-white dark:bg-gray-900 rounded-3xl" />)}
         </div>
      </div>
   );

   return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-40 transition-colors duration-500 overflow-x-hidden">

         {/* 🏙️ PREMIUM HEADER */}
         <header className="fixed top-0 left-0 right-0 z-[100] px-6 py-3 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
            <div className="space-y-0.5">
               <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter leading-none uppercase">
                     {data.shopName?.split(' ')[0] || 'ram'}
                  </h1>
                  <div className="flex items-center gap-1 bg-emerald-500 px-1.5 py-0.5 rounded-full">
                     <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                     <span className="text-[6px] font-black text-white tracking-widest uppercase">Live</span>
                  </div>
               </div>
               <div className="flex items-center gap-1.5 text-slate-400 dark:text-gray-500">
                  <MapPin size={8} strokeWidth={3} />
                  <span className="text-[8px] font-black uppercase tracking-widest">{data.address?.split(',').slice(-1)[0]?.trim().split(' ')[0] || 'INDORE'}</span>
               </div>
            </div>

            <div className="flex items-center gap-2">
               <button onClick={toggleTheme} className="w-9 h-9 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-gray-700 transition-transform active:scale-90">
                  {isDarkMode ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-slate-600" />}
               </button>
               <button onClick={() => setIsNotificationsOpen(true)} className="relative w-9 h-9 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-gray-700 transition-transform active:scale-90">
                  <Bell size={16} className="text-slate-600 dark:text-gray-400" />
                  {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-950 rounded-full" />}
               </button>
               <div className="w-9 h-9 bg-slate-900 dark:bg-primary rounded-xl flex items-center justify-center text-white border border-slate-900 transition-transform active:scale-90 shadow-sm shadow-slate-900/10">
                  <User size={16} />
               </div>
            </div>
         </header>

         <main className="px-5 pt-20 space-y-5">

            {/* 🛡️ ULTRA-COMPACT STATUS & SUBSCRIPTION BAR */}
            <section className="bg-slate-900 dark:bg-gray-900 p-5 rounded-[2.5rem] shadow-xl relative overflow-hidden group border border-white/5">
               <div className="flex items-center justify-between relative z-10 mb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <ShieldCheck size={20} />
                     </div>
                     <div className="space-y-0 text-left">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest opacity-60 leading-none">Subscription Plan</h4>
                        <p className="text-xs font-black text-white uppercase mt-0.5 tracking-tight group-hover:text-primary transition-colors">{(data.subscription?.currentPlan || 'TRIAL').toUpperCase()}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Account Wallet</p>
                     <h3 className="text-lg font-black text-white leading-tight mt-0.5">₹{data.walletBalance.toLocaleString()}</h3>
                  </div>
               </div>

               <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2.5">
                     <div className={`w-2 h-2 rounded-full ${data.isShopOpen && !data.isClosedToday ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                     <h2 className="text-[10px] font-black text-white/90 uppercase tracking-widest">
                        {data.isClosedToday ? 'Currently Closed' : (data.isShopOpen ? 'Online & Available' : 'Shop Offline')}
                     </h2>
                  </div>
                  <div className="flex items-center gap-2">
                     <button
                        onClick={handleToggleStatus}
                        disabled={!data.subscription?.isActive || statusLoading}
                        className={`h-9 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border ${data.isShopOpen && !data.isClosedToday ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                     >
                        <Power size={12} />
                        <span className="text-[8px] font-black uppercase tracking-widest">{data.isShopOpen ? 'Online' : 'Offline'}</span>
                     </button>
                     <button
                        onClick={handleToggleClosedToday}
                        disabled={!data.subscription?.isActive || statusLoading}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-slate-800 border border-slate-700 ${data.isClosedToday ? 'text-amber-500 border-amber-500/50' : 'text-slate-500'}`}
                     >
                        <Calendar size={14} />
                     </button>
                  </div>
               </div>

               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-primary/20 transition-all pointer-events-none" />
            </section>

            {/* 🏃 ACTION TILES */}
            <section className="grid grid-cols-4 gap-2.5 bg-white dark:bg-gray-900 p-2 rounded-[2.2rem] border border-slate-100 dark:border-gray-800/50 shadow-sm">
               {[
                  { label: 'Walk-in', icon: UserPlus, onClick: () => setIsWalkInOpen(true) },
                  { label: 'Create Slot', icon: CalendarPlus, onClick: () => setIsCreateSlotOpen(true) },
                  { label: 'Services', icon: LayoutGrid, path: '/vendor/services' },
                  { label: 'Wallet', icon: Wallet, path: '/vendor/wallet' }
               ].map((action, i) => (
                  <button
                     key={i}
                     onClick={action.onClick || (() => navigate(action.path))}
                     className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-[1.8rem] hover:bg-slate-50 dark:hover:bg-gray-800 transition-all active:scale-95 group"
                  >
                     <div className="p-2.5 bg-slate-50 dark:bg-gray-800/60 rounded-2xl text-slate-400 group-hover:text-primary transition-colors border border-slate-100/10">
                        <action.icon size={16} strokeWidth={2.5} />
                     </div>
                     <span className="text-[8px] font-black uppercase text-slate-400 tracking-tight">{action.label.split(' ')[0]}</span>
                  </button>
               ))}
            </section>

            {/* 📊 METRICS VIEW */}
            <section className="space-y-2.5">
               <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-900 dark:bg-gray-900 p-5 rounded-[2rem] shadow-xl relative overflow-hidden group">
                     <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-4">Today Revenue</p>
                     <div className="flex items-baseline gap-1.5">
                        <h3 className="text-2xl font-black text-white">₹{data.stats.todayEarnings.toLocaleString()}</h3>
                        <TrendingUp size={12} className="text-emerald-500" />
                     </div>
                     <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all pointer-events-none" />
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-5 rounded-[2rem] border border-slate-100 dark:border-gray-800 shadow-sm group overflow-hidden relative">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">Daily Bookings</p>
                     <div className="flex items-baseline gap-1">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{data.stats.todayBookings}</h3>
                        <span className="text-[8px] font-black text-primary uppercase">Orders</span>
                     </div>
                     <Users size={40} className="absolute -bottom-3 -right-3 text-primary/5 group-hover:text-primary/10 transition-all pointer-events-none" />
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-2.5">
                  {[
                     { label: 'Visibility', val: data.engagement.profileViews, icon: Star, color: 'text-amber-500' },
                     { label: 'Interest', val: data.engagement.serviceClicks, icon: Zap, color: 'text-blue-500' },
                     { label: 'Active Staff', val: data.stats.activeStaff || 0, icon: ShieldCheck, color: 'text-emerald-500' }
                  ].map((m, i) => (
                     <div key={i} className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-slate-100 dark:border-gray-800 text-center flex flex-col items-center justify-center gap-1 shadow-sm">
                        <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest leading-none truncate w-full">{m.label}</p>
                        <div className="flex items-center gap-1">
                           <m.icon size={9} className={m.color} />
                           <span className="text-[11px] font-black text-slate-900 dark:text-gray-200">{m.val}</span>
                        </div>
                     </div>
                  ))}
               </div>
            </section>

            {/* 📋 SCHEDULER SECTION */}
            <section className="space-y-3 pt-1">
               <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-widest uppercase">Live Schedule</h2>
                  <button
                     onClick={() => navigate('/vendor/bookings')}
                     className="text-[8px] font-black text-primary uppercase tracking-widest px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10 transition-all active:scale-95"
                  >
                     View All <ChevronRight size={8} className="inline ml-1" />
                  </button>
               </div>

               <div className="space-y-2.5">
                  {data.schedule.length === 0 ? (
                     <div className="py-10 bg-white dark:bg-gray-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-gray-800 flex flex-col items-center gap-2 group">
                        <div className="w-10 h-10 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-slate-200 group-hover:text-primary transition-colors">
                           <Calendar size={18} />
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">No appointments for today</p>
                     </div>
                  ) : (
                     data.schedule.map((item, idx) => (
                        <motion.div key={idx} whileTap={{ scale: 0.98 }} className="bg-white dark:bg-gray-900 p-3.5 rounded-[1.8rem] shadow-sm border border-slate-100 dark:border-gray-800 flex items-center justify-between group">
                           <div className="flex items-center gap-3">
                              <div className="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-gray-800 group-hover:shadow-md transition-all">
                                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.customerName}${idx}`} alt="Avatar" className="w-full h-full object-cover" />
                              </div>
                              <div className="space-y-0">
                                 <h4 className="text-[12px] font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight">{item.customerName}</h4>
                                 <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span className="text-primary">{item.time}</span>
                                    <span className="opacity-20">•</span>
                                    <span className="truncate max-w-[80px]">{item.service}</span>
                                 </div>
                              </div>
                           </div>
                           {item.status === 'confirmed' ? (
                              <button onClick={() => handleCompleteBooking(item.id)} className="px-4 py-2 bg-slate-900 dark:bg-primary text-white rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-90 shadow-lg shadow-slate-900/10 transition-all">
                                 Done
                              </button>
                           ) : (
                              <div className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-500/10">
                                 <ShieldCheck size={10} />
                                 <span className="text-[7px] font-black uppercase">Cleared</span>
                              </div>
                           )}
                        </motion.div>
                     ))
                  )}
               </div>
            </section>

            {/* 🛡️ PILL BUTTONS (MANAGEMENT) */}
            <section className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
               {[
                  { label: 'Staff', icon: Briefcase, path: '/vendor/staff' },
                  { label: 'Offers', icon: Percent, path: '/vendor/offers' },
                  { label: 'Shop Info', icon: Store, path: '/vendor/profile' },
                  { label: 'Settings', icon: Settings, path: '/vendor/profile' }
               ].map((m, i) => (
                  <button
                     key={i}
                     onClick={() => navigate(m.path)}
                     className="flex-shrink-0 flex items-center gap-2 px-5 py-3.5 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-sm"
                  >
                     <m.icon size={12} className="text-primary" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{m.label}</span>
                  </button>
               ))}
            </section>

            {/* 📊 REVENUE ANALYSIS */}
            <section className="space-y-3 pb-8">
               <h2 className="text-sm font-black text-slate-800 dark:text-white px-1 tracking-widest uppercase">Revenue History</h2>
               <div className="bg-white dark:bg-gray-900 p-5 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-sm h-64 w-full relative overflow-hidden group">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={data.revenueHistory || []}>
                        <defs>
                           <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} dy={8} />
                        <YAxis hide domain={[0, 'auto']} />
                        <Tooltip contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '9px', fontWeight: 900 }} />
                        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </section>

         </main>

         {/* 🚨 RETENTION MODAL */}
         <AnimatePresence>
            {showRetentionModal && (
               <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 pb-32">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRetentionModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                  <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[3rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative z-10">
                     <button onClick={() => setShowRetentionModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 dark:bg-gray-800 rounded-xl">
                        <X size={16} />
                     </button>
                     <div className="p-10 space-y-8">
                        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto text-4xl shadow-inner shadow-rose-500/5">🚨</div>
                        <div className="text-center space-y-3">
                           <h2 className="text-2xl font-black tracking-tight dark:text-white leading-tight italic uppercase">Profile Restricted</h2>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-6 opacity-80">
                              Reconnect with customers. Restores slot visibility instantly.
                           </p>
                        </div>
                        <button onClick={() => { setShowRetentionModal(false); navigate('/vendor/wallet'); }} className="w-full py-5 bg-slate-900 dark:bg-primary text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl active:scale-95 shadow-2xl shadow-slate-900/20 dark:shadow-primary/20 transition-all italic">
                           Boost Visibility Now
                        </button>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>

         <NotificationDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
         <AddWalkInModal isOpen={isWalkInOpen} onClose={() => setIsWalkInOpen(false)} onRefresh={fetchDashboard} />
         <CreateSlotModal isOpen={isCreateSlotOpen} onClose={() => setIsCreateSlotOpen(false)} onRefresh={fetchDashboard} />
      </div>
   );
};

export default VendorDashboard;
