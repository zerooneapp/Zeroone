import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ChevronLeft, Bell, BellRing, Package, Tag, Volume2, ShieldCheck, ArrowRight, Zap, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  
  const [settings, setSettings] = useState({
    push: user?.notificationSettings?.push ?? true,
    orders: user?.notificationSettings?.orders ?? true,
    promotional: user?.notificationSettings?.promotional ?? false,
    sound: user?.notificationSettings?.sound ?? true,
    vibration: user?.notificationSettings?.vibration ?? true
  });

  const [loading, setLoading] = useState(false);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.patch('/users/profile', { notificationSettings: settings });
      updateUser(res.data);
      toast.success('Notification settings saved!', {
          icon: '🔔',
          style: {
              borderRadius: '1rem',
              background: '#1C2C4E',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold'
          }
      });
      navigate(-1);
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const SettingItem = ({ icon: Icon, title, sub, active, onToggle, color = "blue" }) => (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03)] flex items-center justify-between group active:scale-[0.99] transition-all">
       <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center border border-${color}-100/50 dark:border-${color}-800/30`}>
             <Icon size={18} className={`text-${color}-500`} strokeWidth={2.5} />
          </div>
          <div className="space-y-0.5">
             <h3 className="text-[13px] font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none">{title}</h3>
             <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500">{sub}</p>
          </div>
       </div>
       <button 
         onClick={onToggle}
         className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${active ? 'bg-[#1C2C4E]' : 'bg-slate-200 dark:bg-gray-800'}`}
       >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${active ? 'left-6' : 'left-1'}`} />
       </button>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-gray-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* 🛡️ ELITE HEADER */}
      <header className="px-4 pt-4 pb-2 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-40 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="p-2 -ml-2 text-[#1C2C4E] dark:text-blue-400 active:scale-95 transition-all font-black cursor-pointer z-50 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={22} strokeWidth={3.5} />
          </button>
          <h1 className="text-lg font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none">
            Notification settings
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {/* 🚀 PRIMARY ALERTS */}
        <section className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1 lowercase">Main channels</label>
          <div className="space-y-3">
             <SettingItem 
               icon={BellRing} 
               title="Push notifications" 
               sub="Receive instant system alerts"
               active={settings.push}
               onToggle={() => toggleSetting('push')}
               color="blue"
             />
             <SettingItem 
               icon={Package} 
               title="Order updates" 
               sub="Tracking & booking status"
               active={settings.orders}
               onToggle={() => toggleSetting('orders')}
               color="emerald"
             />
             <SettingItem 
               icon={Tag} 
               title="Promotional offers" 
               sub="Exclusive elite discounts"
               active={settings.promotional}
               onToggle={() => toggleSetting('promotional')}
               color="orange"
             />
          </div>
        </section>

        {/* 🔊 EXPERIENCE SETTINGS */}
        <section className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1 lowercase">App response</label>
           <div className="space-y-3">
              <SettingItem 
                icon={Volume2} 
                title="Tone & sound" 
                sub="Notification audio cues"
                active={settings.sound}
                onToggle={() => toggleSetting('sound')}
                color="indigo"
              />
              <SettingItem 
                icon={Zap} 
                title="Vibration" 
                sub="Haptic tactile feedback"
                active={settings.vibration}
                onToggle={() => toggleSetting('vibration')}
                color="purple"
              />
           </div>
        </section>

        {/* 📚 INFO BOX */}
        <div className="p-4 bg-slate-900/5 dark:bg-gray-900 border border-dashed border-[#1C2C4E]/20 rounded-2xl flex gap-3">
           <Info size={18} className="text-[#1C2C4E] opacity-40 shrink-0" />
           <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 leading-relaxed italic opacity-80">
             Critical security alerts and urgent system updates are enabled by default and cannot be opted-out for your elite account protection.
           </p>
        </div>

        {/* 🚀 SAVE ACTION */}
        <div className="pt-2 pb-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="w-full h-12 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-slate-900/20 dark:shadow-primary/20 flex items-center justify-center gap-2 overflow-hidden relative group"
          >
            <span className="relative z-10">Save settings</span>
            <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default NotificationSettings;
