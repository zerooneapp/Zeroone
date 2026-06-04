import React, { useState, useEffect } from 'react';
import {
  Settings, ShieldAlert, Wallet, BellRing,
  Save, RefreshCw, ToggleLeft, ToggleRight,
  Info, ShieldCheck, Zap, AlertCircle, MapPin, MessageCircle,
  IndianRupee
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const PlatformSettings = () => {
  const [settings, setSettings] = useState({
    freeTrialDays: 7,
    minWalletThreshold: 100,
    minWithdrawalAmount: 100,
    discoveryRadius: 10,
    notifications: {
      bookingAlerts: true,
      walletAlerts: true,
      reminderAlerts: true
    },
    supportWhatsApp: ""
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

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.patch('/admin/settings', settings);
      toast.success('System Parameters Synchronized ⚙️');
    } catch (err) {
      toast.error('Configuration Sync Failed');
      fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = (update) => {
    setSettings(prev => ({ ...prev, ...update }));
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
    <div className="space-y-5 pb-20 animate-in fade-in duration-500">

      {/* ⚙️ HEADER */}
      <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-primary/20">
        <div className="space-y-1">
          <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tighter capitalize">Platform Core</h1>
          <p className="text-[12px] font-black text-slate-400 capitalize tracking-[0.2em] opacity-60">Manage master governance parameters</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-all disabled:opacity-50 shrink-0"
          >
            {saving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          <div className="w-full sm:w-auto bg-slate-50 dark:bg-gray-800 p-4 rounded-xl border border-slate-100 dark:border-gray-800 flex items-center gap-4 transition-all hover:border-primary/20">
            <ShieldAlert size={24} strokeWidth={3} className="text-primary dark:text-white hidden sm:block opacity-60" />
            <div className="leading-tight">
              <p className="text-[12px] font-black text-slate-900 dark:text-white capitalize tracking-widest">Global State Control</p>
              <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest leading-relaxed opacity-60">
                Critical changes affect all partner accounts instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 🧾 GROWTH & ECONOMICS */}
        <div className="space-y-5">
          <SettingsCard title="Growth Economics" icon={Zap}>
            <div className="space-y-4">
              <SettingInput
                label="Free Trial Period"
                sub="Grace period for newly approved portfolios"
                icon={ShieldCheck}
                value={settings.freeTrialDays}
                onChange={(val) => handleUpdate({ freeTrialDays: Number(val) })}
                unit="DAYS"
                isDisabled={saving}
              />
              <SettingInput
                label="Min Wallet Threshold"
                sub="Automated suspension & billing alert level"
                icon={Wallet}
                value={settings.minWalletThreshold}
                onChange={(val) => handleUpdate({ minWalletThreshold: Number(val) })}
                unit="₹"
                isDisabled={saving}
              />
              <SettingInput
                label="Min Withdrawal Amount"
                sub="Minimum balance required for payout requests"
                icon={IndianRupee}
                value={settings.minWithdrawalAmount || 100}
                onChange={(val) => handleUpdate({ minWithdrawalAmount: Number(val) })}
                unit="₹"
                isDisabled={saving}
              />
              <SettingInput
                label="Service Discovery Radius"
                sub="Max distance for users to find partners"
                icon={MapPin}
                value={settings.discoveryRadius}
                onChange={(val) => handleUpdate({ discoveryRadius: Number(val) })}
                unit="KM"
                isDisabled={saving}
              />
              <SettingInput
                label="Promotion Price Per Day"
                sub="Daily cost for profile boost visibility"
                icon={Zap}
                value={settings.promotionPricePerDay || 10}
                onChange={(val) => handleUpdate({ promotionPricePerDay: Number(val) })}
                unit="₹"
                isDisabled={saving}
              />
            </div>
          </SettingsCard>
        </div>

        {/* 🔔 NOTIFICATION PREFERENCES */}
        <div className="space-y-5">
          <SettingsCard title="Intelligence Alerts" icon={BellRing}>
            <div className="space-y-3.5">
              <ToggleItem
                label="Booking Activity"
                sub="Real-time global transaction alerts"
                isActive={settings.notifications?.bookingAlerts}
                onToggle={() => handleToggle('bookingAlerts')}
                isDisabled={saving}
              />
              <ToggleItem
                label="Financial Yield Alerts"
                sub="Low balance and recursive billing notes"
                isActive={settings.notifications?.walletAlerts}
                onToggle={() => handleToggle('walletAlerts')}
                isDisabled={saving}
              />
              <ToggleItem
                label="Partner Retention"
                sub="Reminders for profile & asset compliance"
                isActive={settings.notifications?.reminderAlerts}
                onToggle={() => handleToggle('reminderAlerts')}
                isDisabled={saving}
              />
            </div>
          </SettingsCard>
        </div>

        {/* 💬 SUPPORT INFRASTRUCTURE */}
        <div className="space-y-5 lg:col-span-2">
          <SettingsCard title="Support Infrastructure" icon={MessageCircle}>
            <div className="max-w-md">
              <SettingInput
                label="Support WhatsApp Number"
                sub="Primary support node for partner assistance"
                icon={MessageCircle}
                value={settings.supportWhatsApp}
                onChange={(val) => handleUpdate({ supportWhatsApp: val })}
                unit="WHATSAPP"
                isDisabled={saving}
                type="text"
              />
            </div>
          </SettingsCard>
        </div>

      </div>

      {/* 📊 FOOTER NOTE */}
      <div className="p-4 bg-slate-900 dark:bg-black rounded-xl flex items-center gap-5 group border border-slate-800 shadow-xl">
        <div className="w-12 h-12 bg-primary/10 text-primary dark:text-white rounded-lg flex items-center justify-center border border-primary/20 shrink-0 rotate-[-4deg] group-hover:rotate-0 transition-all duration-500">
          <AlertCircle size={24} strokeWidth={3} />
        </div>
        <p className="text-[11px] font-black text-slate-500 capitalize tracking-[0.2em] leading-relaxed opacity-80">
          Administrative parameters are audited by the platform security layer. Unauthorized changes are flagged to the root controller for immediate audit review.
        </p>
      </div>

    </div>
  );
};

const SettingsCard = ({ title, icon: Icon, children }) => (
  <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-5 h-full transition-all hover:shadow-md">
    <div className="flex items-center gap-3 border-b border-slate-50 dark:border-gray-800 pb-3.5 mb-2">
      <Icon size={20} strokeWidth={3} className="text-primary dark:text-white opacity-80" />
      <h3 className="text-[14px] font-black text-slate-900 dark:text-white capitalize tracking-[0.1em]">{title}</h3>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const SettingInput = ({ label, sub, icon: Icon, value, onChange, unit, isDisabled, type }) => (
  <div className="space-y-3 group">
    <div className="flex justify-between items-start px-1">
      <div className="space-y-1.5">
        <h4 className="text-[11px] font-black text-slate-400 dark:text-gray-500 capitalize tracking-[0.2em] opacity-60">{label}</h4>
        <p className="text-[12px] font-black text-slate-900 dark:text-white capitalize tracking-tighter">{sub}</p>
      </div>
      <div className="text-primary dark:text-white opacity-80 group-hover:opacity-100 transition-opacity">
        <Icon size={18} strokeWidth={3} />
      </div>
    </div>
    <div className="relative">
      <input
        type={type || "text"}
        inputMode={type === "text" ? undefined : "numeric"}
        className="w-full pl-5 pr-12 h-12 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl text-[18px] font-black text-slate-900 dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all tracking-tighter shadow-inner"
        value={value}
        onChange={(e) => {
          if (type === "text") {
            onChange(e.target.value);
            return;
          }
          // Only allow numbers
          let val = e.target.value.replace(/[^0-9]/g, '');
          
          // Remove leading zeros
          if (val.length > 1 && val.startsWith('0')) {
            val = val.replace(/^0+/, '');
          }
          
          if (val === '') {
            onChange(0);
          } else {
            onChange(Number(val));
          }
        }}
        onKeyDown={(e) => {
          if (type !== "text" && (e.key === '-' || e.key === 'e')) e.preventDefault();
        }}
        disabled={isDisabled}
      />
      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] font-black text-primary dark:text-gray-400 capitalize tracking-widest">
        {unit}
      </div>
    </div>
  </div>
);

const ToggleItem = ({ label, sub, isActive, onToggle, isDisabled }) => (
  <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-100 dark:border-transparent group hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all duration-300">
    <div className="space-y-1.5 leading-none">
      <h4 className="text-[14px] font-black text-slate-900 dark:text-white capitalize tracking-tighter">{label}</h4>
      <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest opacity-60">{sub}</p>
    </div>
    <button
      onClick={onToggle}
      disabled={isDisabled}
      className={cn(
        "transition-all duration-300 transform",
        isActive ? "text-primary dark:text-white scale-110" : "text-slate-400 dark:text-slate-400 scale-95"
      )}
    >
      {isActive ? <ToggleRight size={36} strokeWidth={1} /> : <ToggleLeft size={36} strokeWidth={1} />}
    </button>
  </div>
);

export default PlatformSettings;
