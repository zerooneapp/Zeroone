import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ChevronLeft, MapPin, Compass, Search, Navigation, Save, Trash2, Home, Briefcase, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const SavedAddresses = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState(user?.address || '');

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation not supported');
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const readableAddress = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setManualAddress(readableAddress);
          toast.success('Location fetched!', { icon: '📍' });
        } catch (err) {
          toast.error('Failed to resolve address');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        toast.error('Location access denied');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveAddress = async () => {
    if (!manualAddress.trim()) return toast.error('Please enter an address');
    
    setLoading(true);
    try {
      const res = await api.patch('/users/profile', { address: manualAddress });
      updateUser(res.data);
      toast.success('Address saved successfully!', {
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
      toast.error('Failed to save address');
    } finally {
      setLoading(false);
    }
  };

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
            Saved addresses
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {/* 📍 CURRENT ADDRESS CARD */}
        <section className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1 uppercase">Active address</label>
          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5">
                <MapPin size={40} className="text-[#1C2C4E]" />
            </div>
            <div className="flex items-start gap-3 relative z-10">
               <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center border border-slate-100 dark:border-gray-700 shrink-0">
                  <Navigation size={18} className="text-[#1C2C4E] dark:text-blue-400" />
               </div>
               <div className="space-y-1">
                  <h3 className="text-sm font-black text-[#1C2C4E] dark:text-white tracking-tight">Main location</h3>
                  <p className="text-[11px] font-medium text-slate-500 leading-relaxed dark:text-gray-400">
                    {user?.address || 'No address set yet'}
                  </p>
               </div>
            </div>
          </div>
        </section>

        {/* 🌐 QUICK ACTIONS */}
        <section className="grid grid-cols-2 gap-3">
           <button 
             onClick={handleFetchCurrentLocation}
             disabled={loading}
             className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 border border-[#1C2C4E]/10 dark:border-gray-800 rounded-2xl shadow-sm active:scale-95 transition-all group"
           >
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                 <Compass size={18} className="text-blue-500" />
              </div>
              <span className="text-[10px] font-black text-[#1C2C4E] dark:text-white tracking-widest">Get current</span>
           </button>
           <button className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 border border-[#1C2C4E]/10 dark:border-gray-800 rounded-2xl shadow-sm active:scale-95 transition-all group opacity-50 cursor-not-allowed">
              <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-gray-800 flex items-center justify-center mb-2">
                 <Plus size={18} className="text-slate-400" />
              </div>
              <span className="text-[10px] font-black text-slate-400 tracking-widest">Add extra</span>
           </button>
        </section>

        {/* 🖊️ MANUAL ENTRY */}
        <section className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1 uppercase">Modify address</label>
           <div className="relative group">
              <textarea
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Enter complete address manually..."
                className="w-full h-24 p-4 pt-8 bg-white dark:bg-gray-900 rounded-xl border border-[#1C2C4E]/10 dark:border-gray-800 text-xs font-bold text-slate-900 dark:text-white tracking-tight focus:border-primary transition-all outline-none resize-none shadow-sm"
              />
              <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none opacity-40">
                 <Search size={14} className="text-[#1C2C4E]" />
                 <span className="text-[8px] font-black uppercase tracking-[0.2em]">Manual Input</span>
              </div>
           </div>
        </section>

        {/* 🚀 SAVE ACTION */}
        <div className="pt-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveAddress}
            disabled={loading}
            className={`w-full h-12 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-slate-900/20 dark:shadow-primary/20 flex items-center justify-center gap-2 overflow-hidden relative group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
               <>
                  <span className="relative z-10">Set address</span>
                  <Save size={16} className="relative z-10 group-hover:translate-y-[-1px] transition-transform" />
               </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default SavedAddresses;
