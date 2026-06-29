import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Scissors, Calendar, ShieldCheck, Clock, CheckCircle2, AlertCircle, Sparkles, ChevronLeft, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useVendorStore } from '../store/vendorStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const VendorStaffProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { staffData, fetchStaff, dashboardData } = useVendorStore();

  // Find staff from pre-fetched Zustand store
  const storeStaff = useMemo(() => {
    return (staffData || []).find(s => s._id === id);
  }, [staffData, id]);

  const [staff, setStaff] = useState(storeStaff || null);
  const [filterPeriod, setFilterPeriod] = useState('lifetime'); // lifetime, custom
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  // Sync state if store gets updated
  useEffect(() => {
    if (storeStaff) {
      setStaff(storeStaff);
    }
  }, [storeStaff]);

  const fetchStaffDetails = async () => {
    try {
      const params = filterPeriod === 'custom' ? { startDate, endDate } : {};
      const res = await api.get(`/staff/${id}`, { params });
      setStaff(res.data);
    } catch (err) {
      toast.error('Failed to load staff details');
    }
  };

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

  useEffect(() => {
    fetchStaffDetails();
  }, [id, filterPeriod, startDate, endDate]);

  const totalEarnings = staff?.totalEarnings || 0;
  const isActive = staff ? (staff.isActive && !staff.activeClosure) : false;
  const activeClosure = staff?.activeClosure;
  
  const handleEdit = () => {
    if (!staff) return;
    if (dashboardData && !dashboardData.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to edit staff.', { id: 'account-inactive', duration: 2000 });
    }
    navigate(`/vendor/staff/edit/${staff._id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800 px-4 pt-[48px] pb-3">
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
      <main className="px-4 pt-[112px] space-y-4 max-w-4xl mx-auto">
        
        <section className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-3.5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#00246b]/5 to-transparent rounded-bl-full pointer-events-none" />
          
          {staff && (
            <button 
              onClick={handleEdit}
              className="absolute top-3.5 right-3.5 p-2 bg-slate-50 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90 z-20 shadow-sm border border-slate-100 dark:border-gray-700"
              title="Edit Staff Profile"
            >
              <Edit3 size={16} />
            </button>
          )}
          
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
                {staff?.createdAt && (
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-gray-400">
                    <Calendar size={10} className="text-slate-400" />
                    <span>Onboarded: {dayjs(staff.createdAt).format('DD MMM YYYY')}</span>
                  </div>
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
        {/* Earnings Filter */}
        <section className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest pl-1">Earnings Filter</h3>
            <div className="flex gap-1.5">
              {[
                { id: 'lifetime', label: 'Lifetime' },
                { id: 'custom', label: 'Custom' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilterPeriod(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black capitalize tracking-widest border transition-all ${
                    filterPeriod === item.id
                      ? 'bg-[#00246b] text-white border-[#00246b]'
                      : 'bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-400 border-slate-100 dark:border-gray-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filterPeriod === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-800/50 p-2 rounded-2xl border border-slate-100 dark:border-gray-800/50 mt-1">
              <div className="flex-1 space-y-1 text-left">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest pl-1">Start Date</p>
                <div className="relative group">
                  <input
                    type="date"
                    value={startDate}
                    max={dayjs().format('YYYY-MM-DD')}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="w-full h-8 bg-white dark:bg-gray-900 border-none rounded-lg px-2 text-[9px] font-black text-gray-900 dark:text-white focus:ring-1 ring-primary/20 [color-scheme:dark] cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 text-gray-300">
                <ChevronLeft className="rotate-180 opacity-20" size={14} strokeWidth={3} />
              </div>

              <div className="flex-1 space-y-1 text-left">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest pl-1">End Date</p>
                <div className="relative group">
                  <input
                    type="date"
                    value={endDate}
                    max={dayjs().format('YYYY-MM-DD')}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="w-full h-8 bg-white dark:bg-gray-900 border-none rounded-lg px-2 text-[9px] font-black text-gray-900 dark:text-white focus:ring-1 ring-primary/20 [color-scheme:dark] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl p-3 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">
              {filterPeriod === 'custom' ? 'Filtered Earnings' : 'Total Earnings'}
            </p>
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
