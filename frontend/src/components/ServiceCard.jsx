import React from 'react';
import { Edit3, Clock, IndianRupee, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ServiceCard = ({ service, onToggle, onEdit }) => {
   return (
      <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1 - (!service.isActive ? 0.4 : 0), scale: 1 }}
         className={`p-3 bg-white dark:bg-gray-900/40 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex items-center gap-3 transition-opacity active:scale-[0.98] ${!service.isActive ? 'grayscale-[0.5]' : ''}`}
      >
         <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 dark:bg-gray-800 flex-shrink-0 border border-slate-100 dark:border-gray-700 shadow-inner group-hover:scale-105 transition-transform">
            {service.image ? (
               <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-gray-600 font-black text-[7px] uppercase tracking-tighter leading-none p-1 text-center">
                  <span>NO</span>
                  <span>IMG</span>
               </div>
            )}
         </div>

         <div className="flex-1 min-w-0">
            <h3 className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-tight leading-tight">{service.name}</h3>
            <div className="flex items-center gap-2.5 mt-0.5">
               <p className="flex items-center gap-0.5 text-[9px] font-black text-primary uppercase tracking-tighter">
                  <IndianRupee size={8} strokeWidth={3} /> {service.price}
               </p>
               <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-gray-800" />
               <p className="flex items-center gap-0.5 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                  <Clock size={8} strokeWidth={3} /> {service.duration}m
               </p>
            </div>
            {!service.isActive && (
               <div className="mt-1 flex">
                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-800 text-slate-400 text-[6px] font-black uppercase rounded-md border border-slate-200 dark:border-gray-700 tracking-widest leading-none">
                     Disabled
                  </span>
               </div>
            )}
         </div>

         <div className="flex flex-col gap-1.5 items-end">
            <button
               onClick={() => onEdit(service)}
               className="w-10 h-8 flex items-center justify-center bg-slate-50 dark:bg-gray-800/80 text-slate-500 border border-slate-100 dark:border-gray-700 rounded-lg hover:bg-primary/10 hover:text-primary transition-all active:scale-90 shadow-sm"
            >
               <Edit3 size={14} />
            </button>
            <button
               onClick={() => onToggle(service._id, !service.isActive)}
               className={`w-10 h-5 rounded-full relative transition-all duration-300 border ${service.isActive ? 'bg-green-500 border-green-600' : 'bg-slate-200 dark:bg-gray-800 border-slate-300 dark:border-gray-700'}`}
            >
               <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all duration-300 ${service.isActive ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
         </div>
      </motion.div>
   );
};

export default ServiceCard;
