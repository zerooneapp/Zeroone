import React, { useState, useEffect } from 'react';
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
  const [isManual, setIsManual] = useState(false);

  if (!booking) return null;

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const options = [
    "Excellent Service",
    "Needs Improvement",
    "Friendly Staff",
    "Clean & Hygienic",
    "Other (self)"
  ];

  const handleSubmit = async () => {
    if (rating === 0) return toast.error('Please select a rating');
    const finalComment = isManual ? comment : comment; // Logic will handle this below
    
    setSubmitting(true);
    try {
      await api.post('/reviews/submit', {
        bookingId: booking._id,
        rating,
        comment: isManual ? comment : comment
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
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-5">
        {/* Backdrop (Glassmorphism) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div 
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm bg-white dark:bg-gray-950 rounded-[2.5rem] px-5 pt-5 pb-5 shadow-2xl space-y-3 overflow-hidden"
        >
          {/* Elite Background Graphic */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-36 h-36 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-1 relative z-10">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-[0.75rem] flex items-center justify-center mx-auto mb-1.5 rotate-[-8deg] shadow-lg shadow-primary/5">
              <Heart size={18} fill="currentColor" className="animate-pulse" />
            </div>
            <h2 className="text-[17px] font-black dark:text-white uppercase tracking-tighter">How was your service?</h2>
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
              Your feedback helps us keep the ZeroOne standard elite.
            </p>
          </div>

          {/* Expert Card Snapshot */}
          <div className="bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 relative z-10 transition-all">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 overflow-hidden shadow-sm shrink-0">
              <img src={booking.staffId?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.staffId?.name || 'Staff')}&background=E2E8F0&color=1C2C4E&bold=true`} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-[12px] text-gray-900 dark:text-white tracking-tight truncate">{booking.staffId?.name || 'Professional'}</p>
              <div className="flex items-center gap-1 text-blue-500 text-[8px] font-black uppercase">
                <ShieldCheck size={10} /> Verified Expert
              </div>
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">At Shop</p>
              <p className="text-[9px] font-bold text-gray-900 dark:text-white mt-0.5 truncate max-w-[90px]">
                {booking.vendorId?.shopName}
              </p>
            </div>
          </div>

          {/* Interactive Stars */}
          <div className="flex flex-col items-center gap-1 relative z-10">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform"
                >
                  <Star 
                    size={26} 
                    className={`${(hoverRating || rating) >= s ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-800'}`} 
                    strokeWidth={2}
                  />
                </motion.button>
              ))}
            </div>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest h-3.5">
              {rating === 1 && "Need Improvement"}
              {rating === 2 && "Good Job"}
              {rating === 3 && "Great Experience"}
              {rating === 4 && "Above & Beyond"}
              {rating === 5 && "Absolute Elite!"}
            </p>
          </div>

          {/* Feedback Options */}
          <div className="space-y-2.5 relative z-10">
            <div className="relative group">
              <select
                onChange={(e) => {
                  if (e.target.value === 'Other (self)') {
                    setIsManual(true);
                    setComment('');
                  } else {
                    setIsManual(false);
                    setComment(e.target.value);
                  }
                }}
                value={isManual ? 'Other (self)' : comment}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl text-[11px] font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-4 ring-primary/5 appearance-none cursor-pointer"
              >
                <option value="" disabled className="text-slate-400">What did you like the most?</option>
                {options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <MessageSquare size={13} className="rotate-180" />
              </div>
            </div>

            {isManual && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="relative group"
              >
                <div className="absolute left-4 top-3.5 text-gray-400">
                  <MessageSquare size={14} />
                </div>
                <textarea 
                  placeholder="Share your specific experience..."
                  className="w-full pl-10 pr-5 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-[11px] font-bold dark:text-white focus:ring-4 ring-primary/10 transition-all min-h-[72px] resize-none"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  autoFocus
                />
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 relative z-10 pb-1 sm:pb-0 items-center">
            <button 
              onClick={onClose}
              className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Maybe Later
            </button>
            <Button 
              className="px-5 py-2 text-[10px] bg-[#00246b] text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#00246b]/20"
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
