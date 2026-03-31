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
          serviceIds: formData.serviceIds,
          date: formData.date
        }
      });
      setAvailableSlots(res.data);
    } catch (err) {
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
        <div className="px-6 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                 <Calendar className="w-5 h-5" />
              </div>
              <div>
                 <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">Create Appointment</h2>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Future Service Booking</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <X size={20} />
           </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-40">
           {/* Step 1: Customer & Services */}
           {step === 1 && (
             <div className="space-y-8 animate-in slide-in-from-right duration-300">
                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center gap-2">
                      <User size={12} /> Customer Name
                   </label>
                   <input 
                     type="text" 
                     placeholder="e.g. Rahul Sharma"
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                     className="w-full bg-slate-50 dark:bg-gray-800/50 border-none rounded-2xl px-5 py-4 font-bold text-gray-900 dark:text-white"
                   />
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                         <Scissors size={12} /> Select Services
                      </label>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      {services.map(s => (
                        <button 
                          key={s._id}
                          onClick={() => toggleService(s._id)}
                          className={`p-4 rounded-3xl border-2 transition-all flex flex-col gap-2 text-left ${
                            formData.serviceIds.includes(s._id)
                              ? 'bg-primary/5 border-primary shadow-sm'
                              : 'bg-white dark:bg-gray-900 border-transparent dark:border-transparent'
                          }`}
                        >
                           <span className={`text-xs font-black uppercase ${formData.serviceIds.includes(s._id) ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                              {s.name}
                           </span>
                           <span className="text-[10px] font-bold text-gray-400 tracking-tight">₹{s.price} • {s.duration}m</span>
                        </button>
                      ))}
                   </div>
                </div>

                <button 
                  disabled={!formData.name || formData.serviceIds.length === 0}
                  onClick={() => setStep(2)}
                  className="w-full py-5 bg-primary text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                   Next: Select Slot <ChevronRight size={16} />
                </button>
             </div>
           )}

           {/* Step 2: Date & Time */}
           {step === 2 && (
             <div className="space-y-8 animate-in slide-in-from-right duration-300">
                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center gap-2">
                      <Calendar size={12} /> Appointment Date
                   </label>
                   <input 
                     type="date" 
                     min={dayjs().format('YYYY-MM-DD')}
                     value={formData.date}
                     onChange={(e) => setFormData({...formData, date: e.target.value})}
                     className="w-full bg-slate-50 dark:bg-gray-800/50 border-none rounded-2xl px-5 py-4 font-black"
                   />
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center gap-2">
                      <Clock size={12} /> Choose Free Time
                   </label>
                   {slotsLoading ? (
                     <div className="py-12 flex flex-col items-center gap-3 text-gray-400">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="text-[10px] font-bold uppercase">Checking Roster...</span>
                     </div>
                   ) : availableSlots.length === 0 ? (
                     <div className="p-12 text-center text-gray-400 uppercase text-[10px] font-black">No slots found</div>
                   ) : (
                     <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map(slot => (
                          <button 
                            key={slot.time}
                            onClick={() => setFormData({...formData, time: slot.time})}
                            className={`py-3 rounded-2xl text-[11px] font-black border-2 transition-all ${
                              formData.time === slot.time 
                                ? 'bg-primary border-primary text-white'
                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500'
                            }`}
                          >
                             {slot.time}
                          </button>
                        ))}
                     </div>
                   )}
                </div>

                {formData.time && (
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Assign Staff Member</label>
                     <div className="grid grid-cols-2 gap-2">
                        {staff
                          .filter(s => availableSlots.find(slot => slot.time === formData.time)?.availableStaff?.includes(s._id))
                          .map(s => (
                             <button 
                               key={s._id}
                               onClick={() => setFormData({...formData, staffId: s._id})}
                               className={`p-4 rounded-3xl border-2 flex items-center gap-3 text-left transition-all ${
                                 formData.staffId === s._id ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-gray-800'
                               }`}
                             >
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
                                   {s.image ? <img src={s.image} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-gray-400" />}
                                </div>
                                <span className={`text-[10px] font-black uppercase ${formData.staffId === s._id ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>{s.name.split(' ')[0]}</span>
                             </button>
                          ))
                        }
                     </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                   <button onClick={() => setStep(1)} className="px-6 py-5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-3xl font-black uppercase text-xs">Back</button>
                   <button 
                     onClick={handleSubmit} 
                     disabled={loading || !formData.staffId}
                     className="flex-1 py-5 bg-primary text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                   >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                      Finalize Slot 📅
                   </button>
                </div>
             </div>
           )}
        </div>

        {/* Float Summary */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-slate-900 text-white flex items-center justify-between border-t border-white/5">
           <div>
              <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Pricing</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-xl font-black italic text-primary">₹{totalPrice}</span>
                 <span className="text-[9px] font-bold opacity-40">({totalDuration}m)</span>
              </div>
           </div>
           <div className="text-right">
              <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Schedule</p>
              <p className="text-[9px] font-black uppercase tracking-tighter">
                 {dayjs(formData.date).format('DD MMM')} {formData.time ? `• ${formData.time}` : ''}
              </p>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateSlotModal;
