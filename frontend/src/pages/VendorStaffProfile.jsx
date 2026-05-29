import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Scissors, Calendar, ShieldCheck, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useVendorStore } from '../store/vendorStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const VendorStaffProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { staffData, fetchStaff } = useVendorStore();

  // Find staff from pre-fetched Zustand store
  const storeStaff = useMemo(() => {
    return (staffData || []).find(s => s._id === id);
  }, [staffData, id]);

  const [staff, setStaff] = useState(storeStaff || null);

  // Sync state if store gets updated
  useEffect(() => {
    if (storeStaff) {
      setStaff(storeStaff);
    }
  }, [storeStaff]);

  const loadData = async () => {
    try {
      // If staff is not in store, fetch it
      if (!storeStaff) {
        await fetchStaff(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, storeStaff]);

  const totalEarnings = staff?.totalEarnings || 0;
  const isActive = staff ? (staff.isActive && !staff.activeClosure) : false;
  const activeClosure = staff?.activeClosure;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800 px-4 pt-[40px] pb-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/vendor/staff')} 
            className="p-2 active:scale-90 transition-all text-slate-700 dark:text-white"
          >
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[18px] font-black text-[#0B1222] dark:text-white tracking-tight truncate">
              Staff Profile
            </h1>
            <p className="text-[10px] font-black text-[#0B1222]/35 dark:text-gray-400 tracking-widest uppercase truncate">
              {staff?.name || 'Loading...'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="px-4 pt-[104px] space-y-4 max-w-4xl mx-auto">
        
        {/* Profile Card */}
        <section className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-3.5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#00246b]/5 to-transparent rounded-bl-full pointer-events-none" />
          
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 flex-shrink-0 flex items-center justify-center shadow-inner">
              {staff?.image ? (
                <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-slate-300 dark:text-gray-600" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 dark:text-white truncate tracking-tight">
                  {staff?.name || '...'}
                </h2>
                {staff && (
                  <div className="inline-flex">
                    {isActive ? (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight">Active</span>
                    ) : activeClosure ? (
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight">Absent</span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight">Inactive</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-[#00246b] dark:text-slate-300 uppercase tracking-wider">
                {staff?.designation || 'Staff Member'}
              </p>
              
              <div className="flex flex-col gap-0.5 mt-1.5 text-left">
                {staff?.phone && (
                  <a href={`tel:${staff.phone}`} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-gray-400 hover:text-[#00246b] transition-all">
                    <Phone size={10} />
                    <span>+91 {staff.phone}</span>
                  </a>
                )}
                {staff?.isOwner && (
                  <div className="inline-flex items-center gap-1 text-[8px] font-black text-amber-600 uppercase tracking-widest mt-0.5">
                    <ShieldCheck size={10} className="text-amber-500" />
                    <span>Shop Owner</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl p-3 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Total Earnings</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{totalEarnings.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl p-3 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Assigned Skills</p>
            <p className="text-lg font-black text-[#00246b] dark:text-white mt-0.5">{staff?.services?.length || 0}</p>
          </div>
        </section>

        {/* Assigned Services / Skills */}
        <section className="space-y-1.5">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider pl-1">Skills & Services</h3>
          <div className="grid gap-2">
            {staff?.services && staff.services.length > 0 ? (
              staff.services.map((service) => (
                <div key={service._id} className="p-2.5 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-50 dark:bg-gray-850 flex-shrink-0 flex items-center justify-center border border-slate-100 dark:border-gray-800">
                      {service.image ? (
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                      ) : (
                        <Scissors size={14} className="text-slate-300 dark:text-gray-650" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">{service.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{service.duration} mins</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#00246b] dark:text-white">₹{service.price}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-center bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                {staff ? 'No skills or services assigned' : 'Loading skills...'}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
};

export default VendorStaffProfile;
