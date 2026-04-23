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

  const handleFieldChange = (id, field, value) => {
    setPlans(prev => prev.map(p => p._id === id ? { ...p, [field]: Number(value) } : p));
  };

  const handleGstChange = (level, value) => {
    setPlans(prev => prev.map(p => p.level === level ? { ...p, gstPercent: Number(value) } : p));
  };

  const handleSave = async (level) => {
    const levelPlans = plans.filter(p => p.level === level);
    const invalidPlan = levelPlans.find(p => p.price <= 0);
    if (invalidPlan) {
      toast.error(`Pricing Error: ${level.toUpperCase()} ${invalidPlan.type} price must be greater than 0`);
      return;
    }

    setSavingId(level);
    try {
      await Promise.all(levelPlans.map(p =>
        api.patch(`/admin/plans/${p._id}`, { price: p.price, gstPercent: p.gstPercent || 0 })
      ));
      toast.success(`${level.toUpperCase()} Pricing & Tax Updated 💰`);
    } catch (err) {
      toast.error(`Failed to update ${level} plans`);
      fetchPlans();
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
    <div className="space-y-5 pb-20 animate-in fade-in duration-500">

      {/* 💰 ELITE PRICING HEADER */}
      <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-primary/20">
        <div className="space-y-1">
          <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tighter capitalize leading-none">Pricing Hub</h1>
          <p className="text-[12px] font-black text-slate-400 capitalize tracking-[0.2em] opacity-60">Platform Subscription Yields</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="h-96 bg-gray-50/50 animate-pulse rounded-2xl border border-slate-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
          <PlanCard
            level="Standard"
            icon={ShieldCheck}
            color="emerald"
            planData={getPlanByLevelInfo('standard')}
            onFieldChange={handleFieldChange}
            onGstChange={(val) => handleGstChange('standard', val)}
            onSave={() => handleSave('standard')}
            isSaving={savingId === 'standard'}
          />
          <PlanCard
            level="Premium"
            icon={Zap}
            color="blue"
            planData={getPlanByLevelInfo('premium')}
            onFieldChange={handleFieldChange}
            onGstChange={(val) => handleGstChange('premium', val)}
            onSave={() => handleSave('premium')}
            isSaving={savingId === 'premium'}
          />
          <PlanCard
            level="Luxury"
            icon={Crown}
            color="amber"
            planData={getPlanByLevelInfo('luxury')}
            onFieldChange={handleFieldChange}
            onGstChange={(val) => handleGstChange('luxury', val)}
            onSave={() => handleSave('luxury')}
            isSaving={savingId === 'luxury'}
          />
        </div>
      )}

      {/* 📊 YIELD STRATEGY HUD */}
      <div className="p-5 bg-slate-900 dark:bg-primary rounded-2xl shadow-xl shadow-slate-900/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
         <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
         <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center text-white border border-white/20">
               <TrendingUp size={32} strokeWidth={2.5} />
            </div>
            <div>
               <h2 className="text-[18px] font-black text-white capitalize tracking-tighter">Dissemination Strategy</h2>
               <p className="text-[11px] font-black text-white/60 capitalize tracking-[0.2em] mt-1.5 leading-relaxed">
                  Active Tier Configurations: Standard • Premium • Luxury
               </p>
            </div>
         </div>
         <div className="flex gap-2 relative z-10">
            <div className="px-5 py-2.5 bg-white/10 rounded-xl border border-white/20 flex flex-col items-center">
               <p className="text-[16px] font-black text-white leading-none">3</p>
               <p className="text-[10px] font-black text-white/40 capitalize tracking-widest mt-1">Active Tiers</p>
            </div>
            <div className="px-5 py-2.5 bg-white/10 rounded-xl border border-white/20 flex flex-col items-center">
               <p className="text-[16px] font-black text-white leading-none">24/7</p>
               <p className="text-[10px] font-black text-white/40 capitalize tracking-widest mt-1">Pricing Uptime</p>
            </div>
         </div>
      </div>

    </div>
  );
};

const PlanCard = ({ level, icon: Icon, color, planData, onFieldChange, onGstChange, onSave, isSaving }) => {
  const colors = {
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    blue: "text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20",
    amber: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20"
  };

  // We take gstPercent from monthly plan as the source of truth for the shared input
  const gstPercent = planData.monthly?.gstPercent || planData.daily?.gstPercent || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-5 relative group hover:border-primary/30 transition-all"
    >
      <div className="flex items-center justify-between">
         <div className={cn("p-2.5 w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm", colors[color])}>
           <Icon size={24} strokeWidth={2.5} />
         </div>
         <div className="text-right">
            <h3 className="text-[20px] font-black text-slate-900 dark:text-white capitalize tracking-tighter leading-none">{level}</h3>
            <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest mt-1 opacity-60">Pricing Layer</p>
         </div>
      </div>

      <div className="space-y-4">
        {/* DAILY RATE */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-black text-slate-400 capitalize tracking-widest opacity-80">Daily Transmission</span>
            <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black text-emerald-600 capitalize ">Live Yield</span>
            </div>
          </div>
          <div className="relative group/input">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[12px] group-focus-within/input:text-primary transition-colors ">₹</div>
            <input
              type="number"
              min="0"
              className="w-full h-12 pl-8 pr-4 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-800 rounded-xl text-[15px] font-black text-slate-900 dark:text-white focus:ring-2 ring-primary/10 focus:border-primary/30 outline-none transition-all appearance-none "
              value={planData.daily?.price || ''}
              placeholder="0"
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0 || e.target.value === '') onFieldChange(planData.daily?._id, 'price', e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e') e.preventDefault();
              }}
            />
          </div>
        </div>

        {/* MONTHLY RATE */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-black text-slate-400 capitalize tracking-widest opacity-80">Cycle Retainer (30D)</span>
            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 capitalize  leading-none">Vault Protected</span>
          </div>
          <div className="relative group/input">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[12px] group-focus-within/input:text-primary transition-colors ">₹</div>
            <input
              type="number"
              min="0"
              className="w-full h-12 pl-8 pr-4 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-800 rounded-xl text-[15px] font-black text-slate-900 dark:text-white focus:ring-2 ring-primary/10 focus:border-primary/30 outline-none transition-all appearance-none "
              value={planData.monthly?.price || ''}
              placeholder="0"
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0 || e.target.value === '') onFieldChange(planData.monthly?._id, 'price', e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e') e.preventDefault();
              }}
            />
          </div>
        </div>

        {/* GST SETTING */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-gray-800 border-dashed">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-black text-slate-400 capitalize tracking-widest opacity-80">GST Percentage (%)</span>
            {gstPercent > 0 && <span className="text-[10px] font-black text-amber-500 capitalize  leading-none">+Tax Applied</span>}
          </div>
          <div className="relative group/input">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[12px] group-focus-within/input:text-primary transition-colors ">%</div>
            <input
              type="number"
              min="0"
              className="w-full h-11 pl-8 pr-4 bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-800 rounded-xl text-[15px] font-black text-slate-900 dark:text-white focus:ring-2 ring-primary/10 focus:border-primary/30 outline-none transition-all appearance-none "
              value={gstPercent === 0 ? '' : gstPercent}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0 || e.target.value === '') onGstChange(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e') e.preventDefault();
              }}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className={cn(
          "w-full h-12 rounded-xl font-black text-[12px] capitalize tracking-[0.2em] transition-all flex items-center justify-center gap-3",
          isSaving 
            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
            : "bg-slate-900 dark:bg-primary text-white hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-slate-900/10 group/btn border border-slate-800"
        )}
      >
        {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} className="group-hover/btn:scale-110 transition-transform" strokeWidth={3} />}
        {isSaving ? "Syncing..." : "Commit Tier"}
      </button>
    </motion.div>
  );
};

export default SubscriptionPlans;
