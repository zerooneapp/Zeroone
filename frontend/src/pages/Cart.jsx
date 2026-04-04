import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, ChevronRight, AlertCircle, CheckCircle2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';
import Button from '../components/Button';
import SectionTitle from '../components/SectionTitle';
import api from '../services/api';
import { cn } from '../utils/cn';

const Cart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, vendor, clearCart, rescheduleBookingId, setRescheduleBookingId, addItem, getTotalPrice } = useCartStore();

  const [selectedDate, setSelectedDate] = useState(null); // Null initially for progressive reveal
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [allStaff, setAllStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  // 🔄 INITIALIZE RESCHEDULE MODE (If navigated from Status Details)
  useEffect(() => {
    if (location.state?.rescheduleBookingId) {
      clearCart();
      setRescheduleBookingId(location.state.rescheduleBookingId);

      if (location.state.rescheduleItems && location.state.vendor) {
        location.state.rescheduleItems.forEach(item => {
          addItem(location.state.vendor, item);
        });
      }
    }
  }, [location.state]);

  // 1. Generate Next 30 Days
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      full: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate()
    };
  });

  // 2. Fetch Slots and Staff
  useEffect(() => {
    if (!vendor || items.length === 0 || !selectedDate) return;

    const fetchBookingReadyData = async () => {
      try {
        setLoadingSlots(true);
        setLoadingStaff(true);

        const [slotsRes, staffRes] = await Promise.all([
          api.get('/slots', {
            params: {
              vendorId: vendor?._id,
              date: selectedDate,
              serviceIds: items?.map(i => i?._id).filter(id => !!id).join(',')
            }
          }),
          api.get('/staff', { params: { vendorId: vendor?._id } })
        ]);

        setSlots(slotsRes.data?.availableSlots || []);
        setAllStaff(staffRes.data || []);
      } catch (err) {
        console.error('Failed to fetch booking data');
      } finally {
        setLoadingSlots(false);
        setLoadingStaff(false);
      }
    };

    fetchBookingReadyData();
  }, [vendor, items, selectedDate]);

  // 3. Filter Staff based on selected slot and services
  const availableStaff = (allStaff || []).filter(s => {
    // Must support all selected services
    const supportsAll = (items || []).every(item =>
      s.services?.some(svcId => String(svcId) === String(item._id))
    );

    // Staff must be free in the SELECTED SLOT
    if (selectedSlot?.availableStaff) {
      return selectedSlot.availableStaff.includes(s._id);
    }

    return true;
  });

  // Reset states when dependencies change for progressive reveal
  useEffect(() => {
    setSelectedSlot(null);
    setSelectedStaff(null);
  }, [selectedDate]);

  useEffect(() => {
    setSelectedStaff(null);
  }, [selectedSlot]);

  const handleContinue = () => {
    if (!selectedSlot) return alert("Please select a time slot");

    navigate('/checkout-review', {
      state: {
        selectedDate,
        selectedSlot: selectedSlot.time,
        selectedStaff,
        items,
        vendor,
        rescheduleBookingId
      }
    });
  };

  const formatTo12H = (time24) => {
    if (!time24) return '--:--';
    const [h, m] = time24.split(':');
    const hour = parseInt(h);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${suffix}`;
  };

  if (!vendor || items.length === 0) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <ShoppingBag size={64} className="text-gray-200 mb-4" />
        <p className="text-gray-500 font-medium">Your cart is empty</p>
        <Button className="mt-6" onClick={() => navigate('/')}>Find Services</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-gray-950 pb-32 animate-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <div className="p-3.5 pt-4 flex items-center justify-between sticky top-0 bg-background-light/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all">
          <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
        </button>
        <div className="text-center leading-none">
          <p className="text-[8px] font-black tracking-widest text-slate-400">Step 1 of 3</p>
          <h1 className="font-extrabold text-[11px] text-gray-900 dark:text-white tracking-tight mt-1">Select Date & Time</h1>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="px-5 mt-5 space-y-5 pb-24">
        {/* Date Selection */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[9px] font-black text-slate-400 tracking-widest">Select booking date</span>
            <button
              onClick={() => setShowFullCalendar(!showFullCalendar)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-blue-500/10 rounded-lg text-[9px] font-black text-primary dark:text-blue-400 tracking-widest border border-slate-100 dark:border-blue-500/20 active:scale-95 transition-all shadow-sm"
            >
              <Calendar size={11} strokeWidth={3} />
              {showFullCalendar ? 'List' : 'Calendar'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!showFullCalendar ? (
              <motion.div
                key="list-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
              >
                {dates.map((d) => (
                  <button
                    key={d.full}
                    onClick={() => setSelectedDate(d.full)}
                    className={cn(
                      "flex flex-col items-center min-w-[50px] py-2 rounded-xl transition-all border shadow-sm",
                      selectedDate === d.full
                        ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105"
                        : "bg-white dark:bg-gray-900 border-[#1C2C4E]/10 dark:border-gray-800 text-slate-400 shadow-sm"
                    )}
                  >
                    <span className="text-[8px] uppercase font-black opacity-60 tracking-widest">{d.day}</span>
                    <span className="text-xs font-black mt-0.5 tracking-tighter">{d.date}</span>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="grid-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-7 gap-1 bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm"
              >
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="text-[8px] font-black text-slate-300 dark:text-slate-600 text-center uppercase py-1 tracking-widest">{day}</div>
                ))}
                {Array.from({ length: (new Date().getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}
                {dates.map((d) => (
                  <button
                    key={d.full}
                    onClick={() => setSelectedDate(d.full)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-xl transition-all text-[10px] font-black relative active:scale-90",
                      selectedDate === d.full
                        ? "bg-slate-900 text-white shadow-md"
                        : "bg-slate-50/50 dark:bg-gray-800/20 text-slate-400 hover:bg-slate-100 border border-slate-50 dark:border-transparent"
                    )}
                  >
                    <span className="relative z-10">{d.date}</span>
                    {d.date === new Date().getDate() && d.full === new Date().toISOString().split('T')[0] && (
                      <div className="absolute bottom-1 w-1 h-1 bg-current rounded-full opacity-50" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Selected Services Summary */}
        <section className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-[#1C2C4E]/10 dark:border-gray-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.01)]">
          <p className="text-[9px] font-black text-slate-400 tracking-widest mb-2 px-1">Booking summary</p>
          <div className="space-y-1.5">
            {items.map(item => (
              <div key={item._id} className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span className="font-extrabold text-[9px] text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[200px]">{item?.name || 'Service'}</span>
                </div>
                <span className="font-black text-[10px] text-gray-900 dark:text-gray-300 italic tracking-tighter">₹{item?.price || 0}</span>
              </div>
            ))}
            <div className="h-[1px] bg-slate-50 dark:bg-gray-800 my-0.5" />
            <div className="flex justify-between items-center font-black text-gray-900 dark:text-white tracking-widest uppercase text-[10px] px-1">
              <span>Total Value</span>
              <span className="text-primary italic tracking-tighter">₹{getTotalPrice()}</span>
            </div>
          </div>
        </section>

        {/* Time Slots */}
        <AnimatePresence>
          {selectedDate && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black text-slate-400 tracking-widest">Select time</span>
                <span className="text-[7px] font-black text-emerald-500 tracking-widest italic">{items.length} Services ready</span>
              </div>
              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-9 bg-slate-50 dark:bg-gray-800 rounded-lg animate-pulse border border-slate-100 dark:border-gray-800" />)}
                </div>
              ) : slots.length === 0 ? (
                <div className="p-4 text-center bg-red-500/5 rounded-xl border border-red-500/10 mt-2">
                  <AlertCircle className="mx-auto text-red-500 mb-1" size={16} strokeWidth={3} />
                  <p className="text-[8px] text-red-600 dark:text-red-400 font-black uppercase tracking-widest">
                    Full House. Try another day.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "py-2 rounded-lg font-black text-[9px] transition-all border border-slate-100 dark:border-gray-800 text-center uppercase tracking-widest shadow-sm active:scale-95",
                        selectedSlot?.time === slot.time
                          ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                          : "bg-white dark:bg-gray-900 text-slate-400 shadow-sm border-[#1C2C4E]/10"
                      )}
                    >
                      {formatTo12H(slot.time)}
                    </button>
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Staff Selection */}
        <AnimatePresence>
          {selectedSlot && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <p className="text-[9px] font-black text-slate-400 tracking-widest px-1">Choose professional</p>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                {availableStaff.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => setSelectedStaff(selectedStaff?._id === s._id ? null : s)}
                    className={cn(
                      "relative flex flex-col items-center min-w-[80px] p-2 rounded-xl border transition-all active:scale-95 shadow-sm",
                      selectedStaff?._id === s._id
                        ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105"
                        : "bg-white dark:bg-gray-900 border-[#1C2C4E]/10 dark:border-gray-800 shadow-sm"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-gray-800 overflow-hidden mb-1.5 border border-slate-100 dark:border-gray-700 shadow-inner">
                      <img src={s.image || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                    </div>
                    <span className={cn(
                      "text-[8px] font-black truncate w-full text-center tracking-widest leading-tight",
                      selectedStaff?._id === s._id ? "text-white" : "text-slate-400"
                    )}>
                      {s.name?.split(' ')[0] || 'Staff'}
                    </span>

                    {selectedStaff?._id === s._id && (
                      <div className="absolute top-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-slate-900 shadow-lg">
                        <CheckCircle2 size={10} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
                {availableStaff.length === 0 && !loadingStaff && (
                  <div className="w-full bg-slate-50 dark:bg-gray-900/50 p-3 rounded-xl text-center border border-dashed border-slate-200 dark:border-gray-800">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">No matching agents</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Bar */}
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.2 }}
        className="fixed bottom-[82px] left-4 right-4 bg-slate-900 dark:bg-gray-900 p-2.5 px-5 rounded-3xl shadow-2xl z-50 border border-white/10 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <div className="leading-none">
            <p className="text-[7px] font-black text-white/40 tracking-widest mb-1.5">Net payable</p>
            <p className="text-lg font-black text-white italic tracking-tighter leading-none">₹{getTotalPrice()}</p>
          </div>
          <button
            disabled={!selectedSlot}
            onClick={handleContinue}
            className="px-4 py-2 bg-white text-slate-900 rounded-xl font-black text-[9px] tracking-widest shadow-xl active:scale-95 disabled:opacity-30 transition-all flex items-center gap-1.5 border-b-2 border-slate-200"
          >
            {rescheduleBookingId ? 'Reschedule' : 'Continue'}
            <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Cart;
