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
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
       </div>
       <div className="space-y-4 pt-4">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
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
       <header className="px-6 pt-8 pb-10 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/vendor/dashboard')}
                  className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 active:scale-90 transition-all"
                >
                   <ArrowLeft size={18} />
                </button>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Wallet</h1>
             </div>
             <button 
                onClick={() => toast.success('Top-up feature coming soon!')}
                className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
             >
                <Plus size={20} />
             </button>
          </div>

          <div className="p-6 bg-gradient-to-br from-gray-900 to-black dark:from-primary/20 dark:to-primary/10 rounded-[3rem] text-white shadow-2xl shadow-black/10 relative overflow-hidden">
             <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Available Balance</p>
                   {isLowBalance ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-[8px] font-black uppercase border border-red-500/30">
                         <AlertCircle size={10} /> Low Balance
                      </div>
                   ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-[8px] font-black uppercase border border-green-500/30">
                         <CheckCircle2 size={10} /> Account Active
                      </div>
                   )}
                </div>
                <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black tracking-tighter">₹{Number(data?.walletBalance || 0).toFixed(2)}</span>
                    {data?.subscription?.isActive && (
                      <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                         ({data.subscription.currentPlan} • {data.subscription.serviceLevel})
                      </span>
                    )}
                </div>
                <div className="pt-2">
                    <p className="text-[10px] font-bold text-white/40 uppercase leading-relaxed"> Minimum ₹100 required to keep shop active in search results. </p>
                    {data?.subscription?.nextDeduction && (
                       <div className="flex items-center gap-2 text-[8px] font-black text-primary uppercase bg-primary/10 w-fit px-3 py-1.5 rounded-xl border border-primary/20">
                          <Clock size={10} /> Next Deduction: {dayjs(data.subscription.nextDeduction).format('DD MMM, hh:mm A')}
                       </div>
                    )}
                </div>
             </div>
             <Wallet size={120} className="absolute -right-8 -bottom-8 text-white/5 -rotate-12" />
          </div>
       </header>

       <main className="px-6 mt-8 space-y-8">
          {/* EARNINGS STATS */}
          <section>
             <div className="flex items-center justify-between px-1 mb-4">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance Insights</h2>
                <TrendingUp size={14} className="text-gray-400" />
             </div>
             <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Today', value: data?.stats?.todayEarnings, color: 'text-primary' },
                  { label: '7 Days', value: data?.stats?.weekEarnings, color: 'text-purple-500' },
                  { label: 'Total', value: data?.stats?.totalEarnings, color: 'text-green-500' }
                ].map((stat, i) => (
                   <div key={i} className="p-4 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm text-center space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">{stat.label}</p>
                      <p className={`text-sm font-black ${stat.color}`}>₹{stat.value || 0}</p>
                   </div>
                ))}
             </div>
          </section>

          {/* TRANSACTION HISTORY */}
          <section className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <History size={12} /> Transaction History
                </h2>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                   {['today', 'week', 'all'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${
                          filter === t 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-400'
                        }`}
                      >
                         {t}
                      </button>
                   ))}
                </div>
             </div>

             <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                   {sortedTransactions.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-12 text-center"
                      >
                         <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No transactions yet 💸</p>
                      </motion.div>
                   ) : (
                      sortedTransactions.map((t) => (
                         <motion.div 
                           key={t._id}
                           layout
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group h-16"
                         >
                            <div className="flex items-center gap-4">
                               <div className={`p-2.5 rounded-xl ${
                                 t.type === 'credit' 
                                 ? 'bg-green-500/10 text-green-500' 
                                 : 'bg-red-500/10 text-red-500'
                               }`}>
                                  {t.type === 'credit' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                               </div>
                               <div>
                                  <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[120px]">{t.reason || 'Transaction'}</p>
                                  <p className="text-[8px] font-bold text-gray-400">{dayjs(t.timestamp).format('DD MMM, hh:mm A')}</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className={`text-xs font-black ${
                                 t.type === 'credit' ? 'text-green-500' : 'text-red-500'
                               }`}>
                                  {t.type === 'credit' ? '+' : '-'}₹{Number(t.amount || 0).toFixed(2)}
                               </p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">SUCCESS</p>
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
