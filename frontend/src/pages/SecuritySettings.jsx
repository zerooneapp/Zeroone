import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Shield, Lock, Smartphone, Monitor, Trash2, SmartphoneNfc, ArrowRight, ShieldCheck, Fingerprint, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const SecuritySettings = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  
  const [toggles, setToggles] = useState({
    twoFactor: user?.is2FAEnabled ?? false,
    biometrics: user?.isBiometricEnabled ?? false,
  });

  const [passwordModal, setPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleToggle = async (key) => {
    const newVal = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: newVal }));
    try {
      const res = await api.patch('/users/profile', { [key === 'twoFactor' ? 'is2FAEnabled' : 'isBiometricEnabled']: newVal });
      updateUser(res.data);
      toast.success(`${key === 'twoFactor' ? '2FA' : 'Biometrics'} updated!`);
    } catch (err) {
      setToggles(prev => ({ ...prev, [key]: !newVal }));
      toast.error('Failed to update security setting');
    }
  };

  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault();
    if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match');
    
    setLoading(true);
    try {
      await api.patch('/users/profile', { 
        currentPassword: passwords.current, 
        newPassword: passwords.new 
      });
      toast.success('Password updated successfully!', { icon: '🔐' });
      setPasswordModal(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await api.delete('/users/profile');
      toast.success('Account deleted successfully');
      logout();
      navigate('/login');
    } catch (err) {
      toast.error('Deletion failed');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };



  const SecurityItem = ({ icon: Icon, title, sub, action, type = "normal" }) => (
    <div className={`p-4 bg-white dark:bg-gray-900 rounded-2xl border ${type === 'danger' ? 'border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'border-[#1C2C4E]/10 dark:border-gray-800'} shadow-sm flex items-center justify-between group active:scale-[0.99] transition-all`}>
       <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl ${type === 'danger' ? 'bg-red-50' : 'bg-slate-50 dark:bg-gray-800'} flex items-center justify-center border ${type === 'danger' ? 'border-red-100' : 'border-slate-100 dark:border-gray-700'}`}>
             <Icon size={18} className={type === 'danger' ? 'text-red-500' : 'text-[#1C2C4E] dark:text-blue-400'} strokeWidth={2.5} />
          </div>
          <div className="space-y-0.5">
             <h3 className={`text-[13px] font-black tracking-tight leading-none ${type === 'danger' ? 'text-red-600' : 'text-[#1C2C4E] dark:text-white'}`}>{title}</h3>
             <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500">{sub}</p>
          </div>
       </div>
       <button onClick={action} className="p-2 opacity-40 hover:opacity-100 transition-opacity">
          <ArrowRight size={16} strokeWidth={3} />
       </button>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-gray-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* 🛡️ ELITE HEADER */}
      <header className="p-2.5 py-3 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
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
              Security
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {/* 🔐 ACCESS CONTROL */}
        <section className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1 uppercase">Auth Controls</label>
          <div className="space-y-3">

             <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                   <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center border border-orange-100/50">
                      <SmartphoneNfc size={18} className="text-orange-500" strokeWidth={2.5} />
                   </div>
                   <div className="space-y-0.5">
                      <h3 className="text-[13px] font-black text-[#1C2C4E] dark:text-white tracking-tight leading-none">Two-factor authentication</h3>
                      <p className="text-[10px] font-medium text-slate-400 dark:text-gray-500">Enhanced login verification</p>
                   </div>
                </div>
                <button 
                  onClick={() => handleToggle('twoFactor')}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${toggles.twoFactor ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-gray-800'}`}
                >
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${toggles.twoFactor ? 'left-6' : 'left-1'}`} />
                </button>
             </div>
          </div>
        </section>

        {/* 📱 ACTIVE SESSIONS */}
        <section className="space-y-3">
           <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Active devices</label>
           </div>
           <div className="space-y-2">
              {user?.fcmTokens?.length > 0 ? (
                 user.fcmTokens.map((t, idx) => (
                    <div key={idx} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 flex items-center gap-3 shadow-sm relative overflow-hidden">
                       <div className="bg-emerald-500 w-1 h-8 absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full" />
                       {t.deviceType === 'web' ? <Monitor size={18} className="text-slate-400 ml-1" /> : <Smartphone size={18} className="text-slate-400 ml-1" />}
                       <div className="flex-1 space-y-0.5">
                          <h4 className="text-[12px] font-black text-[#1C2C4E] dark:text-white leading-none capitalize">{t.deviceType || 'Unknown Device'} • Current</h4>
                          <p className="text-[9px] font-bold text-slate-400 italic">Last active: {new Date(t.lastUsedAt).toLocaleString()}</p>
                       </div>
                    </div>
                 ))
              ) : (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 flex items-center gap-3 opacity-60">
                   <Monitor size={18} className="text-slate-400" />
                   <div className="flex-1">
                      <h4 className="text-[12px] font-black text-[#1C2C4E] dark:text-white leading-none">No active tokens found</h4>
                   </div>
                </div>
              )}
           </div>
        </section>

        {/* ⚠️ DANGER ZONE */}
        <section className="space-y-3 pt-4 pb-12">
           <label className="text-[10px] font-black text-rose-500 tracking-widest ml-1 uppercase">Danger zone</label>
           <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3.5 bg-rose-50 dark:bg-rose-950/10 rounded-[1.3rem] px-4 py-3.5 border border-rose-100 dark:border-rose-900/20 active:scale-[0.98] transition-all group"
           >
              <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center shrink-0 border border-rose-100/50">
                 <Trash2 size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left leading-none">
                 <h3 className="text-[13px] font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none">Delete account</h3>
                 <p className="text-[10px] font-medium text-rose-400/60 mt-2 uppercase tracking-tight">Permanently remove all data</p>
              </div>
              <ArrowRight size={14} strokeWidth={3} className="text-rose-200" />
           </button>
        </section>



        {/* 🛡️ SECURITY STATUS BADGE */}
        <div className="mt-4 flex flex-col items-center justify-center space-y-2 p-6 bg-slate-900/5 rounded-[2rem] border border-dashed border-[#1C2C4E]/10">
           <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <ShieldCheck size={24} className="text-emerald-500" strokeWidth={3} />
           </div>
           <h5 className="text-[12px] font-black text-[#1C2C4E] tracking-tight">Your account is secured</h5>
           <p className="text-[9px] font-medium text-slate-400 text-center leading-relaxed">
             Advanced threat-detection and real-time encryption are actively protecting your elite credentials.
           </p>
        </div>
      </main>

      {/* 🔐 PASSWORD UPDATE MODAL */}
      <AnimatePresence>
         {passwordModal && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] flex items-center justify-center px-5 bg-black/60 backdrop-blur-md"
            >
               <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 p-6">
                     <button onClick={() => setPasswordModal(false)} className="p-2 bg-slate-50 dark:bg-gray-800 rounded-full text-slate-400 active:scale-90 transition-all">
                        <X size={18} />
                     </button>
                  </div>
                  <header className="mb-6">
                     <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-3">
                        <Lock size={24} className="text-white" strokeWidth={2.5} />
                     </div>
                     <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Security update</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Change Account Password</p>
                  </header>

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 tracking-widest ml-1">CURRENT PASSWORD</label>
                        <div className="relative">
                           <input
                              type={showPass ? 'text' : 'password'}
                              required
                              value={passwords.current}
                              onChange={e => setPasswords({...passwords, current: e.target.value})}
                              className="w-full h-11 bg-slate-50 dark:bg-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all dark:text-white"
                           />
                           <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 text-slate-900 dark:text-white">
                              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                           </button>
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 tracking-widest ml-1">NEW PASSWORD</label>
                        <input
                           type="password"
                           required
                           value={passwords.new}
                           onChange={e => setPasswords({...passwords, new: e.target.value})}
                           className="w-full h-11 bg-slate-50 dark:bg-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all dark:text-white"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 tracking-widest ml-1">CONFIRM NEW PASSWORD</label>
                        <input
                           type="password"
                           required
                           value={passwords.confirm}
                           onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                           className="w-full h-11 bg-slate-50 dark:bg-gray-800 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all dark:text-white"
                        />
                     </div>

                     <button 
                        disabled={loading}
                        className="w-full h-12 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-xs tracking-widest uppercase mt-4 shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                     >
                        {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Confirm security update'}
                     </button>
                  </form>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* ⚠️ DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
         {showDeleteConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !loading && setShowDeleteConfirm(false)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
               />
               <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="w-full max-w-[300px] bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl relative z-10 text-center"
               >
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 border border-rose-100">
                     <AlertTriangle size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Wait! Delete?</h3>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-gray-500 mt-3 uppercase tracking-widest leading-relaxed">
                     This is irreversible. All your profile data, history, and settings will be purged.
                  </p>
                  
                  <div className="flex flex-col gap-2 mt-8">
                     <button
                        disabled={loading}
                        onClick={handleDeleteAccount}
                        className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center"
                     >
                        {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Yes, Delete account'}
                     </button>
                     <button
                        disabled={loading}
                        onClick={() => setShowDeleteConfirm(false)}
                        className="w-full py-4 bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                     >
                        I want to stay
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default SecuritySettings;
