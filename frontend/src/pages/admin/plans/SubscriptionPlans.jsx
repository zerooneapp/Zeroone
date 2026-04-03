import React, { useState, useEffect } from 'react';
import {
  CreditCard, ShieldCheck, Zap, Crown,
  Save, RefreshCw, AlertCircle, Info,
  TrendingDown, TrendingUp, HandCoins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/plans');
      setPlans(res.data);
    } catch (err) {
      toast.error('Failed to load pricing engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handlePriceChange = (id, newPrice) => {
    setPlans(prev => prev.map(p => p._id === id ? { ...p, price: Number(newPrice) } : p));
  };

  const handleSave = async (level) => {
    const levelPlans = plans.filter(p => p.level === level);

    // Validation
    const invalidPlan = levelPlans.find(p => p.price <= 0);
    if (invalidPlan) {
      toast.error(`Pricing Error: ${level.toUpperCase()} ${invalidPlan.type} price must be greater than 0`);
      return;
    }

    setSavingId(level);

    try {
      await Promise.all(levelPlans.map(p =>
        api.patch(`/admin/plans/${p._id}`, { price: p.price })
      ));
      toast.success(`${level.toUpperCase()} Pricing Updated 💰`);
    } catch (err) {
      toast.error(`Failed to update ${level} plans`);
      fetchPlans(); // Reset
    } finally {
      setSavingId(null);
    }
  };

  const getPlanByLevelInfo = (level) => {
    const daily = plans.find(p => p.level === level && p.type === 'daily');
    const monthly = plans.find(p => p.level === level && p.type === 'monthly');
    return { daily, monthly };
  };

  return (
    <div className="space-y-3 pb-4 animate-in fade-in duration-500 h-full flex flex-col justify-between">

      {/* 💰 COMPACT HEADER */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black dark:text-white tracking-tight text-primary">Pricing Hub 💰</h1>
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Platform Subscription Yields</p>
        </div>
        <div className="hidden sm:flex bg-gray-50 dark:bg-gray-800/40 p-2 px-4 rounded-xl border border-gray-100 dark:border-gray-800 items-center gap-2">
          <Info size={12} className="text-primary" />
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-tight leading-none">
            Dynamic pricing engine active.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <div key={i} className="h-96 bg-gray-50 animate-pulse rounded-[3rem]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
          <PlanCard
            level="Standard"
            icon={ShieldCheck}
            color="emerald"
            planData={getPlanByLevelInfo('basic')}
            onPriceChange={handlePriceChange}
            onSave={() => handleSave('basic')}
            isSaving={savingId === 'basic'}
          />
          <PlanCard
            level="Premium"
            icon={Zap}
            color="blue"
            planData={getPlanByLevelInfo('standard')}
            onPriceChange={handlePriceChange}
            onSave={() => handleSave('standard')}
            isSaving={savingId === 'standard'}
          />
          <PlanCard
            level="Luxury"
            icon={Crown}
            color="amber"
            planData={getPlanByLevelInfo('premium')}
            onPriceChange={handlePriceChange}
            onSave={() => handleSave('premium')}
            isSaving={savingId === 'premium'}
          />
        </div>
      )}

      {/* 📊 ANALYTICS HINT */}
      <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-[1.5rem] border border-primary/10 flex items-center justify-between gap-4 border-dashed">
        <div className="space-y-1">
          <h2 className="text-[10px] font-black text-primary uppercase tracking-tighter leading-none">Yield Strategy</h2>
          <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none">
            Standard, Premium, and Luxury configurations active.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center text-primary shadow-sm border border-primary/5">
            <TrendingUp size={14} />
          </div>
          <div className="w-8 h-8 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center text-primary shadow-sm border border-primary/5">
            <HandCoins size={14} />
          </div>
        </div>
      </div>

    </div>
  );
};

const PlanCard = ({ level, icon: Icon, color, planData, onPriceChange, onSave, isSaving }) => {
  const colors = {
    emerald: "text-emerald-500 bg-emerald-50 border-emerald-100",
    blue: "text-blue-500 bg-blue-50 border-blue-100",
    amber: "text-amber-500 bg-amber-50 border-amber-100"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-3 relative overflow-hidden"
    >
      <div className={cn("p-2 w-8 h-8 rounded-lg flex items-center justify-center border", colors[color])}>
        <Icon size={16} />
      </div>

      <div>
        <h3 className="text-sm font-black dark:text-white uppercase tracking-tighter leading-tight">{level}</h3>
        <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">Pricing Layer</p>
      </div>

      <div className="space-y-3">
        {/* DAILY PLAN */}
        <div className="space-y-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Daily Rate</span>
            <span className="text-[7px] font-black text-primary uppercase">Active Day</span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-xs">₹</span>
            <input
              type="number"
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl text-sm font-black dark:text-white focus:ring-1 ring-primary/20 outline-none transition-all appearance-none"
              value={planData.daily?.price || 0}
              onChange={(e) => onPriceChange(planData.daily?._id, e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {/* MONTHLY PLAN */}
        <div className="space-y-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Monthly Rate</span>
            <span className="text-[7px] font-black text-gray-300 uppercase">30 Days</span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-xs">₹</span>
            <input
              type="number"
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl text-sm font-black dark:text-white focus:ring-1 ring-primary/20 outline-none transition-all appearance-none"
              value={planData.monthly?.price || 0}
              onChange={(e) => onPriceChange(planData.monthly?._id, e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className={cn(
          "w-full py-2 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2",
          isSaving ? "bg-gray-100 text-gray-400" : "bg-primary text-white shadow-md shadow-primary/10 active:scale-95 group"
        )}
      >
        {isSaving ? <RefreshCw className="animate-spin" size={12} /> : <Save size={12} className="group-hover:translate-y-[-1px] transition-transform" />}
        {isSaving ? "Syncing..." : "Update Tier"}
      </button>
    </motion.div>
  );
};

export default SubscriptionPlans;
