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
  Wallet,
  Clock,
  Check,
  X,
  CreditCard
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import dayjs from 'dayjs';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useVendorStore } from '../store/vendorStore';

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
  'monthly_subscription',
  'promotion_refund',
  'wallet_withdrawal'
]);

import WithdrawModal from '../components/WithdrawModal';

const VendorWallet = () => {
  const navigate = useNavigate();
  const {
    walletData: wallet,
    transactionsData: transactions,
    withdrawalsData: withdrawalRequests,
    walletLoading: loading,
    dashboardData: dashboard,
    fetchWallet,
    setWalletData: setWallet
  } = useVendorStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState('today');
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' or 'payouts'
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async (background = false) => {
    try {
      await fetchWallet(background);
    } catch (error) {
      toast.error('Failed to load wallet data');
    }
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      const [walletRes, transactionsRes, withdrawalsRes] = await Promise.all([
        api.get('/vendor/wallet/overview'),
        api.get('/vendor/transactions'),
        api.get('/vendor/wallet/withdrawals')
      ]);
      useVendorStore.setState({
        walletData: walletRes.data,
        transactionsData: transactionsRes.data,
        withdrawalsData: withdrawalsRes.data
      });
    } catch (err) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTransactions = useMemo(() => {
    const walletOnlyTransactions = transactions.filter((transaction) => {
      const isCategoryValid = WALLET_HISTORY_CATEGORIES.has(transaction.category || '');
      // Hide pending topups or subscriptions as they indicate incomplete payments
      const isNotNoisyPending = !(
        transaction.status === 'pending' && 
        ['wallet_topup', 'monthly_subscription', 'daily_subscription'].includes(transaction.category)
      );
      return isCategoryValid && isNotNoisyPending;
    });

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

  const isLowBalance = useMemo(() => wallet?.subscription?.currentPlan !== 'trial' && (wallet?.walletBalance || 0) < (wallet?.minimumWalletThreshold || 0), [wallet]);
  const monthlyPlan = useMemo(() => wallet?.plans?.monthly, [wallet]);
  const dailyPlan = useMemo(() => wallet?.plans?.daily, [wallet]);
  const canUseRazorpay = useMemo(() => Boolean(wallet?.razorpay?.enabled && wallet?.razorpay?.keyId), [wallet]);
  const requiredBalanceToday = useMemo(() => wallet?.requiredBalanceToday || ((wallet?.minimumWalletThreshold || 0) + (dailyPlan?.price || 0)), [wallet, dailyPlan]);
  const shortfallToResume = useMemo(() => wallet?.shortfallToResume || Math.max(requiredBalanceToday - (wallet?.walletBalance || 0), 0), [wallet, requiredBalanceToday]);
  const recommendedTopup = useMemo(() => wallet?.recommendedTopup || (shortfallToResume > 0 ? shortfallToResume : (dailyPlan?.price || 0)), [wallet, shortfallToResume, dailyPlan]);
  const needsWalletAction = useMemo(() => wallet?.subscription?.currentPlan === 'daily' && shortfallToResume > 0, [wallet, shortfallToResume]);
  const engagement = useMemo(() => dashboard?.engagement || {}, [dashboard]);

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
            toast.error('Payment cancelled or failed');
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
      <div className="p-6 space-y-6 pt-[64px] animate-pulse">
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
      <header className="px-3 pt-[40px] pb-2.5 fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
        <div className="flex items-center justify-between">
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
                  <span className="text-[#00246b] dark:text-white">Zero</span>
                  <span className="text-[#00246b]/30 dark:text-white">One</span>
                </h1>
              </div>
              <p className="text-[9px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em] opacity-80 leading-none">Wallet & Finance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
               type="button"
               onClick={refreshAll}
               className={`p-2.5 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full active:scale-95 transition-all duration-300 ${isRefreshing ? 'text-[#00246b]' : ''}`}
            >
               <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsTopupOpen(true)}
              className="p-2.5 bg-[#00246b] text-white rounded-xl shadow-lg shadow-[#00246b]/20 active:scale-95 transition-all"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="p-2.5 bg-white dark:bg-gray-800 text-[#00246b] dark:text-white rounded-xl shadow-md border border-slate-200 dark:border-gray-700 active:scale-95 transition-all"
              title="Withdraw Funds"
            >
              <ArrowDownLeft size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="px-3 pt-[94px] space-y-4">
        <div className="p-4 bg-gradient-to-br from-[#00246b] to-[#1E293B] dark:from-primary/20 dark:to-primary/10 rounded-[2rem] text-white shadow-2xl shadow-black/10 relative overflow-hidden">
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">Available Balance</p>
              {wallet?.subscription?.isActive ? (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-400/20 dark:bg-emerald-500/20 text-green-500 dark:text-emerald-400 rounded-full text-[8px] font-black uppercase border border-green-500/30 dark:border-emerald-500/30">
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
              {wallet?.subscription?.currentPlan === 'trial' 
                ? `You are on free trial. Maintain ${moneyFormatter.format(wallet?.minimumWalletThreshold || 0)} balance after trial ends to stay live.`
                : `Maintain at least ${moneyFormatter.format(wallet?.minimumWalletThreshold || 0)} to keep bookings active on daily mode.`}
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

        <div className="p-3 bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl shadow-md space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#00246b]/10 rounded-lg flex items-center justify-center text-[#00246b] dark:text-white">
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
            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${wallet?.subscription?.isActive ? 'bg-green-50/50 dark:bg-emerald-500/20 border-green-100 dark:border-emerald-500/30 text-green-600 dark:text-emerald-400' : 'bg-red-50/50 dark:bg-red-500/20 border-red-100 dark:border-red-500/30 text-red-500 dark:text-red-400'}`}>
              {wallet?.subscription?.isActive ? 'Subscription Active' : 'Recharge Required'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-gray-800">
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Service Level</p>
              <p className="text-[10px] font-black text-[#00246b] dark:text-white uppercase">
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
                className="h-11 rounded-xl bg-[#00246b] text-white font-black text-[8px] uppercase tracking-[0.18em] shadow-lg shadow-[#00246b]/10 active:scale-[0.98] transition-all"
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

        {/* 📊 PERFORMANCE INSIGHTS */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={12} /> Performance Insights
            </h2>
            <TrendingUp size={12} className="text-slate-300" />
          </div>
          
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 py-1 px-2 rounded-xl shadow-sm text-center">
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">Today</p>
              <p className="text-[11px] font-black text-gray-900 dark:text-white mt-0.5">
                {moneyFormatter.format(dashboard?.stats?.todayEarnings || 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 py-1 px-2 rounded-xl shadow-sm text-center">
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">7 Days</p>
              <p className="text-[11px] font-black text-[#00246b] dark:text-white mt-0.5">
                {moneyFormatter.format(dashboard?.stats?.weekEarnings || 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 py-1 px-2 rounded-xl shadow-sm text-center">
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">Total</p>
              <p className="text-[11px] font-black text-green-500 mt-0.5">
                {moneyFormatter.format(dashboard?.stats?.totalEarnings || 0)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 py-1 px-2 rounded-xl shadow-sm text-center">
              <div className="flex items-center justify-center gap-1 text-sky-500 mb-0.5">
                <Eye size={8} />
                <p className="text-[7px] font-black uppercase">Seen</p>
              </div>
              <p className="text-xs font-black text-gray-900 dark:text-white">
                {engagement.profileViews || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 py-1 px-2 rounded-xl shadow-sm text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                <TrendingUp size={8} />
                <p className="text-[7px] font-black uppercase">Opened</p>
              </div>
              <p className="text-xs font-black text-gray-900 dark:text-white">
                {engagement.serviceClicks || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 py-1 px-2 rounded-xl shadow-sm text-center">
              <div className="flex items-center justify-center gap-1 text-rose-500 mb-0.5">
                <AlertCircle size={8} />
                <p className="text-[7px] font-black uppercase">At Risk</p>
              </div>
              <p className="text-xs font-black text-gray-900 dark:text-white">
                {engagement.customerLoss || 0}
              </p>
            </div>
          </div>
          <p className="px-1 text-[7px] font-bold text-gray-400 uppercase leading-tight tracking-tight">
            Seen = Profile shown nearby, Opened = Service detail visits, At risk = Reach lost while your service is paused.
          </p>
        </section>

        {/* 📋 BILLING CONTROLS */}
        <section className="space-y-3">
          <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
            <Calendar size={12} /> Billing Controls
          </h2>
          
          <div className="space-y-2.5">
            {/* DAILY PLAN CARD */}
            <div className="p-2.5 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl shadow-sm relative overflow-hidden group">
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-0.5">
                  <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">Daily Plan</p>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    {moneyFormatter.format(dailyPlan?.basePrice || dailyPlan?.price || 0)} <span className="text-[8px] text-gray-400 font-bold">/ DAY</span>
                  </h3>
                  <p className="text-[7px] font-bold text-gray-500 uppercase leading-tight max-w-[220px] opacity-80">
                    Daily auto-deduction based on category. Keep threshold balance to stay live.
                  </p>
                </div>
                <div className="w-8 h-8 bg-slate-50 dark:bg-gray-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-[#00246b]/5 group-hover:text-[#00246b] transition-all">
                  <Wallet size={14} />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-50 dark:border-gray-800/60 flex items-center justify-between">
                <div>
                  <p className="text-[6.5px] font-black text-gray-400 uppercase tracking-widest leading-none">Min Live Wallet</p>
                  <p className="text-xs font-black text-rose-500 mt-0.5">
                    {moneyFormatter.format(wallet?.minimumWalletThreshold || 0)}
                  </p>
                </div>
                {wallet?.subscription?.currentPlan === 'daily' && (
                  <span className="px-2 py-0.5 bg-[#00246b]/10 text-[#00246b] dark:text-white rounded-md text-[6.5px] font-black uppercase">Active Plan</span>
                )}
              </div>
            </div>

            {/* MONTHLY PLAN CARD */}
            <div className="p-2.5 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl shadow-sm relative overflow-hidden group">
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-0.5">
                  <p className="text-[7px] font-black text-[#00246b] dark:text-white uppercase tracking-[0.2em]">Monthly Plan (30 Days)</p>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    {moneyFormatter.format(monthlyPlan?.basePrice || monthlyPlan?.price || 0)} <span className="text-[8px] text-gray-400 font-bold">/ 30 DAYS</span>
                  </h3>
                  <p className="text-[7px] font-bold text-gray-500 uppercase leading-tight max-w-[220px] opacity-80">
                    Cycle Retainer covers all platform fees. No daily wallet deductions while active.
                  </p>
                </div>
                <div className="w-8 h-8 bg-[#00246b]/5 rounded-lg flex items-center justify-center text-[#00246b] group-hover:bg-[#00246b] group-hover:text-white transition-all">
                  <Crown size={14} />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-50 dark:border-gray-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   {(wallet?.subscription?.currentPlan === 'monthly' || wallet?.subscription?.currentPlan === 'trial') && wallet?.subscription?.isActive ? (
                     <div className="flex items-center gap-1.5 text-green-500">
                        <CheckCircle2 size={10} />
                        <span className="text-[7.5px] font-black uppercase leading-none">{wallet?.subscription?.currentPlan === 'trial' ? 'Trial Active' : 'Monthly Active'}</span>
                     </div>
                   ) : (
                     <button
                       onClick={handleMonthlyPurchase}
                       disabled={submitting || !canUseRazorpay}
                       className="px-2.5 py-1 bg-[#00246b] text-white rounded-lg text-[7px] font-black uppercase tracking-widest shadow-lg shadow-[#00246b]/20 active:scale-95 transition-all"
                     >
                       {submitting ? 'Processing...' : 'Buy Monthly Plan'}
                     </button>
                   )}
                </div>
                <p className="text-[6.5px] font-black text-gray-400 uppercase tracking-widest text-right leading-none">
                  Tax Incl: {moneyFormatter.format(monthlyPlan?.price || 0)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 px-1">
            <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <History size={12} /> Wallet Records
            </h2>
            <div className="flex p-1 bg-slate-100 dark:bg-gray-950 rounded-xl gap-1">
              <button 
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${activeTab === 'transactions' ? 'bg-[#00246b] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Transactions
              </button>
              <button 
                onClick={() => setActiveTab('payouts')}
                className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${activeTab === 'payouts' ? 'bg-[#00246b] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Payout Requests
              </button>
            </div>
          </div>

          {activeTab === 'transactions' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1 mb-1">
                <p className="text-[7.5px] font-black text-slate-400 uppercase">Filters</p>
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
                      className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 flex items-center justify-between group shadow-sm hover:border-[#00246b]/30 transition-colors"
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
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {withdrawalRequests.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-10 text-center bg-slate-50/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800"
                  >
                    <Clock className="mx-auto text-slate-300 mb-2" size={24} />
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">No payout requests yet</p>
                  </motion.div>
                ) : (
                  withdrawalRequests.map((req) => (
                    <motion.div
                      key={req._id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 shadow-sm relative overflow-hidden"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        req.status === 'pending' ? 'bg-amber-400' :
                        req.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-[#00246b] dark:text-white">₹{req.amount.toLocaleString()}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter ${
                              req.status === 'pending' ? 'bg-amber-50 text-amber-500' :
                              req.status === 'approved' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <p className="text-[8px] font-bold text-slate-500 flex items-center gap-1">
                            <CreditCard size={10} /> {req.method === 'upi' ? req.upiDetails?.upiId : req.bankDetails?.bankName}
                          </p>
                          <p className="text-[7px] font-bold text-slate-400">
                            {dayjs(req.createdAt).format('DD MMM YYYY, hh:mm A')}
                          </p>
                        </div>
                        <div className="text-right">
                           <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">{req.referenceId}</p>
                           {req.status === 'rejected' && req.rejectionReason && (
                             <p className="text-[7px] font-bold text-red-500 mt-1 max-w-[100px] leading-tight">
                               Reason: {req.rejectionReason}
                             </p>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00246b] font-black">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={topupAmount}
                    onChange={(event) => setTopupAmount(event.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl text-[14px] font-black text-slate-900 dark:text-white outline-none focus:ring-2 ring-[#00246b]/20"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <button
                onClick={handleTopup}
                disabled={submitting || !canUseRazorpay}
                className={`w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${submitting || !canUseRazorpay ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#00246b] text-white shadow-lg shadow-[#00246b]/20 active:scale-[0.98]'}`}
              >
                {canUseRazorpay ? (submitting ? 'Processing...' : 'Continue with Razorpay') : 'Awaiting Razorpay Setup'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isWithdrawOpen && (
        <WithdrawModal
          isOpen={isWithdrawOpen}
          onClose={() => setIsWithdrawOpen(false)}
          balance={wallet?.walletBalance || 0}
          minWithdrawal={wallet?.minWithdrawalAmount || 100}
          onSuccess={() => {
            toast.success('Withdrawal request submitted!');
            fetchData(true);
            setActiveTab('payouts');
          }}
        />
      )}
    </div>
  );
};

export default VendorWallet;
