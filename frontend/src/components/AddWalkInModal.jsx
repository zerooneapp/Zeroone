import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, Briefcase, User, Check, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const AddWalkInModal = ({ isOpen, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    staffId: '',
    selectedServices: []
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        api.get('/services/manage/all'),
        api.get('/staff/manage/all')
      ]);
      setServices(servicesRes.data);
      setStaff(staffRes.data);
    } catch (err) {
      toast.error('Failed to load services/staff');
    }
  };

  const toggleService = (service) => {
    const isAlreadySelected = formData.selectedServices.find(s => s.serviceId === service._id);
    if (isAlreadySelected) {
      setFormData({
        ...formData,
        selectedServices: formData.selectedServices.filter(s => s.serviceId !== service._id)
      });
    } else {
      setFormData({
        ...formData,
        selectedServices: [...formData.selectedServices, {
          serviceId: service._id,
          name: service.name,
          price: service.price,
          duration: service.duration
        }]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.selectedServices.length === 0) return toast.error('Select at least one service');
    if (!formData.staffId) return toast.error('Select a staff member');

    try {
      setLoading(true);
      const totalPrice = formData.selectedServices.reduce((sum, s) => sum + s.price, 0);
      const totalDuration = formData.selectedServices.reduce((sum, s) => sum + s.duration, 0);

      await api.post('/vendor/walk-in', {
        ...formData,
        totalPrice,
        totalDuration
      });

      toast.success('Walk-in Added Successfully!');
      onRefresh();
      onClose();
      // Reset form
      setFormData({ name: '', phone: '', staffId: '', selectedServices: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add walk-in');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md px-0 sm:px-6">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg bg-white dark:bg-gray-950 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Add Walk-in</h2>
              <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Manual entry for shop customers</p>
            </div>
            <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-gray-900 rounded-2xl text-slate-400 hover:text-red-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Details */}
            <div className="grid grid-cols-1 gap-4">
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Customer Name"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 dark:text-white"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="relative group">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="tel" 
                  placeholder="Phone Number (Optional)"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 dark:text-white"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            {/* Service Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Services</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {services.map(s => {
                  const isSelected = formData.selectedServices.find(ss => ss.serviceId === s._id);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => toggleService(s)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${isSelected ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-slate-50 dark:bg-gray-900 border-slate-100 dark:border-gray-800 text-slate-400 dark:text-gray-500'}`}
                    >
                      {s.name} - ₹{s.price}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Staff Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Assign Staff</label>
              <div className="grid grid-cols-2 gap-2">
                {staff.map(st => (
                  <button
                    key={st._id}
                    type="button"
                    onClick={() => setFormData({...formData, staffId: st._id})}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${formData.staffId === st._id ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-slate-50 dark:bg-gray-900 border-slate-100 dark:border-gray-800 text-slate-400 dark:text-gray-500'}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-gray-800 overflow-hidden">
                      <img src={st.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${st.name}`} alt={st.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-black uppercase truncate">{st.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Total Summary & Submit */}
            <div className="pt-4 space-y-4">
              <div className="flex items-center justify-between px-4 py-4 bg-slate-50 dark:bg-gray-900 rounded-3xl">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                  <p className="text-xl font-black text-slate-800 dark:text-white leading-none">₹{formData.selectedServices.reduce((sum, s) => sum + s.price, 0)}</p>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</span>
                  <p className="text-[10px] font-black text-primary uppercase">Estimated {formData.selectedServices.reduce((sum, s) => sum + s.duration, 0)} mins</p>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Complete Entry'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AddWalkInModal;
