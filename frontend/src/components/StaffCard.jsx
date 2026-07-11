import React from 'react';
import { User, Phone, Scissors, CheckCircle2, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const StaffCard = ({ staff, onToggle, onEdit, onDelete, onCardClick }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3 transition-all w-full min-w-0 overflow-hidden`}
    >
      <div 
        onClick={onCardClick}
        className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer"
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
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
           </div>
           <p className="text-[9px] font-bold text-gray-400 dark:text-gray-300 capitalize tracking-tight leading-none mt-0.5">{staff.designation || 'Staff Member'}</p>
           
           <div className="flex flex-col gap-1 mt-2">
               <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                  <span>Today: ₹{(staff.todayEarnings || 0).toLocaleString()}</span>
               </div>
           </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 flex-shrink-0 items-center">
         <div className="flex gap-1.5">
            {!staff.isOwner && (
               <button 
                 onClick={() => onDelete && onDelete(staff)}
                 className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                 title="Delete Staff Permanently"
               >
                  <Trash2 size={16} />
               </button>
            )}
         </div>
          <button 
            onClick={() => onToggle(staff._id, !staff.isActive || staff.activeClosure)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-300 flex-shrink-0 ${
              (staff.isActive && !staff.activeClosure) ? 'bg-[#00246b]' : 
              staff.activeClosure ? 'bg-amber-500' : 'bg-slate-200 dark:bg-gray-800'
            }`}
          >
             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${(staff.isActive && !staff.activeClosure) ? 'left-6' : 'left-1'}`} />
          </button>
          {staff.activeClosure && (
            <div className="flex flex-col items-center mt-1">
              <span className="text-[7px] font-black text-amber-600 uppercase text-center tracking-tighter leading-none">On Absence</span>
              <span className="text-[6px] font-black text-slate-400 dark:text-white/60 text-center tracking-tighter mt-0.5 leading-none whitespace-nowrap">
                {(() => {
                  const start = dayjs(staff.activeClosure.startTime);
                  const end = dayjs(staff.activeClosure.endTime);
                  return start.isSame(end, 'day')
                    ? `${start.format('h:mm A')} - ${end.format('h:mm A')}`
                    : `${start.format('DD MMM')} - ${end.format('DD MMM')}`;
                })()}
              </span>
            </div>
          )}
      </div>
    </motion.div>
  );
};

export default StaffCard;
