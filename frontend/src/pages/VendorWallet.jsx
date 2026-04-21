import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Crown,
  Eye,
  History,
  IndianRupee,
  MousePointerClick,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import dayjs from 'dayjs';
import api from '../services/api';
import toast from 'react-hot-toast';

const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const loadRazorpayScript = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const existing = document.querySelector('script[data-razorpay-checkout="true"]');
  if (existing) {
    existing.addEventListener('load', () => resolve(true), { once: true });
    existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.dataset.razorpayCheckout = 'true';
  script.onload = () => resolve(true);
  script.onerror = () => reject(new Error('Failed to load Razorpay'));
  document.body.appendChild(script);
});

const prettifyLabel = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const WALLET_HISTORY_CATEGORIES = new Set([
  'wallet_topup',
  'admin_topup',
  'daily_subscription',
  'monthly_subscription'
]);

const VendorWallet = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, walletRes, transactionsRes] = await Promise.all([
        api.get('/vendor/dashboard'),
        api.get('/vendor/wallet/overview'),
        api.get('/vendor/transactions')
      ]);

      setDashboard(dashboardRes.data);
      setWallet(walletRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTransactions = useMemo(() => {
    const walletOnlyTransactions = transactions.filter((transaction) => (
      WALLET_HISTORY_CATEGORIES.has(transaction.category || '')
    ));

    const now = dayjs();
    const scopedTransactions = (() => {
      switch (filter) {
        case 'today':
          return walletOnlyTransactions.filter((transaction) => dayjs(transaction.timestamp).isSame(now, 'day'));
        case 'week':
          return walletOnlyTransactions.filter((transaction) => {
            const timestamp = dayjs(transaction.timestamp);
            return timestamp.isAfter(now.subtract(7, 'day')) && timestamp.isBefore(now.add(1, 'minute'));
          });
        default:
          return walletOnlyTransactions;
      }
    })();

    return [...scopedTransactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [filter, transactions]);

  const isLowBalance = (wallet?.walletBalance || 0) < (wallet?.minimumWalletThreshold || 0);
  const monthlyPlan = wallet?.plans?.monthly;
  const dailyPlan = wallet?.plans?.daily;
  const canUseRazorpay = Boolean(wallet?.razorpay?.enabled && wallet?.razorpay?.keyId);
  const requiredBalanceToday = wallet?.requiredBalanceToday || ((wallet?.minimumWalletThreshold || 0) + (dailyPlan?.price || 0));
  const shortfallToResume = wallet?.shortfallToResume || Math.max(requiredBalanceToday - (wallet?.walletBalance || 0), 0);
  const recommendedTopup = wallet?.recommendedTopup || (shortfallToResume > 0 ? shortfallToResume : (dailyPlan?.price || 0));
  const needsWalletAction = wallet?.subscription?.currentPlan === 'daily' && shortfallToResume > 0;
  const engagement = dashboard?.engagement || {};

  const startPaymentFlow = async ({ orderResponse, verifyPath, successMessage, description }) => {
    try {
      if (!canUseRazorpay) {
        setSubmitting(false);
        toast.error('Razorpay keys are not configured yet');
        return;
      }

      await loadRazorpayScript();

      const razorpay = new window.Razorpay({
        key: orderResponse.keyId || wallet?.razorpay?.keyId,
        amount: orderResponse.order.amount,
        currency: orderResponse.order.currency,
        name: dashboard?.shopName || 'ZeroOne',
        description,
        order_id: orderResponse.order.id,
        theme: { color: '#111827' },
        handler: async (response) => {
          try {
            setSubmitting(true);
            await api.post(verifyPath, response);
            toast.success(successMessage);
            setIsTopupOpen(false);
            setTopupAmount('');
            await fetchData();
          } catch (error) {
            toast.error(error.response?.data?.message || 'Payment verification failed');
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          }
        }
      });

      razorpay.open();
    } catch (error) {
      setSubmitting(false);
      toast.error(error.message || 'Unable to start Razorpay');
    }
  };

  const handleTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid top-up amount');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await api.post('/vendor/wallet/topup/order', { amount });
      await startPaymentFlow({
        orderResponse: data,
        verifyPath: '/vendor/wallet/topup/verify',
        successMessage: 'Wallet recharged successfully',
        description: 'Wallet recharge'
      });
    } catch (error) {
      setSubmitting(false);
      toast.error(error.response?.data?.message || 'Unable to create top-up order');
    }
  };

  const handleMonthlyPurchase = async () => {
    try {
      setSubmitting(true);
      const { data } = await api.post('/vendor/wallet/subscription/order');
      await startPaymentFlow({
        orderResponse: data,
        verifyPath: '/vendor/wallet/subscription/verify',
        successMessage: 'Monthly subscription activated',
        description: `${prettifyLabel(wallet?.plans?.serviceLevel || '')} monthly subscription`
      });
    } catch (error) {
      setSubmitting(false);
      toast.error(error.response?.data?.message || 'Unable to start monthly subscription');
    }
  };

  const openRecommendedTopup = () => {
    setTopupAmount(String(Math.max(Math.ceil(recommendedTopup), 1)));
    setIsTopupOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-[3rem]" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4 pt-4">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="px-3 pt-4 pb-2.5 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/vendor/dashboard')}
              className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <h1 className="text-xl font-black tracking-tighter leading-none flex items-center">
                  <span className="text-primary dark:text-white">Zero</span>
                  <span className="text-primary/30 dark:text-gray-600">One</span>
                </h1>

              </div>
              <p className="text-[9px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em] opacity-80 leading-none">Wallet & Finance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
               onClick={fetchData}
               className={`p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 active:rotate-180 transition-all duration-500 ${loading ? 'animate-spin' : ''}`}
            >
               <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setIsTopupOpen(true)}
              className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-[#1C2C4E] to-[#1E293B] dark:from-primary/20 dark:to-primary/10 rounded-[2rem] text-white shadow-2xl shadow-black/10 relative overflow-hidden">
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">Available Balance</p>
              {wallet?.subscription?.isActive ? (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-400/20 text-green-500 rounded-full text-[8px] font-black uppercase border border-green-500/30">
                  <CheckCircle2 size={8} /> Service Live
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-red-400/20 text-red-500 rounded-full text-[8px] font-black uppercase border border-red-500/30">
                  <AlertCircle size={8} /> Recharge Needed
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tighter">
                {moneyFormatter.format(Number(wallet?.walletBalance || 0))}
              </span>
              <span className="text-[9px] font-black uppercase text-white/30 tracking-widest leading-none">
                {prettifyLabel(wallet?.plans?.serviceLevel || 'standard')}
              </span>
            </div>
            <p className="text-[7px] font-bold text-white/30 uppercase leading-relaxed max-w-[220px]">
              Maintain at least {moneyFormatter.format(wallet?.minimumWalletThreshold || 0)} to keep bookings active on daily mode.
            </p>
          </div>
          <Wallet size={80} className="absolute -right-4 -bottom-4 text-white/5 -rotate-12" />
        </div>

        {wallet?.isLowBalanceWarning && wallet?.subscription?.isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 mx-1 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={16} />
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Low Balance Warning</p>
              <p className="text-[10px] font-bold text-amber-500/80 leading-relaxed uppercase tracking-tight">
                Your balance is close to the limit. Add ₹{Math.ceil(wallet.recommendedTopup)} to avoid service pause tomorrow.
              </p>
            </div>
          </motion.div>
        )}
      </header>

      <main className="px-3 mt-3.5 space-y-4">
        <div className="p-3 bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl shadow-md space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <IndianRupee size={16} />
              </div>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Plan Type</p>
                <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase leading-none mt-1">
                  {wallet?.subscription?.currentPlan === 'trial' ? 'Trial Period' : 
                   wallet?.subscription?.currentPlan === 'daily' ? 'Daily Plan' : 
                   wallet?.subscription?.currentPlan === 'monthly' ? 'Monthly Plan' : 
                   prettifyLabel(wallet?.subscription?.currentPlan || 'no plan')}
                </h3>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${wallet?.subscription?.isActive ? 'bg-green-50/50 border-green-100 text-green-500' : 'bg-red-50/50 border-red-100 text-red-500'}`}>
              {wallet?.subscription?.isActive ? 'Subscription Active' : 'Recharge Required'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-gray-800">
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Service Level</p>
              <p className="text-[10px] font-black text-primary uppercase">
                {prettifyLabel(wallet?.plans?.serviceLevel || 'standard')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Next Cycle</p>
              <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">
                {wallet?.subscription?.planExpiry
                  ? dayjs(wallet.subscription.planExpiry).format('DD MMM')
                  : wallet?.subscription?.nextDeduction
                    ? dayjs(wallet.subscription.nextDeduction).format('DD MMM')
                    : 'N/A'}
              </p>
            </div>
          </div>

          {isLowBalance && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50/70 dark:bg-red-500/10 rounded-xl border border-red-100/70 dark:border-red-500/20 text-red-500">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p className="text-[8px] font-black uppercase tracking-wider leading-relaxed">
                Wallet is below the minimum live threshold. New bookings will pause until you recharge.
              </p>
            </div>
          )}
        </div>

        {needsWalletAction && (
          <section className="p-3 bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-500/10 dark:to-amber-500/10 border border-red-100/80 dark:border-red-500/20 rounded-xl shadow-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <AlertCircle size={16} />
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-red-500 uppercase tracking-[0.2em]">Action Needed</p>
                <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-relaxed">
                  You need {moneyFormatter.format(shortfallToResume)} more to keep bookings live on daily mode.
                </h3>
                <p className="text-[8px] font-bold text-gray-500 uppercase leading-relaxed">
                  Required balance: {moneyFormatter.format(requiredBalanceToday)}. Top up now or switch to monthly to avoid missed bookings.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={openRecommendedTopup}
                className="h-11 rounded-xl bg-[#1C2C4E] dark:bg-primary text-white font-black text-[8px] uppercase tracking-[0.18em] shadow-lg shadow-[#1C2C4E]/10 active:scale-[0.98] transition-all"
              >
                Top Up {moneyFormatter.format(recommendedTopup)}
              </button>
              <button
                onClick={handleMonthlyPurchase}
                disabled={submitting || !canUseRazorpay}
                className={`h-11 rounded-xl font-black text-[8px] uppercase tracking-[0.18em] transition-all ${submitting || !canUseRazorpay ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-slate-200/70 dark:border-gray-700 shadow-sm active:scale-[0.98]'}`}
              >
                Buy Monthly
              </button>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between px-1 mb-2.5">
            <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Performance Insights</h2>
            <TrendingUp size={12} className="text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Today', value: dashboard?.stats?.todayEarnings, color: 'text-primary' },
              { label: '7 Days', value: dashboard?.stats?.weekEarnings, color: 'text-purple-500' },
              { label: 'Total', value: dashboard?.stats?.totalEarnings, color: 'text-green-500' }
            ].map((stat) => (
              <div key={stat.label} className="p-1.5 bg-white dark:bg-gray-900 rounded-lg border border-slate-200/60 dark:border-gray-800 shadow-sm text-center space-y-0 text-clip overflow-hidden">
                <p className="text-[6.5px] font-black text-gray-400 uppercase tracking-tighter leading-none">{stat.label}</p>
                <p className={`text-[10px] font-black ${stat.color} leading-none mt-1 truncate`}>
                  {moneyFormatter.format(Math.floor(stat.value || 0))}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 mt-2">
            {[
              { label: 'Seen', value: engagement.profileViews || 0, color: 'text-sky-500', icon: Eye },
              { label: 'Opened', value: engagement.serviceClicks || 0, color: 'text-amber-500', icon: MousePointerClick },
              { label: 'At Risk', value: engagement.customerLoss || 0, color: 'text-red-500', icon: AlertCircle }
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="p-1.5 bg-white dark:bg-gray-900 rounded-lg border border-slate-200/60 dark:border-gray-800 shadow-sm text-center space-y-0 text-clip overflow-hidden">
                  <div className="flex items-center justify-center gap-1">
                    <Icon size={10} className={stat.color} />
                    <p className="text-[6.5px] font-black text-gray-400 uppercase tracking-tighter leading-none">{stat.label}</p>
                  </div>
                  <p className={`text-[10px] font-black ${stat.color} leading-none mt-1 truncate`}>
                    {Number(stat.value || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="px-1 mt-2 text-[7px] font-bold text-gray-400 uppercase tracking-wider leading-relaxed">
            Seen = profile shown nearby, Opened = service detail visits, At Risk = reach lost while your service is paused.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={12} /> Billing Controls
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Daily Plan</p>
                  <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase mt-1">
                    {moneyFormatter.format(dailyPlan?.price || 0)} / day
                  </h3>
                  {dailyPlan?.gstPercent > 0 && (
                    <p className="text-[7.5px] font-bold text-amber-500 uppercase mt-1 tracking-widest">Includes {dailyPlan.gstPercent}% GST</p>
                  )}
                </div>
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet size={16} />
                </div>
              </div>
              <p className="text-[8px] font-bold text-gray-500 uppercase leading-relaxed">
                Daily auto-deduction follows the admin-set price for your category. Keep the minimum wallet threshold available to stay discoverable.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Minimum live wallet</p>
                <p className="text-[10px] font-black text-red-500 uppercase mt-1">
                  {moneyFormatter.format(wallet?.minimumWalletThreshold || 0)}
                </p>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Monthly Plan</p>
                  <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase mt-1">
                    {moneyFormatter.format(monthlyPlan?.price || 0)} / 30 days
                  </h3>
                  {monthlyPlan?.gstPercent > 0 && (
                    <p className="text-[7.5px] font-bold text-amber-500 uppercase mt-1 tracking-widest">Includes {monthlyPlan.gstPercent}% GST</p>
                  )}
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Crown size={16} />
                </div>
              </div>
              <p className="text-[8px] font-bold text-gray-500 uppercase leading-relaxed">
                Buy monthly access to keep your service live without daily wallet deductions until the plan expires.
              </p>
              <button
                onClick={handleMonthlyPurchase}
                disabled={submitting || !canUseRazorpay}
                className={`w-full h-10 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all ${submitting || !canUseRazorpay ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#1C2C4E] dark:bg-primary text-white shadow-lg shadow-[#1C2C4E]/10 active:scale-[0.98]'}`}
              >
                {wallet?.subscription?.currentPlan === 'monthly' ? 'Renew Monthly' : 'Buy Monthly'}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <History size={12} /> Recent History
            </h2>
            <div className="flex bg-slate-50 dark:bg-gray-800 p-0.5 rounded-lg border border-slate-100 dark:border-gray-700">
              {['today', 'week', 'all'].map((scope) => (
                <button
                  key={scope}
                  onClick={() => setFilter(scope)}
                  className={`px-2.5 py-1 text-[7.5px] font-black uppercase rounded-md transition-all ${filter === scope
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-slate-100 dark:border-gray-600'
                    : 'text-gray-400'
                    }`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {filteredTransactions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-10 text-center bg-slate-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800"
                >
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">No transactions found</p>
                </motion.div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <motion.div
                    key={transaction._id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 flex items-center justify-between group min-h-12 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${transaction.type === 'credit'
                        ? 'bg-green-50 dark:bg-green-500/10 text-green-500'
                        : 'bg-red-50 dark:bg-red-500/10 text-red-500'
                        }`}>
                        {transaction.type === 'credit' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-900 dark:text-white uppercase truncate max-w-[150px]">
                          {prettifyLabel(transaction.category || transaction.reason || 'Transaction')}
                        </p>
                        <p className="text-[7.5px] font-bold text-gray-400 leading-none mb-1">
                          {transaction.description || 'System transaction'}
                        </p>
                        <p className="text-[7px] font-bold text-gray-400">
                          {dayjs(transaction.timestamp).format('DD MMM, hh:mm A')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-black ${transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.type === 'credit' ? '+' : '-'}{moneyFormatter.format(Math.floor(transaction.amount || 0))}
                      </p>
                      <p className={`text-[7px] font-bold uppercase tracking-widest ${transaction.status === 'completed' ? 'text-green-500' : transaction.status === 'pending' ? 'text-amber-500' : 'text-red-500'}`}>
                        {transaction.status}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {isTopupOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTopupOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-x-3 bottom-6 z-[110] max-w-md mx-auto p-4 bg-white dark:bg-gray-950 rounded-3xl border border-slate-200/60 dark:border-gray-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Wallet Top-up</p>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight mt-1">Add funds</h3>
                </div>
                <button
                  onClick={() => setIsTopupOpen(false)}
                  className="p-2 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800"
                >
                  <ArrowLeft size={14} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Top-up amount</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">
                    {moneyFormatter.formatToParts(1).find((part) => part.type === 'currency')?.value || 'Rs'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={topupAmount}
                    onChange={(event) => setTopupAmount(event.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl text-[14px] font-black text-slate-900 dark:text-white outline-none focus:ring-2 ring-primary/20"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Minimum live threshold</p>
                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase mt-1">
                  {moneyFormatter.format(wallet?.minimumWalletThreshold || 0)}
                </p>
              </div>

              <button
                onClick={handleTopup}
                disabled={submitting || !canUseRazorpay}
                className={`w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${submitting || !canUseRazorpay ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#1C2C4E] dark:bg-primary text-white shadow-lg shadow-[#1C2C4E]/10 active:scale-[0.98]'}`}
              >
                {canUseRazorpay ? (submitting ? 'Processing...' : 'Continue with Razorpay') : 'Awaiting Razorpay Setup'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorWallet;
