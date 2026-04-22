import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Info, Scissors, Percent, IndianRupee, Calendar, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const OfferForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    discountType: 'percentage',
    value: '',
    serviceIds: [],
    expiryDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    minPurchaseAmount: 0,
    maxDiscountLimit: 0,
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const servicesRes = await api.get('/services/manage/all', { params: { includeInactive: false } });
        setAvailableServices(servicesRes.data);

        if (isEdit) {
          const offerRes = await api.get(`/offers/${id}`);
          const offer = offerRes.data;
          setFormData({
            title: offer.title,
            discountType: offer.discountType,
            value: offer.value,
            serviceIds: offer.serviceIds.map(s => typeof s === 'object' ? s._id : s),
            expiryDate: dayjs(offer.expiryDate).format('YYYY-MM-DD'),
            minPurchaseAmount: offer.minPurchaseAmount || 0,
            maxDiscountLimit: offer.maxDiscountLimit || 0,
          });
        }
      } catch (err) {
        toast.error('Failed to load data');
      }
    };
    init();
  }, [id, isEdit]);

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter(s => s !== serviceId)
        : [...prev.serviceIds, serviceId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🛡️ VALIDATION
    if (formData.value <= 0) return toast.error('Discount value must be greater than 0');
    if (formData.discountType === 'percentage' && formData.value > 100) {
      return toast.error('Percentage cannot exceed 100%');
    }
    
    // ⏰ EXPIRY FIX: Same day is allowed until end of day
    if (dayjs(formData.expiryDate).endOf('day').isBefore(dayjs())) {
      return toast.error('Expiry date must be in the future');
    }

    try {
      setLoading(true);
      if (isEdit) {
        await api.patch(`/offers/${id}`, formData);
        toast.success('Offer updated successfully');
      } else {
        await api.post('/offers', formData);
        toast.success('Offer created successfully');
      }
      navigate('/vendor/offers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
        <header className="px-5 pt-4 pb-3 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => navigate(-1)}
               className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-100 dark:border-gray-800 active:scale-90 transition-all"
             >
                <ArrowLeft size={16} />
             </button>
             <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                {isEdit ? 'Edit Offer' : 'Create Offer'}
             </h1>
          </div>
          <button 
            form="offer-form"
            disabled={loading}
            className="p-2 bg-[#1C2C4E] text-white rounded-xl shadow-lg shadow-[#1C2C4E]/20 active:scale-95 transition-all disabled:opacity-50"
          >
             {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          </button>
       </header>

       <main className="px-5 mt-4">
          <form id="offer-form" onSubmit={handleSubmit} className="space-y-4 pb-8">
             <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Offer Title</label>
                   <input 
                     required
                     type="text" 
                     placeholder="e.g. Summer Special"
                     value={formData.title}
                     onChange={(e) => setFormData({...formData, title: e.target.value})}
                     className="w-full p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-bold focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                   />
                </div>

                {/* Discount Type */}
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Discount Type</label>
                   <div className="grid grid-cols-2 gap-3">
                      {['percentage', 'flat'].map(t => (
                         <button 
                           key={t}
                           type="button"
                           onClick={() => setFormData({...formData, discountType: t})}
                           className={`p-2.5 rounded-xl border font-black uppercase text-[11px] flex items-center justify-center gap-2 transition-all ${
                             formData.discountType === t 
                             ? 'bg-[#1C2C4E] border-[#1C2C4E] text-white shadow-lg shadow-[#1C2C4E]/20' 
                             : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'
                           }`}
                         >
                            {t === 'percentage' ? <Percent size={12} /> : <IndianRupee size={12} />}
                            {t}
                         </button>
                      ))}
                   </div>
                </div>

                 <div className="grid grid-cols-2 gap-3">
                    {/* Value */}
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Value</label>
                       <input 
                         required
                         type="number" 
                         placeholder={formData.discountType === 'percentage' ? '20' : '100'}
                         value={formData.value}
                         onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData({...formData, value: isNaN(val) ? '' : val});
                         }}
                         className="w-full p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-bold text-sm"
                       />
                    </div>
                    {/* Expiry */}
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Expiry Date</label>
                       <input 
                         required
                         type="date" 
                         value={formData.expiryDate}
                         onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                         className="w-full p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-bold text-sm"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    {/* Min Order Value */}
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Min Order Value</label>
                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">₹</span>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={formData.minPurchaseAmount}
                            onChange={(e) => setFormData({...formData, minPurchaseAmount: Number(e.target.value)})}
                            className="w-full pl-6 p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-bold text-sm"
                          />
                       </div>
                    </div>
                    {/* Max Discount Cap */}
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Max Discount Cap</label>
                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">₹</span>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={formData.maxDiscountLimit}
                            onChange={(e) => setFormData({...formData, maxDiscountLimit: Number(e.target.value)})}
                            className="w-full pl-6 p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-bold text-sm"
                          />
                       </div>
                    </div>
                 </div>

                {/* Scope Selection */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Applicable Services</label>
                      <span className="text-[9px] text-gray-400 font-bold italic flex items-center gap-1">
                         <Info size={10} /> select none for all services
                      </span>
                   </div>
                   <div className="flex flex-wrap gap-1.5">
                      {availableServices.map((service) => (
                         <button 
                           key={service._id} 
                           type="button"
                           onClick={() => toggleService(service._id)}
                           className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
                             formData.serviceIds.includes(service._id) 
                             ? 'bg-[#1C2C4E] border-[#1C2C4E] text-white shadow-lg shadow-[#1C2C4E]/20' 
                             : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-[#1C2C4E]/30'
                           }`}
                         >
                            {service.name}
                         </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-3">
                {/* 🚀 SAVINGS PREVIEW */}
                <div className="p-2.5 bg-slate-50 dark:bg-gray-950/40 rounded-xl border border-slate-100 dark:border-gray-800 flex items-center justify-between shadow-inner">
                   <span className="text-[9px] font-black text-[#1C2C4E] dark:text-gray-400 uppercase tracking-widest">Customer Savings:</span>
                   <span className="text-xs font-black text-[#1C2C4E] dark:text-white">
                      {formData.discountType === 'percentage'
                        ? `${formData.value}% OFF`
                        : `₹${formData.value} FLAT`}
                   </span>
                </div>

                <div className="p-2.5 bg-green-50 dark:bg-green-950/10 rounded-xl border border-green-100 dark:border-green-900/10 flex items-start gap-2.5">
                   <Tag className="text-green-500 mt-0.5" size={14} />
                   <p className="text-[9px] font-bold text-green-600/70 leading-relaxed uppercase">
                      This offer will be automatically applied to eligible services during checkout. Expired offers are automatically disabled.
                   </p>
                </div>
             </div>
          </form>
       </main>
    </div>
  );
};

export default OfferForm;
