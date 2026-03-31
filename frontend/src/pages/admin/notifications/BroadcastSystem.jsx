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
      const res = await api.post('/admin/broadcast', formData);
      toast.success(res.data.message || 'Transmission Successful 📡');
      setFormData({ title: '', message: '', targetAudience: 'all' });
    } catch (err) {
      toast.error('Transmission Failure: Check Infrastructure');
    } finally {
      setLoading(false);
    }
  };

  const selectedTarget = targets.find(t => t.id === formData.targetAudience);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* 📡 HEADER */}
      <div className="p-10 bg-white dark:bg-gray-900 rounded-[3.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b-4 border-b-primary/10">
         <div className="space-y-2">
            <h1 className="text-3xl font-black dark:text-white tracking-tighter italic text-primary uppercase">Broadcast Center 📡</h1>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Mass scale cognitive dissemination</p>
         </div>
         <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
            <ShieldAlert size={20} className="text-primary" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-loose">
               Broadcasts are absolute. High-frequency usage may diminish impact and user engagement.
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
         
         {/* 🎯 TARGET SELECTION */}
         <div className="lg:col-span-1 space-y-6">
            <div className="px-6 py-2">
               <h3 className="text-xs font-black dark:text-white uppercase tracking-widest italic">1. Select Target Demographic</h3>
            </div>
            <div className="space-y-3">
               {targets.map((t) => (
                 <button 
                   key={t.id}
                   onClick={() => setFormData({...formData, targetAudience: t.id})}
                   className={cn(
                     "w-full p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border transition-all text-left flex items-start gap-5 shadow-sm hover:shadow-md",
                     formData.targetAudience === t.id 
                       ? "border-primary/40 ring-2 ring-primary/10" 
                       : "border-gray-100 dark:border-gray-800 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0"
                   )}
                 >
                    <div className={cn(
                      "p-4 rounded-2xl border shrink-0",
                      formData.targetAudience === t.id ? "bg-primary/5 border-primary/20 text-primary" : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 text-gray-400"
                    )}>
                       <t.icon size={24} />
                    </div>
                    <div>
                       <h4 className="text-xs font-black dark:text-white uppercase tracking-tight">{t.name}</h4>
                       <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">{t.desc}</p>
                    </div>
                 </button>
               ))}
            </div>
         </div>

         {/* ✍️ MESSAGE CRAFTING */}
         <div className="lg:col-span-2 space-y-6">
            <div className="px-6 py-2">
               <h3 className="text-xs font-black dark:text-white uppercase tracking-widest italic">2. Craft Intelligence Payload</h3>
            </div>
            
            <form onSubmit={handlePreSubmit} className="p-10 bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl space-y-8 relative overflow-hidden group">
               
               {/* SELECTED BADGE */}
               <div className="absolute top-0 right-10 transform translate-y-[-50%] p-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 group-hover:translate-y-4 transition-all duration-500">
                  Target: {selectedTarget.name}
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 italic flex items-center gap-2">
                     <Zap size={14} className="text-primary" /> Transmission Title
                  </label>
                  <input 
                    type="text"
                    required
                    className="w-full px-8 py-5 bg-gray-50 dark:bg-gray-800/40 border-none rounded-[2rem] text-sm font-black dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all placeholder:text-gray-300"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. SYSTEM UPGRADE COMPLETE"
                    disabled={loading}
                  />
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 italic flex items-center gap-2">
                     <MessageSquare size={14} className="text-primary" /> Cognitive Message Payload
                  </label>
                  <textarea 
                    required
                    className="w-full px-8 py-6 bg-gray-50 dark:bg-gray-800/40 border-none rounded-[2.5rem] text-sm font-medium dark:text-white focus:ring-2 ring-primary/20 outline-none transition-all h-40 resize-none placeholder:text-gray-300 leading-relaxed"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Type your message here..."
                    disabled={loading}
                  />
               </div>

               <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-black text-gray-400 px-2 uppercase tracking-widest mb-1">Pre-flight Intelligence Check</p>
                  <div className="flex items-center gap-4 text-emerald-500">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                     <p className="text-[9px] font-bold uppercase tracking-widest italic">All systems ready for mass dissipation.</p>
                  </div>
               </div>

               <button 
                 type="submit"
                 disabled={loading}
                 className={cn(
                   "w-full py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-xl",
                   loading 
                     ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                     : "bg-primary text-white hover:scale-[1.01] active:scale-[0.98] shadow-primary/20 group/btn"
                 )}
               >
                  {loading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} className="group-hover/btn:translate-x-1 transition-transform" />}
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
                className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 p-10 shadow-2xl text-center space-y-6"
              >
                  <div className="w-20 h-20 bg-primary/5 dark:bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary border border-primary/20">
                     <BellRing size={40} />
                  </div>
                  <div>
                     <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter italic">Dissemination Alert</h3>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-4 leading-relaxed">
                        Are you sure? This broadcast will instantly reach all {formData.targetAudience} entities. This action is absolute.
                     </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                     <button 
                       onClick={() => setIsConfirmOpen(false)}
                       className="flex-1 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                     >
                        Abort
                     </button>
                     <button 
                       onClick={executeBroadcast}
                       className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
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
