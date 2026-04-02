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
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-48 animate-in fade-in duration-500">
      <div className="p-5 flex items-center justify-between sticky top-0 bg-background-light dark:bg-background-dark z-50">
        <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Step 2 of 3</p>
           <h2 className="font-bold text-sm">Review & Confirm</h2>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="px-5 space-y-6">
        {/* Vendor & Schedule Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary text-white p-4 px-5 rounded-[2.5rem] shadow-xl shadow-primary/20 space-y-2.5"
        >
          <div>
            <h1 className="text-lg font-black truncate uppercase tracking-tight">{vendor.shopName}</h1>
            <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest flex items-center gap-1">
               <MapPin size={9} /> {vendor.address || 'Vendor Location'}
            </p>
          </div>
          
          <div className="flex gap-4 pt-2.5 border-t border-white/10">
            <div className="space-y-1">
               <p className="text-[10px] font-bold opacity-40 uppercase">Date</p>
               <div className="flex items-center gap-2">
                 <Calendar size={14} className="opacity-60" />
                 <span className="font-bold text-sm truncate">{selectedDate}</span>
               </div>
            </div>
            <div className="space-y-1">
               <p className="text-[10px] font-bold opacity-40 uppercase">Time</p>
               <div className="flex items-center gap-2">
                 <Clock size={14} className="opacity-60" />
                 <span className="font-bold text-sm">{selectedSlot}</span>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Selected Services */}
        <section className="space-y-2">
          <SectionTitle title="Services" subtitle={`${items.length} items selected`} />
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-4 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            {items.map((item) => (
              <div key={item._id} className="flex justify-between items-center">
                <div className="space-y-0.5">
                   <p className="font-bold text-sm dark:text-white">{item.name}</p>
                   <p className="text-[10px] text-gray-400 font-medium">{item.duration} mins + {item.bufferTime || 0}m buffer</p>
                </div>
                <span className="font-black text-primary dark:text-blue-400 text-sm">₹{item.price}</span>
              </div>
            ))}
            <div className="border-t border-gray-50 dark:border-gray-800 pt-4 flex justify-between items-center">
               <span className="text-sm font-bold text-gray-500">Conveince Fee</span>
               <span className="text-sm font-bold text-green-500">FREE</span>
            </div>
            <div className="flex justify-between items-center pt-2">
               <span className="font-black text-lg dark:text-white">To Pay</span>
               <span className="font-black text-2xl text-primary dark:text-white">₹{totalPrice}</span>
            </div>
          </div>
        </section>

        {/* Staff Card */}
        <section className="space-y-3">
           <SectionTitle title="Assigned Professional" />
           <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
                 <img src={selectedStaff?.image || `https://i.pravatar.cc/150?u=${vendor._id}`} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-0.5">
                 <p className="font-bold text-sm dark:text-white">{selectedStaff?.name || 'Auto Assigned'}</p>
                 <p className="text-[10px] text-gray-400 font-medium">Professional Specialist</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-blue-500 bg-blue-50 dark:bg-blue-900/10 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                 <ShieldCheck size={14} />
                 <span className="text-[10px] font-black uppercase">Verified</span>
              </div>
           </div>
        </section>

        {/* Payment Method */}
        <section className="space-y-3">
           <SectionTitle title="Payment Method" />
           <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border-2 border-primary/20 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-primary/5 rounded-2xl text-primary">
                    <CreditCard size={20} />
                 </div>
                 <div>
                    <p className="font-bold text-sm dark:text-white">Pay at Shop</p>
                    <p className="text-[10px] text-gray-400 font-medium">Safe and secure payment</p>
                 </div>
              </div>
              <div className="w-5 h-5 rounded-full border-4 border-primary bg-white" />
           </div>
        </section>
      </div>

      {/* Confirmation Bar */}
      <div className="fixed bottom-16 left-0 right-0 p-4 pt-3 glass-effect border-t border-[#1C2C4E]/5 dark:border-gray-800 z-50">
        <div className="max-w-md mx-auto">
           <Button 
            size="lg" 
            className="w-full h-12 shadow-2xl shadow-primary/30 text-sm font-black uppercase tracking-[0.1em] flex items-center justify-center gap-3 rounded-full"
            onClick={handleConfirm}
            disabled={loading}
           >
             {loading ? (
               <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
               'Confirm Booking'
             )}
           </Button>
           <p className="text-center text-[8px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
             By clicking confirm, you agree to our terms.
           </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutReview;
