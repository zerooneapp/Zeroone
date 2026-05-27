import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Calendar, CheckCircle2, Clock, AlertCircle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyMemberships } from '../services/membershipService';
import dayjs from 'dayjs';
import { cn } from '../utils/cn';

const MyMemberships = () => {
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState(() => window.__PREFETCHED_DATA__?.memberships || []);
  const [loading, setLoading] = useState(() => !window.__PREFETCHED_DATA__?.memberships);

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const shouldShowLoading = memberships.length === 0;
        if (shouldShowLoading) setLoading(true);
        const res = await getMyMemberships();
        setMemberships(res.data || []);
        if (window.__PREFETCHED_DATA__) {
          window.__PREFETCHED_DATA__.memberships = res.data;
        }
      } catch (err) {
        console.error('Failed to fetch memberships');
      } finally {
        setLoading(false);
      }
    };
    fetchMemberships();
  }, []);

  const MembershipCard = ({ membership }) => {
    const isExpired = dayjs(membership.endDate).isBefore(dayjs()) || membership.status === 'expired';
    
    return (
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 p-6 shadow-sm relative overflow-hidden group mb-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
        
        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-slate-800 dark:text-white capitalize">{membership.planId?.name}</h3>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                membership.status === 'pending' && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                membership.status === 'rejected' && "bg-red-500/10 text-red-500 border-red-500/20",
                membership.status === 'active' && !isExpired && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                isExpired && "bg-rose-500/10 text-rose-500 border-rose-500/20"
              )}>
                {isExpired ? 'Expired' : membership.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin size={12} />
              <p className="text-[10px] font-bold uppercase tracking-tight">{membership.vendorId?.shopName}</p>
            </div>
            {membership.status === 'active' && membership.ticketId && (
              <div className="mt-2 inline-flex items-center gap-2 bg-slate-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Digital Ticket</span>
                <span className="text-xs font-black text-[#1C2C4E] dark:text-primary tracking-wider">{membership.ticketId}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
            membership.status === 'active' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-slate-100 text-slate-400 border-slate-200"
          )}>
            <Crown size={24} />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {(membership.status === 'active' || membership.status === 'expired') && (
            <div className="space-y-2.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Usage Progress</p>
              <div className="space-y-3">
                {membership.usage?.map((item) => {
                  const percentage = Math.min((item.usedCount / item.usageLimit) * 100, 100);
                  const isExhausted = item.usedCount >= item.usageLimit;

                  return (
                    <div key={item.serviceId?._id} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 capitalize">
                          {item.serviceId?.name}
                        </p>
                        <p className="text-[10px] font-black text-[#1C2C4E] dark:text-primary tracking-tighter">
                          {item.usedCount} / {item.usageLimit} <span className="text-slate-400 font-bold ml-1 uppercase text-[8px]">Used</span>
                        </p>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            isExhausted ? "bg-slate-300" : "bg-gradient-to-r from-amber-400 to-amber-500"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-300" />
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Valid Until</p>
                <p className="text-[11px] font-black text-slate-700 dark:text-white leading-none">
                  {dayjs(membership.endDate).format('DD MMMM, YYYY')}
                </p>
              </div>
            </div>
            {!isExpired && (
              <button
                onClick={() => navigate(`/service/${membership.vendorId?._id}`)}
                className="px-5 py-2.5 bg-[#1C2C4E] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-[#1C2C4E]/20 active:scale-95 transition-all"
              >
                Book Now
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-32">
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 px-4 pt-[38px] pb-3 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-black tracking-tighter leading-none text-[#1C2C4E] dark:text-white">My Memberships</h1>
            <p className="text-[9px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em] opacity-80 leading-none">Exclusive Benefits</p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-[112px]">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] animate-pulse" />)}
          </div>
        ) : memberships.length === 0 ? (
          <div className="py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[3rem] flex items-center justify-center mx-auto text-slate-200 dark:text-gray-800 border border-slate-100 dark:border-gray-800 shadow-sm">
              <Crown size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">No Active Plans</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] max-w-[250px] mx-auto leading-relaxed">
                You haven't purchased any membership plans yet. Explore partners to find elite deals.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3.5 bg-[#1C2C4E] text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl active:scale-95 transition-all"
            >
              Explore Partners
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {memberships.map((membership) => (
              <MembershipCard key={membership._id} membership={membership} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyMemberships;
