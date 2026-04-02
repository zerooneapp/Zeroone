import React, { useState, useEffect } from 'react';
import { 
  Settings, ShieldAlert, Wallet, BellRing, 
  Save, RefreshCw, ToggleLeft, ToggleRight,
  Info, ShieldCheck, Zap, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const PlatformSettings = () => {
  const [settings, setSettings] = useState({
    freeTrialDays: 7,
    minWalletThreshold: 100,
    notifications: {
      bookingAlerts: true,
      walletAlerts: true,
      reminderAlerts: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings');
      setSettings(res.data);
    } catch (err) {
      toast.error('Failed to load system config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const [pendingUpdate, setPendingUpdate] = useState(null);

  useEffect(() => {
    if (!pendingUpdate) return;
    const timer = setTimeout(async () => {
      try {
        setSaving(true);
        await api.patch('/admin/settings', pendingUpdate);
        toast.success('System Parameters Synchronized ⚙️');
      } catch (err) {
        toast.error('Configuration Sync Failed');
        fetchSettings();
      } finally {
        setSaving(false);
        setPendingUpdate(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [pendingUpdate]);

  const handleUpdate = (update) => {
    setSettings(prev => ({ ...prev, ...update }));
    setPendingUpdate(update);
  };

  const handleToggle = (key) => {
    const newNotifs = { ...settings.notifications, [key]: !settings.notifications[key] };
    handleUpdate({ notifications: newNotifs });
  };

  if (loading) return (
     <div className="p-12 space-y-8 animate-pulse">
        <div className="h-40 bg-gray-50 rounded-[3rem]" />
        <div className="grid grid-cols-2 gap-8">
           <div className="h-80 bg-gray-50 rounded-[3rem]" />
           <div className="h-80 bg-gray-50 rounded-[3rem]" />
        </div>
     </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* ⚙️ HEADER */}
      <div className="p-10 bg-white dark:bg-gray-900 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b-4 border-b-primary/10">
         <div className="space-y-2">
            <h1 className="text-3xl font-black dark:text-white tracking-tighter text-primary uppercase">Platform Core 🛠️</h1>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Manage master governance parameters</p>
         </div>
         <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex items-center gap-6">
            <ShieldAlert size={28} className="text-primary hidden sm:block" />
            <div className="space-y-1">
               <p className="text-[10px] font-black dark:text-white uppercase tracking-widest">Global State Control</p>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-loose">
                  Changes here affect all existing and new vendor accounts instantly.
               </p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         
         {/* 🧾 GROWTH & ECONOMICS */}
         <div className="space-y-8">
            <SettingsCard title="Growth Economics" icon={Zap}>
               <div className="space-y-6">
                  <SettingInput 
                    label="Free Trial Period"
                    sub="Days given to new approved vendors"
                    icon={ShieldCheck}
                    value={settings.freeTrialDays}
                    onChange={(val) => handleUpdate({ freeTrialDays: Number(val) })}
                    unit="Days"
                    isDisabled={saving}
                  />
                  <SettingInput 
                    label="Min Wallet Threshold"
                    sub="Automatic suspension alert level"
                    icon={Wallet}
                    value={settings.minWalletThreshold}
                    onChange={(val) => handleUpdate({ minWalletThreshold: Number(val) })}
                    unit="₹"
                    isDisabled={saving}
                  />
               </div>
            </SettingsCard>
         </div>

         {/* 🔔 NOTIFICATION PREFERENCES */}
         <div className="space-y-8">
            <SettingsCard title="Intelligence Alerts" icon={BellRing}>
               <div className="space-y-4">
                  <ToggleItem 
                    label="Booking Activity"
                    sub="System-wide transaction alerts"
                    isActive={settings.notifications?.bookingAlerts}
                    onToggle={() => handleToggle('bookingAlerts')}
                    isDisabled={saving}
                  />
                  <ToggleItem 
                    label="Financial Yield Alerts"
                    sub="Low balance and billing notifications"
                    isActive={settings.notifications?.walletAlerts}
                    onToggle={() => handleToggle('walletAlerts')}
                    isDisabled={saving}
                  />
                  <ToggleItem 
                    label="Vendor Retention"
                    sub="Reminders for profile completion"
                    isActive={settings.notifications?.reminderAlerts}
                    onToggle={() => handleToggle('reminderAlerts')}
                    isDisabled={saving}
                  />
               </div>
            </SettingsCard>
         </div>

      </div>

      {/* 📊 FOOTER NOTE */}
      <div className="p-8 bg-gray-900 dark:bg-black rounded-[3.5rem] flex items-center gap-6 group">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20 rotate-[-4deg] group-hover:rotate-0 transition-all duration-500">
             <AlertCircle size={24} />
          </div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-relaxed">
             Administrative parameters are audited by the platform security layer. Unauthorized changes are flagged to the root controller.
          </p>
      </div>

    </div>
  );
};

const SettingsCard = ({ title, icon: Icon, children }) => (
  <div className="p-10 bg-white dark:bg-gray-900 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-8 h-full">
     <div className="flex items-center gap-4 border-b border-gray-50 dark:border-gray-800 pb-6 mb-4">
        <Icon size={24} className="text-primary" />
        <h3 className="text-sm font-black dark:text-white uppercase tracking-widest">{title}</h3>
     </div>
     {children}
  </div>
);

const SettingInput = ({ label, sub, icon: Icon, value, onChange, unit, isDisabled }) => (
  <div className="space-y-3 p-2 group">
     <div className="flex justify-between items-start">
        <div className="space-y-1">
           <h4 className="text-[11px] font-black dark:text-white uppercase tracking-widest">{label}</h4>
           <p className="text-[9px] font-bold text-gray-400 capitalize">{sub}</p>
        </div>
        <div className="text-primary opacity-20 group-hover:opacity-100 transition-opacity">
           <Icon size={16} />
        </div>
     </div>
     <div className="relative">
        <input 
          type="number"
          className="w-full pl-6 pr-16 py-4 bg-gray-50 dark:bg-gray-800/40 border-none rounded-2xl text-sm font-black dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
        />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">
           {unit}
        </div>
     </div>
  </div>
);

const ToggleItem = ({ label, sub, isActive, onToggle, isDisabled }) => (
  <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/40 rounded-[2.5rem] border border-gray-50 dark:border-transparent group hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-black/5 transition-all duration-500">
     <div className="space-y-1">
        <h4 className="text-[11px] font-black dark:text-white uppercase tracking-widest">{label}</h4>
        <p className="text-[9px] font-bold text-gray-400 capitalize">{sub}</p>
     </div>
     <button 
       onClick={onToggle}
       disabled={isDisabled}
       className={cn(
         "transition-all duration-300 transform",
         isActive ? "text-primary scale-110" : "text-gray-300 scale-100 opacity-50"
       )}
     >
        {isActive ? <ToggleRight size={44} strokeWidth={1} /> : <ToggleLeft size={44} strokeWidth={1} />}
     </button>
  </div>
);

export default PlatformSettings;
