import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, MapPin, CreditCard, ShieldCheck, X, Shield, Clock3, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import Button from '../components/Button';
import api from '../services/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

const CheckoutReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;
  const { clearCart } = useCartStore();
  const [loading, setLoading] = React.useState(false);
  const [pricingPreview, setPricingPreview] = React.useState(null);
  const [showTerms, setShowTerms] = React.useState(false);

  if (!bookingData) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-500">No booking details found.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>Back Home</Button>
      </div>
    );
  }

  const { selectedDate, selectedSlot, selectedStaff, items, vendor } = bookingData;
  const isHomeBooking = items.some((item) => item.type === 'home' || item.type === 'both');
  const totalDuration =
    bookingData.totalDurationOverride ||
    items.reduce((sum, item) => sum + (item.duration || 0) + (item.bufferTime || 0), 0);
  const formatPrice = (amount) => `Rs. ${Number(amount || 0).toFixed(2).replace(/\.00$/, '')}`;

  React.useEffect(() => {
    if (!vendor?._id || !items?.length) {
      setPricingPreview(null);
      return;
    }

    const fetchPricingPreview = async () => {
      try {
        const res = await api.get('/pricing/preview', {
          params: {
            vendorId: vendor._id,
            serviceIds: items.map((item) => item._id).join(',')
          }
        });
        setPricingPreview(res.data);
      } catch (err) {
        setPricingPreview(null);
      }
    };

    fetchPricingPreview();
  }, [vendor?._id, items]);

  const pricingMap = (pricingPreview?.services || []).reduce((acc, service) => {
    acc[service.serviceId] = service;
    return acc;
  }, {});
  const totalPrice = pricingPreview?.originalTotal ?? items.reduce((sum, item) => sum + item.price, 0);
  const discountedTotal = pricingPreview?.finalTotal ?? totalPrice;
  const totalSavings = pricingPreview?.totalDiscount ?? 0;

  const handleConfirm = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const startDateTime = dayjs(`${selectedDate} ${selectedSlot}`).toISOString();

      await api.post('/slots/lock', {
        vendorId: vendor._id,
        startTime: startDateTime,
        duration: totalDuration,
        serviceIds: items.map((item) => item._id),
        staffId: selectedStaff?._id,
        excludeBookingId: bookingData.rescheduleBookingId
      });

      const { user } = useAuthStore.getState();
      const serviceAddress = isHomeBooking ? (user?.address || '') : '';

      const res = bookingData.rescheduleBookingId
        ? await api.patch(`/bookings/${bookingData.rescheduleBookingId}/reschedule`, {
            startTime: startDateTime,
            staffId: selectedStaff?._id,
            serviceAddress
          })
        : await api.post('/bookings', {
            vendorId: vendor._id,
            staffId: selectedStaff?._id,
            serviceIds: items.map((item) => item._id),
            startTime: startDateTime,
            serviceAddress
          });

      clearCart();

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
        toast.error('Slot just got booked. Try another slot');
        navigate('/cart');
      } else {
        toast.error(err.response?.data?.message || 'Booking failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-gray-950 pb-32 animate-in fade-in duration-500">
      <div className="p-2.5 py-3 flex items-center justify-between sticky top-0 bg-background-light/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all">
          <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
        </button>
        <div className="text-center leading-none">
          <p className="text-[10px] font-black tracking-widest text-slate-400 capitalize">Step 2 of 3</p>
          <h1 className="font-extrabold text-[15px] text-gray-900 dark:text-white tracking-tight mt-0.5">Review & Confirm</h1>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="px-4 mt-4 space-y-4 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 dark:bg-primary text-white p-3 px-4 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-primary/10 space-y-2 border border-white/10"
        >
          <div className="leading-none text-center">
            <h2 className="text-base font-black truncate tracking-tight">{vendor.shopName}</h2>
            <p className="text-[8px] font-black opacity-60 flex items-center justify-center gap-1 mt-1 tracking-widest capitalize">
              <MapPin size={10} strokeWidth={3} /> <span className="line-clamp-1">{vendor.address || 'Vendor location'}</span>
            </p>
          </div>

          <div className="flex justify-center gap-6 pt-3 border-t border-white/10">
            <div className="space-y-1.5 text-center">
              <p className="text-[9px] font-black opacity-40 tracking-widest leading-none capitalize">Date</p>
              <div className="flex items-center justify-center gap-1.5 leading-none mt-1">
                <Calendar size={13} className="opacity-60 text-blue-400" />
                <span className="font-black text-[13px] tracking-tighter">{dayjs(selectedDate).format('DD-MM-YYYY')}</span>
              </div>
            </div>
            <div className="space-y-1.5 text-center">
              <p className="text-[9px] font-black opacity-40 tracking-widest leading-none capitalize">Time</p>
              <div className="flex items-center justify-center gap-1.5 leading-none mt-1">
                <Clock size={13} className="opacity-60 text-blue-400" />
                <span className="font-black text-[13px] tracking-tighter">{dayjs(`${selectedDate} ${selectedSlot}`).format('hh:mm A')}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black text-slate-400 tracking-widest leading-none capitalize">Services</span>
            <span className="text-[9px] font-black text-[#1C2C4E] tracking-tighter capitalize opacity-80">{items.length} Items</span>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)] space-y-3">
            {items.map((item) => {
              const priceMeta = pricingMap[item._id] || {
                originalPrice: item.price,
                finalPrice: item.price,
                discount: 0
              };

              return (
                <div key={item._id} className="flex justify-between items-center leading-none">
                  <div className="space-y-1">
                    <p className="font-black text-[13px] text-gray-900 dark:text-white tracking-tight leading-none capitalize">{item.name}</p>
                    <p className="text-[9px] text-slate-400 font-black tracking-tighter leading-none capitalize">
                      {item.duration}m | {item.bufferTime || 0}m Buffer
                    </p>
                    {priceMeta.discount > 0 && (
                      <p className="text-[8px] font-black text-emerald-500 tracking-widest uppercase leading-none">
                        Offer price {formatPrice(priceMeta.finalPrice)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`font-black text-[13px] ${
                        priceMeta.discount > 0 ? 'text-slate-400 line-through' : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {formatPrice(item.price)}
                    </span>
                    {priceMeta.discount > 0 && (
                      <span className="text-[8px] font-black text-emerald-500 tracking-widest uppercase">
                        Save {formatPrice(priceMeta.discount)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="border-t border-slate-50 dark:border-gray-800 pt-3 flex justify-between items-center leading-none">
              <span className="text-[10px] font-black text-slate-400 tracking-widest leading-none capitalize">Convenience fee</span>
              <span className="text-[10px] font-black text-emerald-500 tracking-widest leading-none capitalize">Free</span>
            </div>
            {totalSavings > 0 && (
              <div className="flex justify-between items-center leading-none">
                <span className="text-[10px] font-black text-slate-400 tracking-widest leading-none capitalize">Discount</span>
                <span className="text-[10px] font-black text-emerald-500 tracking-widest leading-none">
                  -{formatPrice(totalSavings)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 leading-none">
              <span className="font-black text-[15px] text-gray-900 dark:text-white tracking-tight leading-none capitalize">To pay</span>
              <div className="flex flex-col items-end">
                {totalSavings > 0 && (
                  <span className="text-[10px] font-black text-slate-400 line-through tracking-widest leading-none mb-1">
                    {formatPrice(totalPrice)}
                  </span>
                )}
                <span className="font-black text-[20px] text-[#1C2C4E] dark:text-white tracking-tighter leading-none">
                  {formatPrice(discountedTotal)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-[11px] font-black text-slate-400 tracking-widest px-1 leading-none capitalize">Assigned professional</p>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)] flex items-center gap-3 active:scale-95 transition-all">
            <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-gray-800 overflow-hidden border border-slate-100 dark:border-gray-700 shadow-inner shrink-0">
              <img src={selectedStaff?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStaff?.name || 'Staff')}&background=E2E8F0&color=1C2C4E&bold=true`} className="w-full h-full object-cover" alt={selectedStaff?.name || 'Auto assigned'} />
            </div>
            <div className="leading-none overflow-hidden pr-2">
              <p className="font-black text-[14px] text-gray-900 dark:text-white tracking-tight truncate leading-none capitalize">{selectedStaff?.name || 'Auto assigned'}</p>
              <p className="text-[10px] text-slate-400 font-black mt-1.5 tracking-widest leading-none capitalize">Professional specialist</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-blue-500 bg-blue-500/5 dark:bg-blue-900/10 px-3 py-2 rounded-lg border border-blue-500/10 dark:border-blue-900/30 shrink-0 shadow-sm">
              <ShieldCheck size={14} strokeWidth={3} />
              <span className="text-[10px] font-black tracking-widest leading-none capitalize">Verified</span>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-[11px] font-black text-slate-400 tracking-widest px-1 leading-none capitalize">Payment method</p>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)] flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/5 rounded-lg text-primary border border-primary/10 shadow-inner">
                <CreditCard size={20} />
              </div>
              <div className="leading-none">
                <p className="font-black text-[14px] text-gray-900 dark:text-white tracking-tight leading-none capitalize">Pay at shop</p>
                <p className="text-[10px] text-slate-400 font-black mt-1.5 tracking-widest leading-none capitalize">Safe & secure payment</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full border-[5px] border-[#1C2C4E] bg-white shadow-lg" />
          </div>
        </section>
      </div>

      <div 
        className="fixed left-0 right-0 p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-gray-800 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 54px)' }}
      >
        <div className="max-w-md mx-auto">
          <button
            className="w-full h-12 bg-slate-900 dark:bg-primary text-white shadow-xl shadow-black/10 dark:shadow-primary/20 text-[15px] font-black tracking-tight flex items-center justify-center gap-3 rounded-xl border border-white/10 active:scale-95 transition-all disabled:opacity-50 capitalize"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Confirm booking'
            )}
          </button>
          <p className="text-center text-[7px] text-slate-400 mt-2 font-black tracking-widest opacity-60 leading-none">
            By clicking confirm, you agree to our <button onClick={() => setShowTerms(true)} className="underline decoration-slate-400/30 underline-offset-2 hover:text-slate-600 transition-colors">terms.</button>
          </p>
        </div>
      </div>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowTerms(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white dark:bg-gray-950 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 pb-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#1C2C4E] dark:text-white uppercase tracking-tight">Terms of Service</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ZeroOne Booking Policies</p>
                </div>
                <button 
                  onClick={() => setShowTerms(false)}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-600 dark:text-gray-400 active:scale-90 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6 no-scrollbar pb-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/30">
                    <Shield className="text-blue-500" size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black text-[#1C2C4E] dark:text-white uppercase tracking-widest">1. Booking Commitment</h4>
                    <p className="text-[12px] font-medium text-slate-500 dark:text-gray-400 leading-relaxed">
                      By confirming, you commit to attending the service at the scheduled time. Professionals allocate their time specifically for your slot.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/30">
                    <Clock3 className="text-rose-500" size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black text-[#1C2C4E] dark:text-white uppercase tracking-widest">2. Cancellation Policy</h4>
                    <p className="text-[12px] font-medium text-slate-500 dark:text-gray-400 leading-relaxed">
                      Cancellations must be made at least 2 hours in advance. Frequent no-shows or late cancellations may result in platform restrictions or penalties.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/30">
                    <AlertCircle className="text-amber-500" size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black text-[#1C2C4E] dark:text-white uppercase tracking-widest">3. Payment & Refunds</h4>
                    <p className="text-[12px] font-medium text-slate-500 dark:text-gray-400 leading-relaxed">
                      Payments are processed securely. Refunds (if applicable) are governed by the vendor's policy and ZeroOne's standard dispute resolution process.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-800">
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed text-center italic">
                    "We value your time and our professionals' dedication. Let's make every booking a great experience."
                  </p>
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-gray-800">
                <button 
                  onClick={() => setShowTerms(false)}
                  className="w-full py-4 bg-[#1C2C4E] dark:bg-primary text-white font-black text-[14px] uppercase tracking-widest rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-[#1C2C4E]/20"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckoutReview;
