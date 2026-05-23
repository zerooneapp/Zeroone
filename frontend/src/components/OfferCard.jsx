import React from 'react';
import { Tag, Calendar, Scissors, Edit3, Trash2, IndianRupee, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const OfferCard = ({ offer, onToggle, onEdit }) => {
  const isExpired = new Date(offer.expiryDate) < new Date();
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-2 transition-all relative overflow-hidden`}
    >
      {/* Discount Badge */}
      <div className="flex items-center justify-between">
         <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 ${
           offer.discountType === 'percentage' 
           ? 'bg-[#1C2C4E]/10 text-[#1C2C4E]' 
           : 'bg-green-500/10 text-green-600'
         }`}>
            {offer.discountType === 'percentage' ? <Percent size={12} /> : <IndianRupee size={12} />}
            <span className="font-black text-xs uppercase tracking-tight">
               {offer.discountType === 'percentage' ? `${offer.value}% OFF` : `₹${offer.value} OFF`}
            </span>
         </div>
         
         <div className="flex items-center gap-2">
            <button 
              onClick={() => onEdit(offer)}
              className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-lg hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
            >
               <Edit3 size={15} />
            </button>
            <button 
              onClick={() => onToggle(offer._id, !offer.isActive)}
              className={`w-10 h-5 rounded-full relative transition-all duration-300 ${offer.isActive && !isExpired ? 'bg-[#1C2C4E]' : 'bg-red-600'}`}
            >
               <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${offer.isActive && !isExpired ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
         </div>
      </div>

      <div className="space-y-0.5">
         <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-base leading-none">{offer.title}</h3>
         <div className="flex items-center gap-3">
            <p className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400">
               <Calendar size={10} /> {dayjs(offer.expiryDate).format('DD MMM YYYY')}
            </p>
            {isExpired && (
                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Expired</span>
            )}
         </div>
      </div>

      <div className="flex items-center gap-2 pt-1.5 border-t border-gray-50 dark:border-gray-800">
         <Scissors size={10} className="text-gray-400" />
         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
            {offer.serviceIds?.length > 0 
              ? `Applicable to ${offer.serviceIds.length} services`
              : 'Applicable to ALL services'}
         </p>
      </div>

      {/* Glassy Background Icon */}
      <Tag className="absolute -right-3 -bottom-3 text-gray-50 dark:text-gray-800/10 -rotate-12 w-16 h-16 -z-1" />
    </motion.div>
  );
};

export default OfferCard;
