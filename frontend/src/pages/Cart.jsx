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
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-40 animate-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <div className="p-5 flex items-center justify-between sticky top-0 bg-background-light dark:bg-background-dark z-50">
        <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Step 1 of 3</p>
           <h2 className="font-bold text-sm">Select Date & Time</h2>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="px-5 space-y-6">
        {/* Date Selection */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <SectionTitle title="Select Booking Date" className="mb-0" />
             <button 
                onClick={() => setShowFullCalendar(!showFullCalendar)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-[#1C2C4E] dark:text-gray-300 pointer-events-auto transition-all active:scale-95"
             >
                <Calendar size={12} strokeWidth={2.5} />
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
                className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1"
              >
                {dates.map((d) => (
                  <button
                    key={d.full}
                    onClick={() => setSelectedDate(d.full)}
                    className={cn(
                      "flex flex-col items-center min-w-[55px] py-2.5 rounded-2xl transition-all border-2",
                      selectedDate === d.full 
                        ? "bg-[#1C2C4E] border-[#1C2C4E] text-white shadow-xl scale-105" 
                        : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400"
                    )}
                  >
                    <span className="text-[9px] uppercase font-black opacity-80">{d.day}</span>
                    <span className="text-sm font-black mt-0.5">{d.date}</span>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="grid-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-7 gap-1.5 bg-white dark:bg-gray-900 p-3 rounded-[2.5rem] border border-gray-100 dark:border-gray-800"
              >
                {['M','T','W','T','F','S','S'].map((day, i) => (
                  <div key={i} className="text-[9px] font-black text-gray-300 dark:text-gray-600 text-center uppercase py-1">{day}</div>
                ))}
                {/* Placeholder for days before today in the current week */}
                {Array.from({ length: (new Date().getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}
                {dates.map((d) => (
                  <button
                    key={d.full}
                    onClick={() => setSelectedDate(d.full)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-2xl transition-all text-[11px] font-black relative overflow-hidden",
                      selectedDate === d.full
                        ? "bg-[#1C2C4E] text-white shadow-lg"
                        : "bg-gray-50/50 dark:bg-gray-800/20 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
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

        {/* Selected Services Summary (Shown Initially) */}
        <section className="bg-gray-50/50 dark:bg-gray-900/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <SectionTitle title="Booking Summary" className="mb-3" />
          <div className="space-y-2.5">
            {items.map(item => (
              <div key={item._id} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#1C2C4E]" />
                   <span className="font-bold text-[#1C2C4E] dark:text-white uppercase tracking-tighter">{item?.name || 'Service'}</span>
                </div>
                <span className="font-black text-[#1C2C4E] dark:text-gray-300">₹{item?.price || 0}</span>
              </div>
            ))}
            <div className="h-[1px] bg-gray-200 dark:bg-gray-800 my-1" />
            <div className="flex justify-between items-center font-black text-[#1C2C4E] dark:text-white tracking-widest uppercase text-xs">
               <span>Total</span>
               <span>₹{getTotalPrice()}</span>
            </div>
          </div>
        </section>

        {/* Time Slots (Revealed after Date Selection) */}
        <AnimatePresence>
          {selectedDate && (
             <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
             >
                <SectionTitle title="Select Time" subtitle={`Available slots for ${items.length} services`} />
                {loadingSlots ? (
                   <div className="grid grid-cols-3 gap-2 mt-3">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
                   </div>
                ) : slots.length === 0 ? (
                   <div className="p-5 text-center bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 mt-3">
                      <AlertCircle className="mx-auto text-red-500 mb-1.5" size={20} />
                      <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-tight">
                        All staff are busy. Try another day.
                      </p>
                   </div>
                ) : (
                   <div className="grid grid-cols-3 gap-2 mt-3">
                     {slots.map((slot) => (
                       <button
                         key={slot.time}
                         onClick={() => setSelectedSlot(slot)}
                         className={cn(
                           "py-2.5 rounded-xl font-black text-[10px] transition-all border-2 text-center uppercase tracking-widest",
                           selectedSlot?.time === slot.time
                             ? "bg-[#1C2C4E] border-[#1C2C4E] text-white shadow-md scale-105"
                             : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500"
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

        {/* Staff Selection (Revealed after Time Selection) */}
        <AnimatePresence>
           {selectedSlot && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SectionTitle title="Choose Professional" subtitle="Elite staff assigned to your services" />
                <div className="flex gap-3 overflow-x-auto no-scrollbar py-3 px-1">
                   {availableStaff.map((s) => (
                     <button
                       key={s._id}
                       onClick={() => setSelectedStaff(selectedStaff?._id === s._id ? null : s)}
                       className={cn(
                         "relative flex flex-col items-center min-w-[90px] p-2.5 rounded-2xl border-2 transition-all",
                         selectedStaff?._id === s._id
                          ? "bg-[#1C2C4E]/5 border-[#1C2C4E] shadow-sm scale-105"
                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                       )}
                     >
                       <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden mb-2 shadow-sm">
                          <img src={s.image || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                       </div>
                       <span className="text-[10px] font-black text-[#1C2C4E] dark:text-white truncate w-full text-center uppercase tracking-tighter">{s.name?.split(' ')[0] || 'Staff'}</span>
                       
                       {selectedStaff?._id === s._id && (
                         <div className="absolute top-1 right-1 bg-[#1C2C4E] text-white p-0.5 rounded-full ring-2 ring-white dark:ring-gray-900 shadow-lg">
                            <CheckCircle2 size={10} />
                         </div>
                       )}
                     </button>
                   ))}
                   {availableStaff.length === 0 && !loadingStaff && (
                     <div className="w-full bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl text-center border border-dashed border-gray-200 dark:border-gray-800">
                       <p className="text-[10px] text-gray-400 font-bold uppercase italic tracking-widest">No matching staff available.</p>
                     </div>
                   )}
                </div>
              </motion.section>
           )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Bar (Elite Pill) */}
      <motion.div 
        initial={{ y: 100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.2 }}
        className="fixed bottom-24 left-6 right-6 bg-[#1C2C4E]/95 dark:bg-gray-950/95 backdrop-blur-3xl p-3 px-6 rounded-[2.5rem] shadow-2xl z-50 border border-white/10"
      >
        <div className="flex items-center justify-between">
           <div>
              <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5 leading-none">Net Payable</p>
              <p className="text-xl font-black text-white leading-none">₹{getTotalPrice()}</p>
           </div>
           <button 
            disabled={!selectedSlot}
            onClick={handleContinue}
            className="px-6 py-2.5 bg-white text-[#1C2C4E] rounded-full font-black text-[10px] uppercase tracking-[0.1em] shadow-xl shadow-black/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 border-b-2 border-gray-100 flex items-center gap-1"
           >
             {rescheduleBookingId ? 'Confirm Reschedule' : 'Continue'}
             <ChevronRight size={14} strokeWidth={3} />
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Cart;
