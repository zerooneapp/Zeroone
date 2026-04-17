import React from 'react';
import { User, Phone, Scissors, CheckCircle2, ChevronRight, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';

const StaffCard = ({ staff, onToggle, onEdit }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3.5 bg-white dark:bg-gray-900 rounded-[1.75rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3 transition-all w-full min-w-0 overflow-hidden`}
    >
      <div className="w-14 h-14 rounded-[1.25rem] overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
         {staff.image ? (
            <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
         ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
               <User size={24} />
            </div>
         )}
      </div>

      <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2">
            <h3 className="font-black text-gray-900 dark:text-white truncate tracking-tight flex-1">{staff.name}</h3>
            {staff.totalEarnings > 0 && (
               <div className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter whitespace-nowrap flex-shrink-0">
                  ₹{staff.totalEarnings.toLocaleString()} Earned
               </div>
            )}
         </div>
         <p className="text-[9px] font-bold text-gray-400 capitalize tracking-tight leading-none mt-0.5">{staff.designation || 'Staff Member'}</p>
         
         <div className="flex flex-col gap-1 mt-2">
            <p className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 opacity-60">
               <Phone size={10} /> {staff.phone}
            </p>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase overflow-hidden">
               <Scissors size={10} /> 
               <span className="truncate flex-1">
                  {staff.services?.map(s => s.name).join(', ') || 'No skills assigned'}
               </span>
            </div>
         </div>
      </div>

      <div className="flex flex-col gap-1.5 flex-shrink-0">
         <button 
           onClick={() => onEdit(staff)}
           className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
         >
            <Edit3 size={16} />
         </button>
          <button 
            onClick={() => onToggle(staff._id, !staff.isActive)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-300 flex-shrink-0 ${staff.isActive ? 'bg-[#1C2C4E]' : 'bg-slate-200 dark:bg-gray-800'}`}
          >
             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${staff.isActive ? 'left-6' : 'left-1'}`} />
          </button>
      </div>
    </motion.div>
  );
};

export default StaffCard;
