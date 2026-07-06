import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, User, CheckCircle2,
  ChevronRight, Scissors, Loader2, Save, Phone
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useAuthStore } from '../store/authStore';

const format12Hr = (time24) => {
  if (!time24) return '';
  const [hourStr, minStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${minStr} ${ampm}`;
};

const StaffCreateBookingModal = ({ isOpen, onClose, onRefresh }) => {
  const { staffProfile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Services come from the staff's own assigned services
  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    serviceIds: [],
    date: dayjs().format('YYYY-MM-DD'),
    time: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadServices();
      resetForm();
    }
  }, [isOpen]);

  // Refetch slots when date/services change
  useEffect(() => {
    if (formData.serviceIds.length > 0 && formData.date) {
      fetchSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [formData.date, formData.serviceIds]);

  const resetForm = () => {
    setStep(1);
    setAvailableSlots([]);
    setFormData({
      name: '',
      phone: '',
      serviceIds: [],
      date: dayjs().format('YYYY-MM-DD'),
      time: '',
    });
  };

  const loadServices = async () => {
    try {
      // Use services from the staff profile already in store, or re-fetch
      if (staffProfile?.services?.length > 0) {
        setServices(staffProfile.services);
      } else {
        const res = await api.get('/staff/profile');
        setServices(res.data?.services || []);
      }
    } catch (err) {
      toast.error('Failed to load your assigned services');
    }
  };

  const fetchSlots = async () => {
    const vendorId = staffProfile?.vendorId?._id || staffProfile?.vendorId;
    if (!vendorId) return;

    try {
      setSlotsLoading(true);
      const res = await api.get('/slots', {
        params: {
          vendorId,
          serviceIds: formData.serviceIds.join(','),
          date: formData.date,
          includeUnavailable: true,
        }
      });
      setAvailableSlots(res.data?.availableSlots || []);
    } catch (err) {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const toggleService = (id) => {
    setFormData(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter(sid => sid !== id)
        : [...prev.serviceIds, id],
      time: '',
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.serviceIds.length || !formData.time) {
      return toast.error('Please fill all required fields');
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      return toast.error('Please enter a valid 10-digit contact number');
    }

    const startTime = dayjs(`${formData.date} ${formData.time}`).toISOString();

    try {
      setLoading(true);
      await api.post('/staff/manual-booking', {
        name: formData.name,
        phone: formData.phone,
        serviceIds: formData.serviceIds,
        startTime,
      });
      toast.success('Appointment Scheduled! 📅');
      onRefresh?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scheduling failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalDuration = services
    .filter(s => formData.serviceIds.includes(s._id))
    .reduce((acc, s) => acc + (s.duration || 0) + (s.bufferTime || 0), 0);

  const totalPrice = services
    .filter(s => formData.serviceIds.includes(s._id))
    .reduce((acc, s) => acc + (s.price || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#00246b]/10 rounded-xl flex items-center justify-center text-[#00246b] dark:text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-base font-black text-gray-900 dark:text-white leading-tight">New Appointment</h2>
              <p className="text-[9px] font-bold text-gray-400 capitalize tracking-widest leading-none">
                Step {step} of 2 · {step === 1 ? 'Customer & Services' : 'Date & Time'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-gray-400 hover:text-red-500 transition-colors border border-slate-100 dark:border-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 bg-slate-100 dark:bg-gray-800">
          <div
            className="h-full bg-[#00246b] transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-36">

          {/* Step 1: Customer & Services */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              {/* Customer Name */}
              <div className="space-y-2">
                <label className="text-[9px] font-black capitalize text-gray-400 tracking-widest px-1 flex items-center gap-1.5">
                  <User size={12} /> Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    setFormData({ ...formData, name: val });
                  }}
                  className="w-full bg-slate-50/50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00246b]/20 transition-all caret-[#00246b] dark:caret-white placeholder:text-slate-400/70 dark:placeholder:text-gray-500/70"
                />
              </div>

              {/* Customer Phone (Optional) */}
              <div className="space-y-2">
                <label className="text-[9px] font-black capitalize text-gray-400 tracking-widest px-1 flex items-center gap-1.5">
                  <Phone size={12} /> Contact Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // only allow digits
                    setFormData({ ...formData, phone: val });
                  }}
                  className="w-full bg-slate-50/50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00246b]/20 transition-all caret-[#00246b] dark:caret-white placeholder:text-slate-400/70 dark:placeholder:text-gray-500/70"
                />
              </div>

              {/* Services */}
              <div className="space-y-2">
                <label className="text-[9px] font-black capitalize text-gray-400 tracking-widest flex items-center gap-1.5 px-1">
                  <Scissors size={12} /> Select Services *
                </label>
                {services.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-[9px] font-black bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-slate-200 dark:border-gray-800">
                    No services assigned to you
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-1.5">
                    {services.map(s => (
                      <button
                        key={s._id}
                        onClick={() => toggleService(s._id)}
                        className={`py-1.5 px-2.5 pr-7 rounded-xl border transition-all flex flex-col gap-0.5 text-left active:scale-[0.97] relative ${
                          formData.serviceIds.includes(s._id)
                            ? 'bg-slate-50 dark:bg-blue-500/10 border-[#00246b] dark:border-white shadow-sm'
                            : 'bg-white dark:bg-gray-900 border-slate-200/60 dark:border-gray-800 shadow-sm'
                        }`}
                      >
                        <span className={`text-[10px] font-black capitalize ${
                          formData.serviceIds.includes(s._id) ? 'text-[#00246b] dark:text-white' : 'text-gray-900 dark:text-white'
                        }`}>
                          {s.name}
                        </span>
                        <p className="text-[8.5px] font-black text-slate-400 capitalize tracking-[0.15em]">
                          ₹{s.price} · {s.duration}m
                        </p>
                        {formData.serviceIds.includes(s._id) && (
                          <CheckCircle2 size={11} className="absolute bottom-1.5 right-2.5 text-[#00246b] dark:text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                disabled={!formData.name.trim() || formData.serviceIds.length === 0}
                onClick={() => setStep(2)}
                className="w-full py-4 bg-[#00246b] text-white rounded-xl font-black capitalize text-[10px] tracking-widest shadow-xl shadow-[#00246b]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next: Pick a Slot <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              {/* Date Picker */}
              <div className="space-y-2">
                <label className="text-[9px] font-black capitalize text-gray-400 tracking-widest px-1 flex items-center gap-1.5">
                  <Calendar size={12} /> Appointment Date
                </label>
                <input
                  type="date"
                  min={dayjs().format('YYYY-MM-DD')}
                  value={formData.date}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value, time: '' })}
                  className="w-full bg-slate-50/50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-black text-gray-900 dark:text-white shadow-sm"
                />
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <label className="text-[9px] font-black capitalize text-gray-400 tracking-widest px-1 flex items-center gap-1.5">
                  <Clock size={12} /> Available Slots
                </label>
                {slotsLoading ? (
                  <div className="py-8 flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="text-[8px] font-bold capitalize">Checking availability...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 capitalize text-[9px] font-black bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-slate-200 dark:border-gray-800">
                    No slots available for this date
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 p-1.5">
                    {availableSlots.map(slot => {
                      const isBooked = slot.isBooked === true;
                      return (
                        <button
                          key={slot.time}
                          disabled={isBooked}
                          onClick={() => !isBooked && setFormData({ ...formData, time: slot.time })}
                          className={`py-2.5 rounded-lg text-[10px] font-black border transition-all ${
                            isBooked
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 cursor-not-allowed opacity-60'
                              : formData.time === slot.time
                              ? 'bg-slate-50 dark:bg-blue-500/10 border-[#00246b] dark:border-white text-[#00246b] dark:text-white shadow-md active:scale-95'
                              : 'bg-white dark:bg-gray-900 border-slate-200/60 dark:border-gray-800 text-gray-500 shadow-sm active:scale-95'
                          }`}
                        >
                          {format12Hr(slot.time)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => { setStep(1); setAvailableSlots([]); }}
                  className="px-5 py-4 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-xl font-black capitalize text-[10px] border border-slate-200/60 dark:border-gray-800 active:scale-95 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.time}
                  className="flex-1 h-14 bg-[#00246b] text-white rounded-xl text-[10px] font-black capitalize tracking-[0.2em] shadow-lg shadow-[#00246b]/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Confirm Appointment 📅
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Summary Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="space-y-0.5">
            <p className="text-[8px] font-black capitalize text-slate-400 tracking-widest">Total</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-[#00246b] dark:text-white">₹{totalPrice}</span>
              {totalDuration > 0 && (
                <span className="text-[9px] font-bold text-slate-400">({totalDuration}m)</span>
              )}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[8px] font-black capitalize text-slate-400 tracking-widest">Appointment</p>
            <p className="text-[10px] font-black capitalize tracking-[0.2em] text-amber-600 dark:text-amber-400">
              {dayjs(formData.date).format('DD MMM')}
              {formData.time ? ` · ${format12Hr(formData.time)}` : ''}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffCreateBookingModal;
