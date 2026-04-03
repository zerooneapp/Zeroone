import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, User, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import Button from '../components/Button';
import SectionTitle from '../components/SectionTitle';
import api from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

const CheckoutReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;
  const { clearCart } = useCartStore();

  if (!bookingData) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-500">No booking details found.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>Back Home</Button>
      </div>
    );
  }

  const { selectedDate, selectedSlot, selectedStaff, items, vendor } = bookingData;
  const totalPrice = items.reduce((sum, i) => sum + i.price, 0);
  const totalDuration = items.reduce((sum, i) => sum + (i.duration || 0) + (i.bufferTime || 0), 0);
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    // 🛡️ DOUBLE CLICK PROTECTION
    if (loading) return;

    try {
      setLoading(true);

      // 📅 FIX TIME FORMAT BUG
      const startDateTime = dayjs(`${selectedDate} ${selectedSlot}`).toISOString();

      // 2. Lock Slot First (Critical Production Step)
      const lockRes = await api.post('/slots/lock', {
        vendorId: vendor._id,
        startTime: startDateTime,
        duration: totalDuration,
        serviceIds: items.map(i => i._id),
        staffId: selectedStaff?._id
      });

      // 3. Finalize Booking (Check if Rescheduling)
      const { user } = useAuthStore.getState();
      const serviceAddress = user?.address || vendor?.address;

      const res = bookingData.rescheduleBookingId
        ? await api.patch(`/bookings/${bookingData.rescheduleBookingId}/reschedule`, {
          startTime: startDateTime,
          staffId: selectedStaff?._id,
          serviceAddress
        })
        : await api.post('/bookings', {
          vendorId: vendor._id,
          staffId: selectedStaff?._id,
          serviceIds: items.map(i => i._id),
          startTime: startDateTime,
          serviceAddress
        });

      // 🧹 CLEAR CART AFTER SUCCESS
      clearCart();

      // 4. Success Navigation
      navigate('/booking-success', {
        state: {
          booking: res.data,
          vendor,
          items,
          selectedDate,
          selectedSlot
        }
      });
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("Slot just got booked 😔 Try another slot");
        navigate('/cart');
      } else {
        toast.error(err.response?.data?.message || "Booking failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-gray-950 pb-32 animate-in fade-in duration-500">
      <div className="p-3.5 pt-4 flex items-center justify-between sticky top-0 bg-background-light/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all">
          <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
        </button>
        <div className="text-center leading-none">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Step 2 of 3</p>
          <h1 className="font-extrabold text-[11px] text-gray-900 dark:text-white uppercase tracking-tight mt-1">Review & Confirm</h1>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="px-4 mt-6 space-y-4 pb-20">
        {/* Vendor & Schedule Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 dark:bg-primary text-white p-3 px-4 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-primary/10 space-y-2 border border-white/10"
        >
          <div className="leading-none">
            <h2 className="text-base font-black truncate uppercase tracking-tight">{vendor.shopName}</h2>
            <p className="text-[8px] font-black opacity-60 uppercase tracking-widest flex items-center gap-1 mt-1">
              <MapPin size={10} strokeWidth={3} /> <span className="line-clamp-1">{vendor.address || 'Vendor Location'}</span>
            </p>
          </div>

          <div className="flex gap-4 pt-2 border-t border-white/10">
            <div className="space-y-1">
              <p className="text-[8px] font-black opacity-40 uppercase tracking-widest leading-none">Date</p>
              <div className="flex items-center gap-1.5 leading-none">
                <Calendar size={12} className="opacity-60" />
                <span className="font-black text-xs uppercase tracking-tighter">{selectedDate}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black opacity-40 uppercase tracking-widest leading-none">Time</p>
              <div className="flex items-center gap-1.5 leading-none">
                <Clock size={12} className="opacity-60" />
                <span className="font-black text-xs uppercase tracking-tighter">{selectedSlot}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Selected Services */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Services</span>
            <span className="text-[8px] font-black uppercase text-primary tracking-tighter italic opacity-80">{items.length} items</span>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-2.5">
            {items.map((item) => (
              <div key={item._id} className="flex justify-between items-center leading-none">
                <div className="space-y-0.5">
                  <p className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tight">{item.name}</p>
                  <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">{item.duration}m • {item.bufferTime || 0}m buffer</p>
                </div>
                <span className="font-black text-gray-900 dark:text-white text-xs italic">₹{item.price}</span>
              </div>
            ))}
            <div className="border-t border-slate-50 dark:border-gray-800 pt-2 flex justify-between items-center leading-none">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Convenience Fee</span>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">FREE</span>
            </div>
            <div className="flex justify-between items-center pt-1 leading-none">
              <span className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">To Pay</span>
              <span className="font-black text-lg text-primary dark:text-white italic tracking-tighter">₹{totalPrice}</span>
            </div>
          </div>
        </section>

        {/* Staff Card */}
        <section className="space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Assigned Professional</p>
          <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex items-center gap-3 active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-gray-800 overflow-hidden border border-slate-100 dark:border-gray-700 shadow-inner shrink-0">
              <img src={selectedStaff?.image || `https://i.pravatar.cc/150?u=${vendor._id}`} className="w-full h-full object-cover" />
            </div>
            <div className="leading-none overflow-hidden pr-2">
              <p className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tight truncate">{selectedStaff?.name || 'Auto Assigned'}</p>
              <p className="text-[8px] text-slate-400 font-black uppercase mt-1 tracking-widest">Professional Specialist</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-blue-500 bg-blue-500/5 dark:bg-blue-900/10 px-2.5 py-1.5 rounded-lg border border-blue-500/10 dark:border-blue-900/30 shrink-0">
              <ShieldCheck size={12} strokeWidth={3} />
              <span className="text-[8px] font-black uppercase tracking-widest">Verified</span>
            </div>
          </div>
        </section>

        {/* Payment Method */}
        <section className="space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Payment Method</p>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border-2 border-primary/20 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/5 rounded-lg text-primary border border-primary/10 shadow-inner">
                <CreditCard size={18} />
              </div>
              <div className="leading-none">
                <p className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-tight">Pay at Shop</p>
                <p className="text-[8px] text-slate-400 font-black uppercase mt-1 tracking-widest">Safe & Secure Payment</p>
              </div>
            </div>
            <div className="w-5 h-5 rounded-full border-4 border-primary bg-white shadow-lg" />
          </div>
        </section>
      </div>

      {/* Confirmation Bar */}
      <div className="fixed bottom-4 left-4 right-4 p-4 glass-effect border border-slate-200/40 dark:border-gray-800 rounded-2xl z-50 shadow-2xl">
        <div className="max-w-md mx-auto">
          <button
            className="w-full h-11 bg-slate-900 dark:bg-primary text-white shadow-xl shadow-black/10 dark:shadow-primary/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 rounded-xl border border-white/10 active:scale-95 transition-all disabled:opacity-50"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Confirm Booking'
            )}
          </button>
          <p className="text-center text-[7px] text-slate-400 mt-2 font-black uppercase tracking-widest opacity-60 leading-none">
            By clicking confirm, you agree to our terms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutReview;
