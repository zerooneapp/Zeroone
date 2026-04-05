import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ChevronLeft, User, Calendar, Phone, ShieldCheck, ArrowRight, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const PersonalInformation = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    gender: user?.gender || 'male',
    phone: user?.phone || '',
    image: user?.image || null
  });

  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch('/users/profile', formData);
      updateUser(res.data);
      toast.success('Profile updated successfully!', {
          icon: '🚀',
          style: {
              borderRadius: '1rem',
              background: '#1e293b',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold'
          }
      });
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-gray-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* 🛡️ ELITE HEADER (SYNCED WITH ACCOUNT) */}
      <header className="px-4 pt-4 pb-2 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-40 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1 px-2 -ml-2 text-[#1C2C4E] dark:text-blue-400 active:scale-90 transition-all font-black"
          >
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
          <h1 className="text-lg font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none">
            Personal information
          </h1>
        </div>
        <p className="text-[9px] font-black text-[#1C2C4E]/60 tracking-widest mt-2 ml-1 opacity-80 uppercase">Elite User Profile</p>
      </header>

      <main className="px-5 mt-6 space-y-6">
        {/* 👤 AVATAR PREVIEW */}
        <div className="flex flex-col items-center justify-center space-y-3 py-4">
          <div className="relative group">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange}
              className="hidden" 
              id="profile-upload"
            />
            <label 
              htmlFor="profile-upload"
              className="w-24 h-24 rounded-[2rem] bg-slate-900 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-2xl relative z-10 overflow-hidden cursor-pointer"
            >
               {formData.image ? (
                 <img src={formData.image} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <User size={40} className="text-white/20" />
               )}
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                  <Camera size={18} className="text-white" />
               </div>
            </label>
          </div>
        </div>

        {/* 📝 INFO FORM */}
        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">Full name</label>
            <div className="relative">
              <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full h-11 pl-12 pr-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 text-sm font-black text-slate-900 dark:text-white tracking-tight focus:border-primary transition-all outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">Date of birth</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                className="w-full h-11 pl-12 pr-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 text-sm font-black text-slate-900 dark:text-white tracking-tight focus:border-primary transition-all outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">Phone number</label>
            <div className="relative">
              <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                type="tel"
                value={formData.phone}
                disabled
                className="w-full h-11 pl-12 pr-4 bg-slate-50 dark:bg-gray-800/20 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 text-sm font-black text-slate-400 dark:text-gray-500 tracking-tight transition-all outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[9px] font-black text-slate-400 tracking-widest ml-1">Select gender</label>
            <div className="flex gap-1.5 p-1 bg-white dark:bg-gray-900 border border-[#1C2C4E]/10 dark:border-gray-800 rounded-2xl">
              {['male', 'female', 'other'].map(g => (
                <button
                  key={g}
                  onClick={() => setFormData({...formData, gender: g})}
                  className={`flex-1 py-2 text-[11px] font-black tracking-widest rounded-xl transition-all capitalize ${
                    formData.gender === g 
                    ? 'bg-[#1C2C4E] text-white shadow-lg' 
                    : 'text-slate-400 hover:text-[#1C2C4E]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 🚀 SAVE ACTION */}
        <div className="pt-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleUpdate}
            disabled={loading}
            className={`w-full h-12 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-xs tracking-[0.2em] uppercase shadow-2xl shadow-slate-900/20 dark:shadow-primary/20 flex items-center justify-center gap-2 overflow-hidden relative group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
               <>
                  <span className="relative z-10">Save changes</span>
                  <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
               </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </motion.button>
        </div>
      </main>
    </div>
  );
};

export default PersonalInformation;
