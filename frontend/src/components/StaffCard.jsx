import React from 'react';
import { User, Phone, Scissors, CheckCircle2, ChevronRight, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';

const StaffCard = ({ staff, onToggle, onEdit }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1 - (!staff.isActive ? 0.4 : 0), y: 0 }}
      className={`p-5 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 transition-all ${!staff.isActive ? 'grayscale-[0.5]' : ''}`}
    >
      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
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
            <h3 className="font-black text-gray-900 dark:text-white truncate tracking-tight">{staff.name}</h3>
            {staff.totalEarnings > 0 && (
               <div className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter whitespace-nowrap">
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
               <span className="truncate">
                  {staff.services?.map(s => s.name).join(', ') || 'No skills assigned'}
               </span>
            </div>
         </div>
      </div>

      <div className="flex flex-col gap-2">
         <button 
           onClick={() => onEdit(staff)}
           className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
         >
            <Edit3 size={18} />
         </button>
         <button 
           onClick={() => onToggle(staff._id, !staff.isActive)}
           className={`w-12 h-6 rounded-full relative transition-all duration-300 ${staff.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-800'}`}
         >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${staff.isActive ? 'left-7' : 'left-1'}`} />
         </button>
      </div>
    </motion.div>
  );
};

export default StaffCard;
