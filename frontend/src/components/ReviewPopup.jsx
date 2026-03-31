import React, { useState } from 'react';
import { Star, X, MessageSquare, ShieldCheck, Heart, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import Button from './Button';

const ReviewPopup = ({ booking, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!booking) return null;

  const handleSubmit = async () => {
    if (rating === 0) return toast.error('Please select a rating');
    
    setSubmitting(true);
    try {
      await api.post('/reviews/submit', {
        bookingId: booking._id,
        rating,
        comment
      });
      toast.success('Your feedback makes us better! ❤️');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop (Glassmorphism) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div 
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white dark:bg-gray-950 rounded-t-[3rem] sm:rounded-[3.5rem] p-8 sm:p-10 shadow-2xl space-y-8 overflow-hidden"
        >
          {/* Elite Background Graphic */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-3 relative z-10">
             <div className="w-16 h-16 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 rotate-[-8deg] shadow-lg shadow-primary/5">
                <Heart size={32} fill="currentColor" className="animate-pulse" />
             </div>
             <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">How was your service?</h2>
             <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
                Your feedback helps us keep the <br /> ZeroOne standard elite.
             </p>
          </div>

          {/* Expert Card Snapshot */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex items-center gap-4 relative z-10 transition-all">
             <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                <img src={booking.staffId?.image || `https://i.pravatar.cc/150?u=${booking._id}`} className="w-full h-full object-cover" />
             </div>
             <div>
                <p className="font-black text-gray-900 dark:text-white tracking-tight">{booking.staffId?.name || 'Professional'}</p>
                <div className="flex items-center gap-1.5 text-blue-500 text-[9px] font-black uppercase">
                   <ShieldCheck size={12} /> Verified Expert
                </div>
             </div>
             <div className="ml-auto text-right">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">At Shop</p>
                <p className="text-[10px] font-bold text-gray-900 dark:text-white mt-1 truncate max-w-[100px]">
                   {booking.vendorId?.shopName}
                </p>
             </div>
          </div>

          {/* Interactive Stars */}
          <div className="flex flex-col items-center gap-2 relative z-10">
             <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform"
                  >
                    <Star 
                      size={40} 
                      className={`${(hoverRating || rating) >= s ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-800'}`} 
                      strokeWidth={1.5}
                    />
                  </motion.button>
                ))}
             </div>
             <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest h-4">
                {rating === 1 && "Need Improvement"}
                {rating === 2 && "Good Job"}
                {rating === 3 && "Great Experience"}
                {rating === 4 && "Above & Beyond"}
                {rating === 5 && "Absolute Elite!"}
             </p>
          </div>

          {/* Comment Box */}
          <div className="relative group z-10">
             <div className="absolute left-6 top-5 text-gray-400">
                <MessageSquare size={18} />
             </div>
             <textarea 
               placeholder="Anything else we should know? (Optional)"
               className="w-full pl-16 pr-8 py-5 bg-gray-50 dark:bg-gray-800 border-none rounded-[2rem] text-sm font-bold dark:text-white focus:ring-4 ring-primary/10 transition-all min-h-[100px] resize-none"
               value={comment}
               onChange={(e) => setComment(e.target.value)}
             />
          </div>

          {/* Actions */}
          <div className="flex gap-3 relative z-10 pb-4 sm:pb-0">
             <button 
               onClick={onClose}
               className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 dark:hover:text-white transition-colors"
             >
                Maybe Later
             </button>
             <Button 
               className="flex-1 py-6 bg-primary text-white rounded-[2.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
               onClick={handleSubmit}
               disabled={submitting}
             >
                {submitting ? 'Sharing...' : 'Submit Feedback'}
             </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReviewPopup;
