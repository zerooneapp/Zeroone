import React, { useState } from 'react';
import {
   BellRing, Send, Users, Store,
   Briefcase, Globe, Info, Zap,
   RefreshCw, MessageSquare, ShieldAlert,
   ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const BroadcastSystem = () => {
   const [formData, setFormData] = useState({
      title: '',
      message: '',
      targetAudience: 'all'
   });
   const [loading, setLoading] = useState(false);
   const [isConfirmOpen, setIsConfirmOpen] = useState(false);

   const targets = [
      { id: 'all', name: 'Global Audience', icon: Globe, color: 'primary', desc: 'Notify every registered entity' },
      { id: 'customer', name: 'Users Only', icon: Users, color: 'blue', desc: 'Dispatch to all app customers' },
      { id: 'vendor', name: 'Vendors Only', icon: Store, color: 'emerald', desc: 'Broadcast to service providers' },
      { id: 'staff', name: 'Staff Only', icon: Briefcase, color: 'amber', desc: 'Alert platform professionals' }
   ];

   const handlePreSubmit = (e) => {
      e.preventDefault();
      if (loading) return;
      setIsConfirmOpen(true);
   };

   const executeBroadcast = async () => {
      setIsConfirmOpen(false);
      try {
         setLoading(true);
         const res = await api.post('/admin/broadcast', {
            title: formData.title,
            message: formData.message,
            targetRole: formData.targetAudience
         });
         toast.success(res.data.message || 'Transmission Successful 📡');
         setFormData({ title: '', message: '', targetAudience: 'all' });
      } catch (err) {
         toast.error(err.response?.data?.message || 'Transmission Failure: Check Infrastructure');
      } finally {
         setLoading(false);
      }
   };

   const selectedTarget = targets.find(t => t.id === formData.targetAudience);

   return (
      <div className="space-y-5 pb-20 animate-in fade-in duration-500">

         {/* 📡 HEADER */}
         <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-primary/20">
            <div className="space-y-1">
               <h1 className="text-[24px] font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Broadcast Center</h1>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-60">Mass scale cognitive dissemination</p>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-100 dark:border-gray-800 flex items-center gap-4 group hover:border-primary/20 transition-all">
               <ShieldAlert size={18} strokeWidth={3} className="text-primary hidden sm:block opacity-60 group-hover:scale-110 transition-transform" />
               <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest leading-relaxed opacity-60">
                  Broadcasts are absolute. High-frequency usage may diminish impact and user engagement.
               </p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

            {/* 🎯 TARGET SELECTION */}
            <div className="lg:col-span-1 space-y-4">
               <div className="px-2 py-1">
                  <h3 className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest opacity-60 italic">1. Select Target Demographic</h3>
               </div>
               <div className="space-y-2.5">
                  {targets.map((t) => (
                     <button
                        key={t.id}
                        onClick={() => setFormData({ ...formData, targetAudience: t.id })}
                        className={cn(
                           "w-full p-4 bg-white dark:bg-gray-900 rounded-xl border transition-all text-left flex items-start gap-4 shadow-sm hover:shadow-md",
                           formData.targetAudience === t.id
                              ? "border-primary/40 ring-2 ring-primary/5 bg-slate-50/50"
                              : "border-slate-100 dark:border-gray-800 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0"
                        )}
                     >
                        <div className={cn(
                           "p-3 rounded-lg border shrink-0 shadow-inner transition-transform",
                           formData.targetAudience === t.id ? "bg-primary text-white border-primary/20 scale-105" : "bg-slate-50 dark:bg-gray-800 border-slate-100 dark:border-gray-800 text-slate-400"
                        )}>
                           <t.icon size={18} strokeWidth={3} />
                        </div>
                        <div className="leading-tight">
                           <h4 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{t.name}</h4>
                           <p className="text-[8.5px] font-black text-slate-400 uppercase mt-0.5 tracking-widest opacity-60">{t.desc}</p>
                        </div>
                     </button>
                  ))}
               </div>
            </div>

            {/* ✍️ MESSAGE CRAFTING */}
            <div className="lg:col-span-2 space-y-4">
               <div className="px-2 py-1">
                  <h3 className="text-[9px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest opacity-60 italic">2. Craft Intelligence Payload</h3>
               </div>

               <form onSubmit={handlePreSubmit} className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-5 relative overflow-hidden group">

                  {/* SELECTED BADGE */}
                  <div className="absolute top-4 right-6 p-2.5 px-4 bg-primary text-white rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all duration-500 border border-primary/20 italic">
                     Target: {selectedTarget.name}
                  </div>

                  <div className="space-y-2">
                     <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 opacity-60">
                        <Zap size={14} strokeWidth={3} className="text-primary" /> Transmission Title
                     </label>
                     <input
                        type="text"
                        required
                        className="w-full px-4 h-11 bg-slate-50 dark:bg-gray-800/40 border border-slate-100 dark:border-gray-700 rounded-xl text-[12px] font-black text-slate-900 dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all placeholder:text-slate-300 uppercase italic shadow-inner"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. SYSTEM UPGRADE COMPLETE"
                        disabled={loading}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 opacity-60">
                        <MessageSquare size={14} strokeWidth={3} className="text-primary" /> Cognitive Message Payload
                     </label>
                     <textarea
                        required
                        className="w-full p-4 bg-slate-50 dark:bg-gray-800/40 border border-slate-100 dark:border-gray-700 rounded-xl text-[12px] font-bold text-slate-600 dark:text-gray-300 focus:ring-2 ring-primary/20 outline-none transition-all h-32 resize-none placeholder:text-slate-300 leading-relaxed italic shadow-inner no-scrollbar"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Type your message here..."
                        disabled={loading}
                     />
                  </div>

                  <div className="bg-slate-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-gray-700 shadow-inner">
                     <p className="text-[8.5px] font-black text-slate-400 px-1 uppercase tracking-widest mb-1 opacity-60">Pre-flight Intelligence Check</p>
                     <div className="flex items-center gap-3 text-emerald-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                        <p className="text-[8.5px] font-black uppercase tracking-widest italic leading-none">All systems ready for mass dissipation.</p>
                     </div>
                  </div>

                  <button
                     type="submit"
                     disabled={loading}
                     className={cn(
                        "w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10 italic",
                        loading
                           ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                           : "bg-slate-900 dark:bg-primary text-white hover:scale-[1.01] active:scale-[0.98] shadow-primary/20 group/btn border border-slate-800"
                     )}
                  >
                     {loading ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} strokeWidth={3} className="group-hover/btn:translate-x-1 transition-transform" />}
                     {loading ? "TRANSMITTING..." : "EXECUTE BROADCAST"}
                  </button>

               </form>
            </div>

         </div>

         {/* 🛡️ PREMIUM BROADCAST CONFIRM */}
         <AnimatePresence>
            {isConfirmOpen && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setIsConfirmOpen(false)}
                     className="absolute inset-0 bg-white/60 dark:bg-black/90 backdrop-blur-md"
                  />
                  <motion.div
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 p-8 shadow-2xl text-center space-y-6"
                  >
                     <div className="w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center mx-auto text-primary border border-primary/20 shadow-inner">
                        <BellRing size={24} strokeWidth={3} className="animate-bounce" />
                     </div>
                     <div>
                        <h3 className="text-[18px] font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Dissemination Alert</h3>
                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mt-2 px-4 leading-relaxed opacity-60 italic">
                           Are you sure? This broadcast will instantly reach all {formData.targetAudience} entities. This action is absolute and irreversible.
                        </p>
                     </div>
                     <div className="flex gap-2 pt-2">
                        <button
                           onClick={() => setIsConfirmOpen(false)}
                           className="flex-1 h-10 bg-slate-50 dark:bg-gray-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-sm"
                        >
                           Abort
                        </button>
                        <button
                           onClick={executeBroadcast}
                           className="flex-1 h-10 bg-slate-900 dark:bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all border border-slate-800 italic"
                        >
                           Transmit
                        </button>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>

      </div>
   );
};

export default BroadcastSystem;
