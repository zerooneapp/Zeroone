import React from 'react';
import { Edit3, Clock, IndianRupee, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ServiceCard = ({ service, onToggle, onEdit }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1 - (!service.isActive ? 0.4 : 0), scale: 1 }}
      className={`p-4 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4 group transition-opacity ${!service.isActive ? 'grayscale-[0.5]' : ''}`}
    >
      <div className="w-20 h-20 rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
         {service.image ? (
            <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
         ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-xs">NO IMG</div>
         )}
      </div>

      <div className="flex-1 min-w-0">
         <h3 className="font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">{service.name}</h3>
         <div className="flex items-center gap-3 mt-1">
            <p className="flex items-center gap-1 text-[10px] font-black text-primary">
               <IndianRupee size={10} /> {service.price}
            </p>
            <p className="flex items-center gap-1 text-[10px] font-black text-gray-400">
               <Clock size={10} /> {service.duration}m {service.bufferTime > 0 && `(+${service.bufferTime}m)`}
            </p>
         </div>
         {!service.isActive && (
            <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 text-[8px] font-black uppercase rounded-lg border border-gray-200 dark:border-gray-700">
               Inactive
            </span>
         )}
      </div>

      <div className="flex flex-col gap-2">
         <button 
           onClick={() => onEdit(service)}
           className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
         >
            <Edit3 size={18} />
         </button>
         <button 
           onClick={() => onToggle(service._id, !service.isActive)}
           className={`w-12 h-6 rounded-full relative transition-all duration-300 ${service.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-800'}`}
         >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${service.isActive ? 'left-7' : 'left-1'}`} />
         </button>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
