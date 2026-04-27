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
        className="w-full max-w-lg bg-white dark:bg-gray-950 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-t border-slate-100 dark:border-gray-800"
      >
        <div className="p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Add Walk-in</h2>
              <p className="text-[9px] font-bold text-slate-400 dark:text-gray-500 capitalize tracking-widest">Manual entry for shop customers</p>
            </div>
            <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-gray-900 rounded-xl text-slate-400 hover:text-red-500 transition-colors border border-slate-100 dark:border-gray-800">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Customer Details */}
            <div className="grid grid-cols-1 gap-2">
              <div className="relative group">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Customer Name"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/10 dark:text-white transition-all shadow-sm focus:shadow-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="relative flex items-center bg-slate-50/50 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl px-3.5 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
                <Phone size={16} className="text-slate-400 mr-2" />
                <span className="text-sm font-bold text-slate-400 border-r border-slate-200 dark:border-gray-800 pr-2 mr-2">+91</span>
                <input
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  className="flex-1 py-3 bg-transparent border-none text-sm font-bold outline-none dark:text-white"
                  value={formData.phone}
                  onChange={e => {
                    let val = e.target.value.replace(/\D/g, '');
                    if ((val.startsWith('91') || val.startsWith('0')) && val.length > 10) {
                      val = val.slice(-10);
                    }
                    setFormData({ ...formData, phone: val.slice(0, 10) });
                  }}
                  maxLength={10}
                />
              </div>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 capitalize tracking-widest px-1">Select Services</label>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1 p-1.5 custom-scrollbar">
                {services.map(s => {
                  const isSelected = formData.selectedServices.find(ss => ss.serviceId === s._id);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => toggleService(s)}
                      className={`px-3 py-2 rounded-lg text-[9px] font-black capitalize tracking-wider border transition-all ${isSelected ? 'bg-slate-50 dark:bg-blue-500/10 border-[#1C2C4E] text-[#1C2C4E] shadow-sm transform scale-105' : 'bg-white dark:bg-gray-900 border-slate-200/60 dark:border-gray-800 text-slate-400 dark:text-gray-500 shadow-sm'}`}
                    >
                      {s.name} - ₹{s.price}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Staff Selection */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 capitalize tracking-widest px-1">Assign Staff</label>
              <div className="grid grid-cols-2 gap-2 p-1.5">
                {staff.map(st => (
                  <button
                    key={st._id}
                    type="button"
                    onClick={() => setFormData({ ...formData, staffId: st._id })}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${formData.staffId === st._id ? 'bg-slate-50 dark:bg-blue-500/10 border-[#1C2C4E] dark:border-blue-500 shadow-xl transform scale-105' : 'bg-white dark:bg-gray-900 border-slate-200/60 dark:border-gray-800 text-slate-400 dark:text-gray-500 shadow-sm'}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-gray-800 overflow-hidden">
                      <img src={st.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(st.name || 'Staff')}&background=E2E8F0&color=1C2C4E&bold=true`} alt={st.name} className="w-full h-full object-cover" />
                    </div>
                    <span className={`text-[9px] font-black capitalize truncate ${formData.staffId === st._id ? 'text-[#1C2C4E] dark:text-white' : 'text-slate-400 dark:text-gray-500'}`}>{st.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Total Summary & Submit */}
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-2xl shadow-md">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black text-slate-400 capitalize tracking-widest">Total Amount</span>
                  <p className="text-lg font-black text-slate-800 dark:text-white leading-none">₹{formData.selectedServices.reduce((sum, s) => sum + s.price, 0)}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[8px] font-black text-slate-400 capitalize tracking-widest">Estimated Time</span>
                  <p className="text-[9px] font-bold text-primary uppercase">{formData.selectedServices.reduce((sum, s) => sum + s.duration, 0)} mins</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white text-[10px] font-black capitalize tracking-[0.2em] rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
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
