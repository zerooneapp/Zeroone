import React, { useState } from 'react';
import { X, User, Lock, Phone, UserPlus, Shield, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const AdminProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'create'
  const [loading, setLoading] = useState(false);

  // My Profile State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: ''
  });

  // Create Admin State
  const [adminData, setAdminData] = useState({
    name: '',
    phone: '',
    password: '',
    email: ''
  });

  const handlePhoneChange = (type, value) => {
    let val = value.replace(/\D/g, '');
    if ((val.startsWith('91') || val.startsWith('0')) && val.length > 10) {
      val = val.slice(-10);
    }
    val = val.slice(0, 10);
    
    if (type === 'profile') {
      setProfileData({ ...profileData, phone: val });
    } else {
      setAdminData({ ...adminData, phone: val });
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (profileData.password && profileData.password !== profileData.confirmPassword) {
      return toast.error("Passwords don't match");
    }

    try {
      setLoading(true);
      const res = await api.patch('/admin/profile', {
        name: profileData.name,
        phone: profileData.phone,
        password: profileData.password || undefined
      });
      setUser(res.data.admin);
      toast.success('Profile updated successfully');
      setProfileData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/admin/admins', adminData);
      toast.success('New Admin created successfully');
      setAdminData({ name: '', phone: '', password: '', email: '' });
      setActiveTab('profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Shield size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-[#1C2C4E] dark:text-white uppercase tracking-tight leading-none">
                  Admin Control
                </h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Manage Account
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 active:scale-90 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="p-1 flex gap-1 bg-gray-50 dark:bg-gray-800/50 m-4 rounded-xl border border-gray-100/50 dark:border-gray-700/30">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-gray-900 text-primary shadow-sm dark:text-white border border-gray-100/50 dark:border-gray-700/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User size={12} />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-gray-900 text-primary shadow-sm dark:text-white border border-gray-100/50 dark:border-gray-700/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserPlus size={12} />
              New Admin
            </button>
          </div>

          <div className="p-5 pt-0">
            {activeTab === 'profile' ? (
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-[13px] font-bold focus:ring-2 focus:ring-primary/20 dark:text-white transition-all"
                      placeholder="Admin Name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Phone</label>
                  <div className="relative flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <Phone className="text-slate-300 mr-2" size={16} />
                    <span className="text-[13px] font-bold text-slate-400 border-r border-slate-200 dark:border-gray-700 pr-2 mr-2">+91</span>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handlePhoneChange('profile', e.target.value)}
                      className="w-full bg-transparent border-none py-2.5 text-[13px] font-bold outline-none dark:text-white"
                      placeholder="Phone number"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input
                        type="password"
                        value={profileData.password}
                        onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-[13px] font-bold focus:ring-2 focus:ring-primary/20 dark:text-white transition-all"
                        placeholder="••••"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Confirm</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input
                        type="password"
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-[13px] font-bold focus:ring-2 focus:ring-primary/20 dark:text-white transition-all"
                        placeholder="••••"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                  Save Changes
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateAdmin} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      type="text"
                      value={adminData.name}
                      onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-[13px] font-bold focus:ring-2 focus:ring-primary/20 dark:text-white transition-all"
                      placeholder="New Admin Name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Phone</label>
                  <div className="relative flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3.5 focus-within:ring-2 focus-within:ring-[#1C2C4E]/20 transition-all">
                    <Phone className="text-slate-300 mr-2" size={16} />
                    <span className="text-[13px] font-bold text-slate-400 border-r border-slate-200 dark:border-gray-700 pr-2 mr-2">+91</span>
                    <input
                      type="tel"
                      value={adminData.phone}
                      onChange={(e) => handlePhoneChange('admin', e.target.value)}
                      className="w-full bg-transparent border-none py-2.5 text-[13px] font-bold outline-none dark:text-white"
                      placeholder="10 digits"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      type="password"
                      value={adminData.password}
                      onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-[13px] font-bold focus:ring-2 focus:ring-primary/20 dark:text-white transition-all"
                      placeholder="Min 8 chars"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1C2C4E] text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#1C2C4E]/20 hover:shadow-xl active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
                  Create Admin
                </button>
              </form>
            )}
          </div>
          
          <div className="py-3 bg-gray-50 dark:bg-gray-800/30 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">
              ZeroOne Admin Security
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdminProfileModal;
