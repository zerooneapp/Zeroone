import React, { useState, useEffect } from 'react';
import { 
  User, ShieldCheck, Calendar, Phone, 
  ChevronRight, LogOut, Briefcase, Award,
  Clock, CheckCircle, TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Navbar from '../layouts/Navbar';

const StaffAccount = () => {
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff/profile');
      setProfile(res.data);
    } catch (err) {
      toast.error('Failed to load professional profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
       <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
       {/* Identity Card */}
       <div className="p-8 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 rounded-b-[3rem] shadow-xl shadow-black/5">
          <div className="flex flex-col items-center text-center space-y-4 pt-4">
             <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-[2.5rem] border-4 border-white dark:border-gray-950 shadow-xl overflow-hidden">
                {profile?.image ? <img src={profile.image} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-300 m-6" />}
             </div>
             <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{profile?.name}</h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Specialist Partner</p>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-10">
             <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-3xl text-center">
                <Award size={20} className="text-primary mx-auto mb-2" />
                <p className="text-xs font-black text-gray-900 dark:text-white">Elite</p>
             </div>
             <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-3xl text-center">
                <CheckCircle size={20} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-black text-gray-900 dark:text-white">Active</p>
             </div>
             <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-3xl text-center">
                <TrendingUp size={20} className="text-blue-500 mx-auto mb-2" />
                <p className="text-xs font-black text-gray-900 dark:text-white">98%</p>
             </div>
          </div>
       </div>

       {/* Professional Details Section */}
       <div className="p-6 space-y-6">
          <div className="space-y-4">
             <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Work Identity</h2>
             
             <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 space-y-6 shadow-sm">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center">
                      <Calendar size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Joined On</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white mt-1">{formatDate(profile?.createdAt)}</p>
                   </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-xl flex items-center justify-center">
                      <Briefcase size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Skill Authorization</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                         {profile?.services?.map(s => (
                           <span key={s._id} className="text-[8px] font-black bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full text-gray-500 uppercase tracking-widest">{s.name}</span>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Employment & Support</h2>
             
             <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/5 dark:bg-primary/20 text-primary rounded-xl flex items-center justify-center">
                         <ShieldCheck size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Shop / Boss</p>
                         <p className="text-sm font-black text-gray-900 dark:text-white mt-1">{profile?.vendorId?.shopName || 'Partner Hub'}</p>
                      </div>
                   </div>
                   {profile?.vendorId?.ownerId?.phone && (
                     <a href={`tel:${profile.vendorId.ownerId.phone}`} className="p-3 bg-gray-50 dark:bg-gray-800 text-primary rounded-xl border border-gray-100 dark:border-gray-800">
                        <Phone size={18} />
                     </a>
                   )}
                </div>
             </div>
          </div>

          <button 
             onClick={logout}
             className="w-full h-14 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-[2rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest border border-red-100 dark:border-red-900/20 active:scale-95 transition-all"
          >
             <LogOut size={18} />
             Logout from Account
          </button>
       </div>

       <Navbar />
    </div>
  );
};

export default StaffAccount;
