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
  const [filterPeriod] = useState('custom'); // Locked to custom as requested
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [activeTab, setActiveTab] = useState('custom');

  // Sync state if store gets updated
  useEffect(() => {
    if (storeStaff) {
      setStaff(storeStaff);
      setNoteText(storeStaff.note || '');
    }
  }, [storeStaff]);

  const fetchStaffDetails = async () => {
    try {
      const params = { startDate, endDate };
      const res = await api.get(`/staff/${id}`, { params });
      setStaff(res.data);
      setNoteText(res.data.note || '');
    } catch (err) {
      toast.error('Failed to load staff details');
    }
  };

  const handleSaveNote = async () => {
    try {
      setSavingNote(true);
      await api.patch(`/staff/${id}`, { note: noteText });
      toast.success('Note saved successfully 📝');
      // Refresh details
      fetchStaffDetails();
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
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
  }, [id, startDate, endDate]);

  const totalEarnings = staff?.totalEarnings || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <header className="px-4 pt-[48px] pb-3 fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 bg-slate-50/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800/60 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold shrink-0"
          >
            <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none">
              Staff Profile
            </h1>
            <p className="text-[9px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em] opacity-80 leading-none mt-1">
              {staff?.name || 'Staff Member'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/vendor/staff/edit/${id}`)}
          className="p-2.5 bg-[#00246b] text-white rounded-xl shadow-xl shadow-[#00246b]/20 active:scale-95 transition-all font-bold"
        >
          <Edit3 size={18} />
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 pt-[102px] space-y-3">
        {/* Profile Card */}
        <section className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-3xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 dark:bg-gray-800 flex-shrink-0 border border-slate-100 dark:border-gray-700 shadow-inner">
              {staff?.image ? (
                <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#00246b] dark:text-white font-black text-lg bg-[#00246b]/10 dark:bg-white/10">
                  {staff?.name?.[0]?.toUpperCase() || <User size={24} />}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 dark:text-white truncate">
                  {staff?.name}
                </h2>
                {staff?.isActive ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[7px] font-black uppercase tracking-widest border border-emerald-500/20">Active</span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full text-[7px] font-black uppercase tracking-widest border border-red-500/20">Inactive</span>
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
              </div>
            </div>
          </div>
        </section>

        {/* Tab Toggle */}
        <div className="flex bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 p-1 rounded-2xl shadow-sm gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === 'custom'
                ? 'bg-[#00246b] text-white shadow-sm'
                : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Custom
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('note')}
            className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === 'note'
                ? 'bg-[#00246b] text-white shadow-sm'
                : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Note
          </button>
        </div>

        {activeTab === 'note' && (
          /* Note Section */
          <section className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest pl-1">Staff Note</h3>
            <div className="space-y-2">
              <textarea
                placeholder="Write a private note about this staff member..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full h-16 p-2 bg-slate-50 dark:bg-gray-800 text-[11px] font-bold text-slate-700 dark:text-white rounded-xl border border-slate-100 dark:border-gray-700 outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-slate-400 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="px-4 py-1.5 bg-[#00246b] text-white font-black text-[9px] uppercase tracking-widest rounded-lg active:scale-95 disabled:opacity-50 transition-all"
                >
                  {savingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'custom' && (
          /* Earnings Filter */
          <section className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest pl-1">Earnings Filter</h3>
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-50 dark:bg-gray-800 rounded-md">Custom</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-800/50 p-2 rounded-2xl border border-slate-100 dark:border-gray-800/50 mt-1">
              <div className="flex-1 space-y-1 text-left">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest pl-1">Start Date</p>
                <div className="relative group">
                  <input
                    type="date"
                    value={startDate}
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
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="w-full h-8 bg-white dark:bg-gray-900 border-none rounded-lg px-2 text-[9px] font-black text-gray-900 dark:text-white focus:ring-1 ring-primary/20 [color-scheme:dark] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'custom' && (
          <>
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
          </>
        )}

      </main>
    </div>
  );
};

export default VendorStaffProfile;
