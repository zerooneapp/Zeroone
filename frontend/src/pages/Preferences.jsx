import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { ArrowLeft, Moon, Sun, Globe, Languages, DollarSign, Map, ArrowRight, Check, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const Preferences = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { isDarkMode, themeMode, setThemeMode } = useThemeStore();
  
  const [prefs, setPrefs] = useState({
    language: user?.preferences?.language || 'English (In)',
    currency: user?.preferences?.currency || 'INR (₹)',
    region: user?.preferences?.region || 'India'
  });

  const [loading, setLoading] = useState(false);

  const showFutureUpdate = () => {
    toast('Available in future updates', {
        icon: '🚀',
        style: {
            borderRadius: '1rem',
            background: '#1C2C4E',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
        }
    });
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await api.patch('/users/profile', { preferences: prefs });
      updateUser(res.data);
      toast.success('Preferences saved!', {
          icon: '✅',
          style: { borderRadius: '1rem', fontSize: '11px', fontWeight: 'bold' }
      });
      navigate(-1);
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const PreferenceItem = ({ icon: Icon, title, sub, value, action, color = "slate", isLocked = false }) => (
    <button 
      onClick={action}
      className={`w-full text-left p-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all ${isLocked ? 'cursor-default' : ''}`}
    >
       <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center border border-${color}-100/50 dark:border-${color}-800/30`}>
             <Icon size={18} className={`text-${color}-500`} strokeWidth={2.5} />
          </div>
          <div className="space-y-0.5">
             <h3 className="text-[13px] font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none">{title}</h3>
             <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500">{sub}</p>
          </div>
       </div>
       <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-tighter">{value}</span>
       </div>
    </button>
  );

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-gray-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* 🛡️ ELITE HEADER */}
      <header className="px-2.5 pt-12 pb-3 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all"
          >
            <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
          </button>
          <div className="leading-none">
            <h1 className="font-extrabold text-[15px] text-[#1C2C4E] dark:text-white tracking-tight">
              Preferences
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {/* 🌓 APPEARANCE */}
        <section className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1 uppercase text-left block">Appearance</label>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-3.5 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-gray-800">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center border border-orange-100/50">
                {isDarkMode ? <Moon size={18} className="text-orange-500" /> : <Sun size={18} className="text-orange-500" />}
              </div>
              <div className="space-y-0.5 text-left">
                <h3 className="text-[13px] font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none">Dark mode</h3>
                <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500 leading-tight">
                  {themeMode === 'system' ? "We'll adjust based on your device's system settings" : themeMode === 'dark' ? 'Sleek energy efficient theme' : 'Classic light appearance'}
                </p>
              </div>
            </div>

            {/* Options */}
            {[
              { mode: 'dark', label: 'On', icon: Moon },
              { mode: 'light', label: 'Off', icon: Sun },
              { mode: 'system', label: 'System default', icon: Smartphone },
            ].map(({ mode, label, icon: Icon }, index, arr) => {
              const isSelected = themeMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition-all active:scale-[0.98] ${
                    index < arr.length - 1 ? 'border-b border-slate-100 dark:border-gray-800' : ''
                  } ${isSelected ? 'bg-slate-50 dark:bg-gray-800/60' : 'hover:bg-slate-50/60 dark:hover:bg-gray-800/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={15} strokeWidth={2.5} className={isSelected ? 'text-[#1C2C4E] dark:text-white' : 'text-slate-400 dark:text-gray-500'} />
                    <span className={`text-[13px] font-black tracking-tight ${isSelected ? 'text-[#1C2C4E] dark:text-white' : 'text-slate-500 dark:text-gray-400'}`}>
                      {label}
                    </span>
                  </div>
                  {/* Radio indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'border-[#1C2C4E] dark:border-primary' : 'border-slate-300 dark:border-gray-600'
                  }`}>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2.5 h-2.5 rounded-full bg-[#1C2C4E] dark:bg-primary"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 🌍 LOCALIZATION */}
        <section className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1 uppercase text-left block">Localization</label>
           <div className="space-y-3">
              <PreferenceItem 
                icon={Languages} 
                title="App language" 
                sub="System wide translation"
                value={prefs.language}
                action={showFutureUpdate}
                color="blue"
                isLocked={true}
              />
              <PreferenceItem 
                icon={DollarSign} 
                title="Currency display" 
                sub="Payment region pricing"
                value={prefs.currency}
                action={showFutureUpdate}
                color="emerald"
                isLocked={true}
              />
              <PreferenceItem 
                icon={Map} 
                title="Region setting" 
                sub="Local content filtering"
                value={prefs.region}
                action={showFutureUpdate}
                color="purple"
                isLocked={true}
              />
           </div>
        </section>

        {/* 🚀 SAVE ACTION */}
        <div className="pt-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleUpdate}
            disabled={loading}
            className="w-full h-12 bg-[#1C2C4E] dark:bg-primary text-white rounded-2xl font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-[#1C2C4E]/20 flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : (
              <>
                <span className="relative z-10">Save preferences</span>
                <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default Preferences;
