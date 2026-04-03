import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   ArrowLeft, Wallet, TrendingUp, Calendar, History,
   ArrowUpRight, ArrowDownLeft, Plus, IndianRupee,
   Filter, ChevronRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const VendorWallet = () => {
   const navigate = useNavigate();
   const [data, setData] = useState(null);
   const [transactions, setTransactions] = useState([]);
   const [loading, setLoading] = useState(true);
   const [filter, setFilter] = useState('today');

   const fetchData = async () => {
      try {
         setLoading(true);
         const [dashRes, transRes] = await Promise.all([
            api.get('/vendor/dashboard'),
            api.get('/vendor/transactions')
         ]);
         setData(dashRes.data);
         setTransactions(transRes.data);
      } catch (err) {
         toast.error('Failed to load financial data');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);

   const getFilteredTransactions = () => {
      const now = dayjs();
      switch (filter) {
         case 'today':
            return transactions.filter(t => dayjs(t.timestamp).isSame(now, 'day'));
         case 'week':
            return transactions.filter(t => {
               const time = dayjs(t.timestamp);
               return time.isAfter(now.subtract(7, 'day')) && time.isBefore(now);
            });
         default:
            return transactions;
      }
   };

   if (loading) return (
      <div className="p-6 space-y-6 animate-pulse">
         <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-[3rem]" />
         <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
         </div>
         <div className="space-y-4 pt-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
         </div>
      </div>
   );

   const isLowBalance = (data?.walletBalance || 0) < 100;
   const filteredTransactions = getFilteredTransactions();
   const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
   );

   return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
         {/* STICKY WALLET HEADER */}
         <header className="px-3 pt-4 pb-2.5 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
               <div className="flex items-center gap-2.5">
                  <button
                     onClick={() => navigate('/vendor/dashboard')}
                     className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
                  >
                     <ArrowLeft size={16} />
                  </button>
                  <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Wallet</h1>
               </div>
               <button
                  onClick={() => toast.success('Top-up feature coming soon!')}
                  className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
               >
                  <Plus size={18} />
               </button>
            </div>

            <div className="p-4 bg-gradient-to-br from-slate-900 to-black dark:from-primary/20 dark:to-primary/10 rounded-[2rem] text-white shadow-2xl shadow-black/10 relative overflow-hidden">
               <div className="relative z-10 space-y-2.5">
                  <div className="flex items-center justify-between">
                     <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">Available Balance</p>
                     {isLowBalance ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-400/20 text-red-500 rounded-full text-[8px] font-black uppercase border border-red-500/30">
                           <AlertCircle size={8} /> Low Balance
                        </div>
                     ) : (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-400/20 text-green-500 rounded-full text-[8px] font-black uppercase border border-green-500/30">
                           <CheckCircle2 size={8} /> Active
                        </div>
                     )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                     <span className="text-3xl font-black tracking-tighter">₹{Number(data?.walletBalance || 0).toFixed(2)}</span>
                     <span className="text-[9px] font-black uppercase text-white/30 tracking-widest leading-none">Standard</span>
                  </div>
                  <p className="text-[7px] font-bold text-white/30 uppercase leading-relaxed max-w-[180px]">Deductions based on service level.</p>
               </div>
               <Wallet size={80} className="absolute -right-4 -bottom-4 text-white/5 -rotate-12" />
            </div>
         </header>

         <main className="px-3 mt-3.5 space-y-4">
            {/* SUBSCRIPTION RELOADED */}
            {data?.subscription && (
               <div className="p-3 bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl shadow-md space-y-2.5">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                           <IndianRupee size={16} />
                        </div>
                        <div>
                           <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pricing Plan</p>
                           <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase leading-none mt-1">{data.subscription.currentPlan} STATUS</h3>
                        </div>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${data.subscription.isActive ? 'bg-green-50/50 border-green-100 text-green-500' : 'bg-red-50/50 border-red-100 text-red-500'}`}>
                        {data.subscription.isActive ? 'SUBSCRIPTION ACTIVE' : 'RECHARGE REQUIRED'}
                     </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-gray-800">
                     <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Service Level</p>
                        <p className="text-[10px] font-black text-primary uppercase">{data.subscription.serviceLevel}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Next Cycle</p>
                        <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">
                           {data.subscription.nextDeduction ? dayjs(data.subscription.nextDeduction).format('DD MMM') : 'N/A'}
                        </p>
                     </div>
                  </div>
               </div>
            )}

            {/* EARNINGS STATS */}
            <section>
               <div className="flex items-center justify-between px-1 mb-2.5">
                  <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Performance Insights</h2>
                  <TrendingUp size={12} className="text-gray-400" />
               </div>
               <div className="grid grid-cols-3 gap-1">
                  {[
                     { label: 'Today', value: data?.stats?.todayEarnings, color: 'text-primary' },
                     { label: '7 Days', value: data?.stats?.weekEarnings, color: 'text-purple-500' },
                     { label: 'Total', value: data?.stats?.totalEarnings, color: 'text-green-500' }
                  ].map((stat, i) => (
                     <div key={i} className="p-1.5 bg-white dark:bg-gray-900 rounded-lg border border-slate-200/60 dark:border-gray-800 shadow-sm text-center space-y-0 text-clip overflow-hidden">
                        <p className="text-[6.5px] font-black text-gray-400 uppercase tracking-tighter leading-none">{stat.label}</p>
                        <p className={`text-[10px] font-black ${stat.color} leading-none mt-1 truncate`}>₹{Math.floor(stat.value || 0)}</p>
                     </div>
                  ))}
               </div>
            </section>

            {/* TRANSACTION HISTORY */}
            <section className="space-y-1.5">
               <div className="flex items-center justify-between px-1">
                  <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                     <History size={12} /> Recent History
                  </h2>
                  <div className="flex bg-slate-50 dark:bg-gray-800 p-0.5 rounded-lg border border-slate-100 dark:border-gray-700">
                     {['today', 'week', 'all'].map(t => (
                        <button
                           key={t}
                           onClick={() => setFilter(t)}
                           className={`px-2.5 py-1 text-[7.5px] font-black uppercase rounded-md transition-all ${filter === t
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-slate-100 dark:border-gray-600'
                              : 'text-gray-400'
                              }`}
                        >
                           {t}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-1">
                  <AnimatePresence mode="popLayout">
                     {sortedTransactions.length === 0 ? (
                        <motion.div
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           className="py-10 text-center bg-slate-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800"
                        >
                           <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">No transactions found 💸</p>
                        </motion.div>
                     ) : (
                        sortedTransactions.map((t) => (
                           <motion.div
                              key={t._id}
                              layout
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-2 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 flex items-center justify-between group h-12 shadow-sm"
                           >
                              <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-lg ${t.type === 'credit'
                                    ? 'bg-green-50 dark:bg-green-500/10 text-green-500'
                                    : 'bg-red-50 dark:bg-red-500/10 text-red-500'
                                    }`}>
                                    {t.type === 'credit' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                 </div>
                                 <div>
                                    <p className="text-[9px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[100px]">{t.reason || 'Transaction'}</p>
                                    <p className="text-[7px] font-bold text-gray-400">{dayjs(t.timestamp).format('DD MMM, hh:mm A')}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className={`text-[10px] font-black ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                    {t.type === 'credit' ? '+' : '-'}₹{Math.floor(t.amount || 0)}
                                 </p>
                                 <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">SUCCESS</p>
                              </div>
                           </motion.div>
                        ))
                     )}
                  </AnimatePresence>
               </div>
            </section>
         </main>
      </div>
   );
};

export default VendorWallet;
