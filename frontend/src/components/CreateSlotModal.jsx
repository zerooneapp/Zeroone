import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, User, Phone, CheckCircle2,
  ChevronRight, Scissors, AlertCircle, Loader2, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const CreateSlotModal = ({ isOpen, onClose, onRefresh }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Data State
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    serviceIds: [],
    staffId: '',
    date: dayjs().format('YYYY-MM-DD'),
    time: '', // 'HH:mm'
  });

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      resetForm();
    }
  }, [isOpen]);

  // Handle slot fetching when date/services change
  useEffect(() => {
    if (formData.serviceIds.length > 0 && formData.date) {
      fetchSlots();
    }
  }, [formData.date, formData.serviceIds]);

  const resetForm = () => {
    setStep(1);
    setAvailableSlots([]);
    setFormData({
      name: '',
      phone: '',
      serviceIds: [],
      staffId: '',
      date: dayjs().format('YYYY-MM-DD'),
      time: '',
    });
  };

  const loadInitialData = async () => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        api.get('/services/manage/all'),
        api.get('/staff/manage/all')
      ]);
      setServices(servicesRes.data);
      setStaff(staffRes.data);
    } catch (err) {
      toast.error('Failed to load shop data');
    }
  };

  const fetchSlots = async () => {
    if (services.length === 0) return;

    try {
      setSlotsLoading(true);
      const res = await api.get('/slots', {
        params: {
          vendorId: services[0].vendorId,
          serviceIds: formData.serviceIds.join(','),
          date: formData.date
        }
      });
      setAvailableSlots(res.data?.availableSlots || []);
    } catch (err) {
      setAvailableSlots([]);
      console.error('Slot fetch failed:', err);
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
      time: '', // Reset time if services change
      staffId: '' // Reset staff
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.serviceIds.length || !formData.staffId || !formData.time) {
      return toast.error('Please fill all required fields');
    }

    // Combine date and time
    const startTime = dayjs(`${formData.date} ${formData.time}`).toISOString();

    try {
      setLoading(true);
      await api.post('/vendor/manual-booking', { ...formData, startTime });
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
  const selectedSlot = availableSlots.find((slot) => slot.time === formData.time);
  const availableStaffForSelectedSlot = staff.filter((member) =>
    selectedSlot?.availableStaff?.some((availableStaffId) => String(availableStaffId) === String(member._id))
  );

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
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#1C2C4E]/10 rounded-xl flex items-center justify-center text-[#1C2C4E]">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-base font-black text-gray-900 dark:text-white leading-tight">Create Appointment</h2>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Future Service Booking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-gray-400 hover:text-red-500 transition-colors border border-slate-100 dark:border-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-36">
          {/* Step 1: Customer & Services */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center gap-1.5">
                  <User size={12} /> Customer Name
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50/50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white shadow-sm focus:shadow-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5">
                    <Scissors size={12} /> Select Services
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {services.map(s => (
                    <button
                      key={s._id}
                      onClick={() => toggleService(s._id)}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-1 text-left ${formData.serviceIds.includes(s._id)
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-white dark:bg-gray-900 border-slate-200/60 dark:border-gray-800 shadow-sm'
                        }`}
                    >
                      <span className={`text-[10px] font-black uppercase ${formData.serviceIds.includes(s._id) ? 'text-[#1C2C4E]' : 'text-gray-900 dark:text-white'}`}>
                        {s.name}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 tracking-tight">₹{s.price} • {s.duration}m</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!formData.name || formData.serviceIds.length === 0}
                onClick={() => setStep(2)}
                className="w-full py-4 bg-[#1C2C4E] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#1C2C4E]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Next: Select Slot <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center gap-1.5">
                  <Calendar size={12} /> Appointment Date
                </label>
                <input
                  type="date"
                  min={dayjs().format('YYYY-MM-DD')}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-50/50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-black text-gray-900 dark:text-white shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center gap-1.5">
                  <Clock size={12} /> Choose Free Time
                </label>
                {slotsLoading ? (
                  <div className="py-8 flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="text-[8px] font-bold uppercase">Checking Roster...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 uppercase text-[9px] font-black bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-slate-200 dark:border-gray-800">No slots found</div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => setFormData({ ...formData, time: slot.time })}
                        className={`py-2.5 rounded-lg text-[10px] font-black border transition-all ${formData.time === slot.time
                          ? 'bg-[#1C2C4E] border-[#1C2C4E] text-white shadow-md'
                          : 'bg-white dark:bg-gray-900 border-slate-200/60 dark:border-gray-800 text-gray-500 shadow-sm'
                          }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {formData.time && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-1">Assign Staff Member</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableStaffForSelectedSlot.map(s => (
                        <button
                          key={s._id}
                          onClick={() => setFormData({ ...formData, staffId: s._id })}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all ${formData.staffId === s._id ? 'border-primary bg-primary/10 shadow-sm' : 'bg-white dark:bg-gray-900 border-slate-200/60 dark:border-gray-800 shadow-sm'
                            }`}
                        >
                          <div className="w-7 h-7 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                            {s.image ? <img src={s.image} alt="" className="w-full h-full object-cover" /> : <User size={12} className="text-gray-400" />}
                          </div>
                          <span className={`text-[9px] font-black uppercase truncate ${formData.staffId === s._id ? 'text-[#1C2C4E]' : 'text-gray-900 dark:text-white'}`}>{s.name}</span>
                        </button>
                      ))}
                  </div>
                  {availableStaffForSelectedSlot.length === 0 && (
                    <div className="p-3 text-center text-gray-400 uppercase text-[8px] font-black bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-slate-200 dark:border-gray-800">
                      No free staff for this slot
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setStep(1)} className="px-5 py-4 bg-gray-50 dark:bg-gray-900 text-gray-400 rounded-xl font-black uppercase text-[10px] border border-slate-200/60 dark:border-gray-800">Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.staffId}
                  className="flex-1 py-4 bg-[#1C2C4E] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#1C2C4E]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Finalize Slot 📅
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Float Summary */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="space-y-0.5">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Pricing Summary</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-[#1C2C4E]">₹{totalPrice}</span>
              <span className="text-[9px] font-bold text-slate-400">({totalDuration}m)</span>
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Appointment</p>
            <p className="text-[9px] font-black uppercase text-slate-600 dark:text-gray-300">
              {dayjs(formData.date).format('DD MMM')} {formData.time ? `• ${formData.time}` : ''}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateSlotModal;
