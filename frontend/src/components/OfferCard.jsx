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
      className={`p-5 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 transition-all relative overflow-hidden`}
    >
      {/* Discount Badge */}
      <div className="flex items-center justify-between">
         <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 ${
           offer.discountType === 'percentage' 
           ? 'bg-purple-500/10 text-purple-600' 
           : 'bg-green-500/10 text-green-600'
         }`}>
            {offer.discountType === 'percentage' ? <Percent size={14} /> : <IndianRupee size={14} />}
            <span className="font-black text-sm uppercase tracking-tight">
               {offer.discountType === 'percentage' ? `${offer.value}% OFF` : `₹${offer.value} OFF`}
            </span>
         </div>
         
         <div className="flex items-center gap-2">
            <button 
              onClick={() => onEdit(offer)}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
            >
               <Edit3 size={18} />
            </button>
            <button 
              onClick={() => onToggle(offer._id, !offer.isActive)}
              className={`w-12 h-6 rounded-full relative transition-all duration-300 ${offer.isActive && !isExpired ? 'bg-green-500' : 'bg-red-600'}`}
            >
               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${offer.isActive && !isExpired ? 'left-7' : 'left-1'}`} />
            </button>
         </div>
      </div>

      <div className="space-y-1">
         <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-lg">{offer.title}</h3>
         <div className="flex items-center gap-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
               <Calendar size={12} /> Expiry: {dayjs(offer.expiryDate).format('DD MMM YYYY')}
            </p>
            {isExpired && (
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Expired</span>
            )}
         </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
         <Scissors size={12} className="text-gray-400" />
         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
            {offer.serviceIds?.length > 0 
              ? `Applicable to ${offer.serviceIds.length} services`
              : 'Applicable to ALL services'}
         </p>
      </div>

      {/* Glassy Background Icon */}
      <Tag className="absolute -right-4 -bottom-4 text-gray-50 dark:text-gray-800/20 -rotate-12 w-24 h-24 -z-1" />
    </motion.div>
  );
};

export default OfferCard;
