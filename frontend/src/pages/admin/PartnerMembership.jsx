import React, { useState, useEffect } from 'react';
import { 
  Crown, ShieldCheck, Zap, Info, 
  Settings, Save, RefreshCw, AlertCircle,
  ToggleLeft, ToggleRight, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const PartnerMembership = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings');
      setSettings(res.data);
    } catch (err) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (field) => {
    // Optimistic update
    let newSettings;
    setSettings(prev => {
      const currentVal = prev?.features?.[field] ?? true;
      newSettings = {
        ...prev,
        features: {
          ...(prev?.features || {}),
          [field]: !currentVal
        }
      };
      return newSettings;
    });

    try {
      // Auto-save
      setSaving(true);
      await api.patch('/admin/settings', newSettings);
      toast.success('Membership system status updated! ✨');
    } catch (err) {
      toast.error('Failed to update settings');
      // Revert optimistic update
      fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.patch('/admin/settings', settings);
      toast.success('Settings synchronized! ✨');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const membershipActive = settings?.features?.membershipActive ?? true;
  const subscriptionActive = settings?.features?.subscriptionActive ?? true;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* 👑 PREMIUM HEADER */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-primary/20">
        <div className="space-y-1">
          <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tighter capitalize leading-none">Partner Membership</h1>
          <p className="text-[12px] font-black text-slate-500 capitalize tracking-[0.2em] opacity-90">System Configuration Hub</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "px-8 py-3.5 rounded-2xl font-black text-[12px] capitalize tracking-[0.2em] transition-all flex items-center gap-3",
            saving 
              ? "bg-slate-100 text-slate-500 cursor-not-allowed" 
              : "bg-slate-900 dark:bg-primary text-white hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-slate-900/10"
          )}
        >
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? "Syncing..." : "Apply Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 max-w-2xl gap-6">
        
        {/* MEMBERSHIP TOGGLE CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-8 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group",
            membershipActive 
              ? "bg-white dark:bg-gray-900 border-primary/20 shadow-xl shadow-primary/5" 
              : "bg-slate-50 dark:bg-gray-900/40 border-slate-200 dark:border-gray-800"
          )}
        >
          {/* Background Decoration */}
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-all opacity-10",
            membershipActive ? "bg-primary" : "bg-slate-400"
          )} />

          <div className="flex items-center justify-between relative z-10">
            <div className={cn(
              "p-4 rounded-2xl border flex items-center justify-center transition-colors",
              membershipActive 
                ? "bg-primary/10 border-primary/20 text-primary" 
                : "bg-slate-100 border-slate-200 text-slate-500 dark:text-white dark:bg-gray-800 dark:border-gray-700"
            )}>
              <Crown size={32} strokeWidth={2.5} />
            </div>
            <button 
              onClick={() => handleToggle('membershipActive')}
              className={cn(
                "w-16 h-8 rounded-full relative transition-all duration-500",
                membershipActive ? "bg-primary" : "bg-slate-300 dark:bg-gray-800"
              )}
            >
              <div className={cn(
                "absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-500",
                membershipActive ? "left-9" : "left-1"
              )} />
            </button>
          </div>

          <div className="mt-8 space-y-3 relative z-10">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Membership System</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-500 leading-relaxed">
              Enable this to allow vendors to create loyalty plans for their customers. 
              If disabled, the "Plans" section will be hidden from the vendor dashboard and service pages.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-gray-800 flex items-center gap-3">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              membershipActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )} />
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              membershipActive ? "text-emerald-600" : "text-red-500"
            )}>
              {membershipActive ? "Live & Transacting" : "System Deactivated"}
            </span>
          </div>
        </motion.div>



      </div>

      {/* INFO FOOTER */}
      <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-primary border border-primary/10 shadow-sm shrink-0">
          <Info size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-[13px] font-black text-primary dark:text-white uppercase tracking-wider">Configuration Notice</h4>
          <p className="text-xs font-bold text-primary/70 dark:text-white/80 leading-relaxed uppercase tracking-tight">
            Changing these statuses will have immediate global effects. Vendors and customers will see UI changes instantly upon their next refresh. Functional blocking is enforced at the API level.
          </p>
        </div>
      </div>

    </div>
  );
};

export default PartnerMembership;
