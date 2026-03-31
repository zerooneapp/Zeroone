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
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* 💰 HEADER */}
      <div className="p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-2xl font-black dark:text-white tracking-tight italic text-primary">Monetization Engine 💰</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Control platform-wide subscription yields</p>
         </div>
         <div className="bg-gray-50 dark:bg-gray-800/40 p-4 px-6 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
            <Info size={18} className="text-primary" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
               Pricing changes are dynamic and will affect next billing cycles for all active vendors.
            </p>
         </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[1,2,3].map(i => <div key={i} className="h-96 bg-gray-50 animate-pulse rounded-[3rem]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <PlanCard 
             level="basic" 
             icon={ShieldCheck} 
             color="emerald"
             planData={getPlanByLevelInfo('basic')}
             onPriceChange={handlePriceChange}
             onSave={() => handleSave('basic')}
             isSaving={savingId === 'basic'}
           />
           <PlanCard 
             level="standard" 
             icon={Zap} 
             color="blue"
             planData={getPlanByLevelInfo('standard')}
             onPriceChange={handlePriceChange}
             onSave={() => handleSave('standard')}
             isSaving={savingId === 'standard'}
           />
           <PlanCard 
             level="premium" 
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
      <div className="p-10 bg-primary/5 dark:bg-primary/10 rounded-[4rem] border border-primary/10 flex flex-col lg:flex-row items-center justify-between gap-8 border-dashed">
         <div className="space-y-4 text-center lg:text-left">
            <h2 className="text-xl font-black text-primary uppercase tracking-tighter italic">Tiered Yield Strategy</h2>
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-relaxed max-w-lg">
               Basic tier is for organic growth. Standard tier should be optimized for mass adoption. Premium tier leverages platform exclusivity for high-yield returns.
            </p>
         </div>
         <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-3xl flex items-center justify-center text-primary shadow-lg border border-primary/5">
               <TrendingUp size={24} />
            </div>
            <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-3xl flex items-center justify-center text-primary shadow-lg border border-primary/5">
               <HandCoins size={24} />
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
      className="p-10 bg-white dark:bg-gray-900 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-8 relative overflow-hidden"
    >
       <div className={cn("p-4 w-16 h-16 rounded-3xl flex items-center justify-center border", colors[color])}>
          <Icon size={32} />
       </div>

       <div>
          <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter italic">{level}</h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing Configuration Layer</p>
       </div>

       <div className="space-y-6">
          {/* DAILY PLAN */}
          <div className="space-y-3">
             <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Daily Rate</span>
                <span className="text-[10px] font-black text-primary uppercase italic">Per Active Day</span>
             </div>
             <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400 shadow-sm">₹</span>
                <input 
                  type="number"
                  className="w-full pl-12 pr-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-none rounded-[2rem] text-lg font-black dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all appearance-none"
                  value={planData.daily?.price || 0}
                  onChange={(e) => onPriceChange(planData.daily?._id, e.target.value)}
                  placeholder="0.00"
                />
             </div>
          </div>

          {/* MONTHLY PLAN */}
          <div className="space-y-3">
             <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Monthly Rate</span>
                <span className="text-[10px] font-black text-gray-300 uppercase italic">30 Days Cycle</span>
             </div>
             <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400 shadow-sm">₹</span>
                <input 
                  type="number"
                  className="w-full pl-12 pr-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-none rounded-[2rem] text-lg font-black dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all appearance-none"
                  value={planData.monthly?.price || 0}
                  onChange={(e) => onPriceChange(planData.monthly?._id, e.target.value)}
                  placeholder="0.00"
                />
             </div>
          </div>
       </div>

       <button 
         onClick={onSave}
         disabled={isSaving}
         className={cn(
           "w-full py-5 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
           isSaving ? "bg-gray-100 text-gray-400" : "bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 group"
         )}
       >
          {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={18} className="group-hover:translate-y-[-2px] transition-transform" /> }
          {isSaving ? "Syncing..." : "Update Tier"}
       </button>
    </motion.div>
  );
};

export default SubscriptionPlans;
